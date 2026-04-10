import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { customer_tenant_id, redirect_uri } = await req.json();
  const clientId = Deno.env.get('AZURE_CLIENT_ID');

  if (!clientId) return Response.json({ error: 'AZURE_CLIENT_ID not configured' }, { status: 500 });

  // Use 'common' to let Microsoft ask which tenant to authorize
  const tenantPath = customer_tenant_id || 'common';
  const redirectUri = redirect_uri || 'https://app.base44.com/tenants';

  const consentUrl =
    `https://login.microsoftonline.com/${tenantPath}/adminconsent` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return Response.json({ consent_url: consentUrl });
});