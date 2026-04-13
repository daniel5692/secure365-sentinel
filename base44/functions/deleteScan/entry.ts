import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { scan_job_id } = await req.json();
  if (!scan_job_id) return Response.json({ error: 'scan_job_id required' }, { status: 400 });

  // Delete all CheckResults for this scan (loop to handle pagination)
  let deleted = 0;
  while (true) {
    const results = await base44.asServiceRole.entities.CheckResult.filter({ scan_job_id }, '-created_date', 100);
    if (!results || results.length === 0) break;
    await Promise.all(results.map(r => base44.asServiceRole.entities.CheckResult.delete(r.id)));
    deleted += results.length;
    if (results.length < 100) break;
  }

  // Delete the scan job itself
  await base44.asServiceRole.entities.ScanJob.delete(scan_job_id);

  return Response.json({ success: true, deleted_results: deleted });
});