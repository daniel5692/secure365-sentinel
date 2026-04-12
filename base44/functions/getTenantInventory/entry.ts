import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function getAccessToken(tenantId) {
  const clientId = Deno.env.get('AZURE_CLIENT_ID');
  const clientSecret = Deno.env.get('AZURE_CLIENT_SECRET');
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_description || 'Failed to get token');
  return data.access_token;
}

async function graphGet(token, path) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}`, ConsistencyLevel: 'eventual' },
  });
  if (!res.ok) return null;
  return res.json();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { customer_tenant_id } = await req.json();
  if (!customer_tenant_id) return Response.json({ error: 'customer_tenant_id required' }, { status: 400 });

  const token = await getAccessToken(customer_tenant_id);

  // Parallel fetch all data
  const [
    allUsers,
    guestUsers,
    rooms,
    sharedMailboxes,
    enterpriseApps,
    applications,
    serviceAccounts,
  ] = await Promise.all([
    graphGet(token, '/users?$count=true&$top=1&$select=id'),
    graphGet(token, "/users?$filter=userType eq 'Guest'&$count=true&$top=1&$select=id"),
    graphGet(token, '/places/microsoft.graph.room?$count=true&$top=999&$select=id,displayName,emailAddress'),
    graphGet(token, "/users?$filter=startswith(userPrincipalName,'%23') or (assignedLicenses/$count eq 0 and mail ne null and userType eq 'Member')&$count=true&$top=999&$select=id,displayName,userPrincipalName,mail,accountEnabled,assignedLicenses"),
    graphGet(token, "/servicePrincipals?$filter=tags/any(t:t eq 'WindowsAzureActiveDirectoryIntegratedApp')&$top=999&$select=id,displayName,appId,accountEnabled,createdDateTime,passwordCredentials,keyCredentials,oauth2PermissionScopes,appRoles"),
    graphGet(token, '/applications?$top=999&$select=id,displayName,appId,createdDateTime,passwordCredentials,keyCredentials'),
    graphGet(token, "/users?$filter=userType eq 'Member' and accountEnabled eq true and (startswith(displayName,'svc') or startswith(displayName,'service') or startswith(displayName,'bot') or startswith(displayName,'app') or startswith(displayName,'adm'))&$count=true&$top=999&$select=id,displayName,userPrincipalName,accountEnabled,assignedLicenses&$search=\"displayName:svc\""),
  ]);

  // Active mailboxes: licensed members
  const licensedUsers = await graphGet(token, "/users?$filter=assignedLicenses/$count ne 0 and userType eq 'Member' and accountEnabled eq true&$count=true&$top=1&$select=id");

  // Service principals with expired/active credentials
  const now = new Date();
  const appCredentials = (applications?.value || []).map(app => {
    const allCreds = [
      ...(app.passwordCredentials || []).map(c => ({ ...c, type: 'secret' })),
      ...(app.keyCredentials || []).map(c => ({ ...c, type: 'certificate' })),
    ];
    const status = allCreds.length === 0 ? 'no_credentials'
      : allCreds.some(c => new Date(c.endDateTime) > now) ? 'active'
      : 'expired';
    const soonExpiring = allCreds.filter(c => {
      const expiry = new Date(c.endDateTime);
      const daysLeft = (expiry - now) / (1000 * 60 * 60 * 24);
      return daysLeft > 0 && daysLeft <= 30;
    });
    const expired = allCreds.filter(c => new Date(c.endDateTime) <= now);
    return {
      id: app.id,
      displayName: app.displayName,
      appId: app.appId,
      createdDateTime: app.createdDateTime,
      status,
      totalCredentials: allCreds.length,
      expired: expired.length,
      soonExpiring: soonExpiring.length,
      credentials: allCreds.map(c => ({
        type: c.type,
        displayName: c.displayName || c.keyId,
        endDateTime: c.endDateTime,
        isExpired: new Date(c.endDateTime) <= now,
        daysLeft: Math.round((new Date(c.endDateTime) - now) / (1000 * 60 * 60 * 24)),
      })),
    };
  });

  return Response.json({
    stats: {
      totalUsers: allUsers?.['@odata.count'] ?? 0,
      guestUsers: guestUsers?.['@odata.count'] ?? 0,
      activeMailboxes: licensedUsers?.['@odata.count'] ?? 0,
      sharedMailboxes: (sharedMailboxes?.value || []).filter(u => u.assignedLicenses?.length === 0).length,
      meetingRooms: rooms?.['@odata.count'] ?? (rooms?.value?.length ?? 0),
      enterpriseApps: enterpriseApps?.value?.length ?? 0,
    },
    rooms: rooms?.value || [],
    enterpriseApps: enterpriseApps?.value || [],
    appCredentials,
    sharedMailboxes: (sharedMailboxes?.value || []).filter(u => (u.assignedLicenses || []).length === 0),
  });
});