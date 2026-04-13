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

  // Step 3: Assign Exchange Administrator role to our service principal
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
  } catch(e) { return Response.json({ error: 'graph token failed', e: e.message }); }

  const CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
  const EXCHANGE_ADMIN_ROLE_TEMPLATE_ID = '29232cdf-9323-42fd-ade2-1d097af3e4de';

  // Step 3a: Find our service principal in the customer tenant
  const spRes = await fetch(`https://graph.microsoft.com/v1.0/servicePrincipals?$filter=appId eq '${CLIENT_ID}'&$select=id,displayName`, {
    headers: { Authorization: `Bearer ${graphToken2}` },
  });
  const spData = await spRes.json();
  const sp = spData.value?.[0];
  if (!sp) return Response.json({ error: 'Service principal not found in customer tenant', spData });

  // Step 3b: Check if Exchange Admin role exists (activate it if needed)
  let roleRes = await fetch(`https://graph.microsoft.com/v1.0/directoryRoles?$filter=roleTemplateId eq '${EXCHANGE_ADMIN_ROLE_TEMPLATE_ID}'`, {
    headers: { Authorization: `Bearer ${graphToken2}` },
  });
  let roleData = await roleRes.json();
  let role = roleData.value?.[0];

  if (!role) {
    // Activate the role first
    const activateRes = await fetch(`https://graph.microsoft.com/v1.0/directoryRoles`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${graphToken2}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleTemplateId: EXCHANGE_ADMIN_ROLE_TEMPLATE_ID }),
    });
    role = await activateRes.json();
  }

  if (!role?.id) return Response.json({ error: 'Could not get/activate Exchange Admin role', role });

  // Step 3c: Assign role to our SP
  const assignRes = await fetch(`https://graph.microsoft.com/v1.0/directoryRoles/${role.id}/members/$ref`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${graphToken2}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${sp.id}` }),
  });

  const assignStatus = assignRes.status;
  const assignText = await assignRes.text();

  // Step 3d: Now test Exchange API
  let exchangeTest = null;
  if (assignStatus === 204 || assignStatus === 400) { // 400 might mean already assigned
    const exRes = await fetch(`https://outlook.office365.com/adminapi/beta/${tenant_id}/Organization`, {
      headers: { Authorization: `Bearer ${exToken}`, 'Content-Type': 'application/json' },
    });
    const exText = await exRes.text();
    try { exchangeTest = { status: exRes.status, data: JSON.parse(exText) }; }
    catch { exchangeTest = { status: exRes.status, raw: exText.substring(0, 500) }; }
  }

  return Response.json({
    success: true,
    spId: sp.id,
    spName: sp.displayName,
    roleId: role.id,
    assignStatus,
    assignResponse: assignText.substring(0, 300),
    exchangeTest,
  });
});