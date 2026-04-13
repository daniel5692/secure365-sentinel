import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { scan_job_id } = await req.json();
  if (!scan_job_id) return Response.json({ error: 'scan_job_id required' }, { status: 400 });

  // Delete CheckResults sequentially in small batches to avoid rate limiting
  let deleted = 0;
  while (true) {
    const results = await base44.asServiceRole.entities.CheckResult.filter({ scan_job_id }, '-created_date', 50);
    if (!results || results.length === 0) break;
    for (const r of results) {
      await base44.asServiceRole.entities.CheckResult.delete(r.id);
      await sleep(50);
    }
    deleted += results.length;
    if (results.length < 50) break;
    await sleep(200);
  }

  await base44.asServiceRole.entities.ScanJob.delete(scan_job_id);

  return Response.json({ success: true, deleted_results: deleted });
});