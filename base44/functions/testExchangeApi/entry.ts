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

  // Step 3: Call Exchange REST API
  try {
    const res = await fetch(`https://outlook.office365.com/adminapi/beta/${orgId}/Organization`, {
      headers: { Authorization: `Bearer ${exToken}`, 'Content-Type': 'application/json' },
    });
    const statusCode = res.status;
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    return Response.json({
      success: res.ok,
      status: statusCode,
      orgId,
      tokenAcquired: !!exToken,
      // Key fields we care about
      AuditDisabled: data?.value?.[0]?.AuditDisabled ?? data?.AuditDisabled,
      OAuth2ClientProfileEnabled: data?.value?.[0]?.OAuth2ClientProfileEnabled ?? data?.OAuth2ClientProfileEnabled,
      SmtpClientAuthenticationDisabled: data?.value?.[0]?.SmtpClientAuthenticationDisabled ?? data?.SmtpClientAuthenticationDisabled,
      rawResponse: typeof data === 'object' ? JSON.stringify(data).substring(0, 2000) : data,
    });
  } catch (e) {
    return Response.json({ step: 'exchange_api', error: e.message }, { status: 500 });
  }
});