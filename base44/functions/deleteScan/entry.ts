import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { scan_job_id } = await req.json();
  if (!scan_job_id) return Response.json({ error: 'scan_job_id required' }, { status: 400 });

  let deleted = 0;

  // Delete CheckResults in sequential small batches to avoid rate limiting
  while (true) {
    const results = await base44.asServiceRole.entities.CheckResult.filter({ scan_job_id }, '-created_date', 20);
    if (!results || results.length === 0) break;

    for (const r of results) {
      let ok = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await base44.asServiceRole.entities.CheckResult.delete(r.id);
          ok = true;
          break;
        } catch (e) {
          if (e?.status === 429) {
            await sleep(1500 * (attempt + 1));
          } else {
            break; // non-retryable error, skip
          }
        }
      }
      if (ok) deleted++;
      await sleep(100); // small gap between each delete
    }

    if (results.length < 20) break;
  }

  // Delete the ScanJob itself
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await base44.asServiceRole.entities.ScanJob.delete(scan_job_id);
      break;
    } catch (e) {
      if (e?.status === 429) {
        await sleep(2000 * (attempt + 1));
      } else {
        break;
      }
    }
  }

  return Response.json({ success: true, deleted_results: deleted });
});