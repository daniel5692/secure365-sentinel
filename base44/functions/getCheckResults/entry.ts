import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { scan_job_ids } = await req.json();
  if (!scan_job_ids || !scan_job_ids.length) return Response.json({ results: [] });

  // Fetch all scan jobs to verify they belong to this user
  const ownedScans = await base44.entities.ScanJob.filter({ created_by: user.email });
  const ownedScanIds = new Set(ownedScans.map(s => s.id));

  // Only allow fetching results for scans owned by this user
  const allowedIds = scan_job_ids.filter(id => ownedScanIds.has(id));
  if (!allowedIds.length) return Response.json({ results: [] });

  // Use service role to bypass RLS on CheckResult
  const chunks = await Promise.all(
    allowedIds.map(id => base44.asServiceRole.entities.CheckResult.filter({ scan_job_id: id }, '-created_date', 200))
  );

  return Response.json({ results: chunks.flat() });
});