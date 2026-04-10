import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Get an access token for a specific customer tenant using client credentials
async function getAccessToken(customerTenantId) {
  const clientId = Deno.env.get('AZURE_CLIENT_ID');
  const clientSecret = Deno.env.get('AZURE_CLIENT_SECRET');

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });

  const res = await fetch(`https://login.microsoftonline.com/${customerTenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to get token: ${data.error_description || data.error}`);
  }
  return data.access_token;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { customer_tenant_id } = await req.json();
  if (!customer_tenant_id) return Response.json({ error: 'customer_tenant_id required' }, { status: 400 });

  const token = await getAccessToken(customer_tenant_id);
  return Response.json({ access_token: token });
});