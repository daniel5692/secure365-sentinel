import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { scan_job_ids } = await req.json();
  if (!scan_job_ids || !scan_job_ids.length) return Response.json({ results: [] });

  // Verify ownership by checking each scan belongs to the user (fetch only requested scans)
  const scanChecks = await Promise.all(
    scan_job_ids.map(id => base44.entities.ScanJob.filter({ id, created_by: user.email }, null, 1))
  );
  const allowedIds = scan_job_ids.filter((id, i) => scanChecks[i]?.length > 0);
  if (!allowedIds.length) return Response.json({ results: [] });

  // Fetch results — 200 per scan (one scan at a time now)
  const chunks = await Promise.all(
    allowedIds.map(id => base44.asServiceRole.entities.CheckResult.filter({ scan_job_id: id }, '-created_date', 200))
  );

  return Response.json({ results: chunks.flat() });
});