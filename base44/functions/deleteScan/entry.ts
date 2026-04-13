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

  // Delete ScanJob and CheckResults in parallel batches
  let deleted = 0;
  let page = 0;
  while (true) {
    const results = await base44.asServiceRole.entities.CheckResult.filter({ scan_job_id }, '-created_date', 50);
    if (!results || results.length === 0) break;
    // Delete batch in parallel
    await Promise.all(results.map(r => deleteWithRetry(base44.asServiceRole.entities.CheckResult, r.id)));
    deleted += results.length;
    if (results.length < 50) break;
    page++;
    await sleep(300);
  }

  // Delete ScanJob after all results are gone
  await deleteWithRetry(base44.asServiceRole.entities.ScanJob, scan_job_id);

  return Response.json({ success: true, deleted_results: deleted });
});