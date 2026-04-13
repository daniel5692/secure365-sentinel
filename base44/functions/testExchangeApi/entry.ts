import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { tenant_id } = await req.json();
  if (!tenant_id) return Response.json({ error: 'tenant_id required' }, { status: 400 });

  // Step 1: Get Exchange token
  let exToken;
  try {
    const res = await fetch(`https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: Deno.env.get('AZURE_CLIENT_ID'),
        client_secret: Deno.env.get('AZURE_CLIENT_SECRET'),
        scope: 'https://outlook.office365.com/.default',
      }).toString(),
    });
    const data = await res.json();
    if (!res.ok) return Response.json({ step: 'token', error: data.error_description || data.error, data }, { status: 400 });
    exToken = data.access_token;
  } catch (e) {
    return Response.json({ step: 'token', error: e.message }, { status: 500 });
  }

  // Step 2: Get Graph token to get org ID
  let orgId;
  try {
    const res = await fetch(`https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: Deno.env.get('AZURE_CLIENT_ID'),
        client_secret: Deno.env.get('AZURE_CLIENT_SECRET'),
        scope: 'https://graph.microsoft.com/.default',
      }).toString(),
    });
    const data = await res.json();
    const graphToken = data.access_token;
    const orgRes = await fetch('https://graph.microsoft.com/v1.0/organization?$select=id', {
      headers: { Authorization: `Bearer ${graphToken}` },
    });
    const orgData = await orgRes.json();
    orgId = orgData.value?.[0]?.id;
  } catch (e) {
    return Response.json({ step: 'graph', error: e.message }, { status: 500 });
  }

  // Step 3: Try Graph API alternatives for Exchange config
  let graphToken2;
  try {
    const res = await fetch(`https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: Deno.env.get('AZURE_CLIENT_ID'),
        client_secret: Deno.env.get('AZURE_CLIENT_SECRET'),
        scope: 'https://graph.microsoft.com/.default',
      }).toString(),
    });
    const d = await res.json();
    graphToken2 = d.access_token;
  } catch(e) {}

  const graphPaths = [
    '/beta/admin/exchange',
    '/v1.0/admin/exchange',
    '/beta/organization?$select=id,securityComplianceNotificationMails',
    '/beta/reports/security/getMailboxSettings',
  ];

  const results = {};
  for (const path of graphPaths) {
    try {
      const res = await fetch(`https://graph.microsoft.com${path}`, {
        headers: { Authorization: `Bearer ${graphToken2}` },
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }
      results[path] = { status: res.status, data: JSON.stringify(data).substring(0, 600) };
    } catch (e) {
      results[path] = { error: e.message };
    }
  }

  return Response.json({ success: true, orgId, tokenAcquired: !!exToken, results });
});