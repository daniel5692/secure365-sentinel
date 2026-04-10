import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { customer_tenant_id, redirect_uri, tenant_record_id } = await req.json();

  if (!customer_tenant_id) {
    return Response.json({ error: 'customer_tenant_id is required' }, { status: 400 });
  }

  const clientId = Deno.env.get('AZURE_CLIENT_ID');
  const baseRedirect = redirect_uri || `${req.headers.get('origin') || 'https://app.base44.com'}/tenants`;
  
  // State carries the tenant record ID so we can update it after consent
  const state = encodeURIComponent(JSON.stringify({ tenant_record_id, user_id: user.id }));

  const consentUrl = `https://login.microsoftonline.com/${customer_tenant_id}/adminconsent` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(baseRedirect)}` +
    `&state=${state}`;

  return Response.json({ consent_url: consentUrl });
});