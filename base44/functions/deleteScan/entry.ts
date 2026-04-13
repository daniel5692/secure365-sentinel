import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function deleteWithRetry(entity, id, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await entity.delete(id);
      return;
    } catch (e) {
      if (e?.status === 429 && i < retries - 1) {
        await sleep(2000 * (i + 1)); // exponential backoff: 2s, 4s
      } else if (i === retries - 1) {
        throw e;
      }
    }
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { scan_job_id } = await req.json();
  if (!scan_job_id) return Response.json({ error: 'scan_job_id required' }, { status: 400 });

  // Delete ScanJob first so UI updates immediately
  await deleteWithRetry(base44.asServiceRole.entities.ScanJob, scan_job_id);

  // Delete CheckResults in small batches with generous delays
  let deleted = 0;
  while (true) {
    const results = await base44.asServiceRole.entities.CheckResult.filter({ scan_job_id }, '-created_date', 25);
    if (!results || results.length === 0) break;
    for (const r of results) {
      await deleteWithRetry(base44.asServiceRole.entities.CheckResult, r.id);
      await sleep(500);
    }
    deleted += results.length;
    if (results.length < 25) break;
    await sleep(1000);
  }

  return Response.json({ success: true, deleted_results: deleted });
});