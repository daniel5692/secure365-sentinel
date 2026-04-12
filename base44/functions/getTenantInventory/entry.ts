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

  // Fetch all in parallel
  const [
    allUsersCount,
    guestUsers,
    activeMembers,
    disabledUsers,     // shared mailboxes + resource mailboxes are disabled accounts with mail
    rooms,             // /places API for rooms
    enterpriseApps,
    applications,
    orgContacts,
    deletedUsers,
  ] = await Promise.all([
    graphGet(token, "/users?$count=true&$top=1&$select=id"),
    graphGet(token, "/users?$filter=userType eq 'Guest'&$count=true&$top=999&$select=id,displayName,userPrincipalName,mail,accountEnabled"),
    graphGet(token, "/users?$filter=userType eq 'Member' and accountEnabled eq true and assignedLicenses/$count ne 0&$count=true&$top=999&$select=id,displayName,userPrincipalName,mail,accountEnabled,assignedLicenses"),
    graphGet(token, "/users?$filter=userType eq 'Member' and accountEnabled eq false and mail ne null&$count=true&$top=999&$select=id,displayName,userPrincipalName,mail,accountEnabled,assignedLicenses"),
    graphGet(token, "/places/microsoft.graph.room?$top=999&$select=id,displayName,emailAddress,building,floorNumber,capacity"),
    graphGet(token, "/servicePrincipals?$filter=tags/any(t:t eq 'WindowsAzureActiveDirectoryIntegratedApp')&$top=999&$select=id,displayName,appId,accountEnabled,createdDateTime,passwordCredentials,keyCredentials"),
    graphGet(token, '/applications?$top=999&$select=id,displayName,appId,createdDateTime,passwordCredentials,keyCredentials'),
    graphGet(token, "/contacts?$top=999&$select=id,displayName,emailAddresses,companyName,jobTitle"),
    graphGet(token, "/directory/deletedItems/microsoft.graph.user?$count=true&$top=999&$select=id,displayName,userPrincipalName,mail,deletedDateTime"),
  ]);

  // Disabled users: split rooms vs shared mailboxes
  // Rooms have emailAddress matching their UPN and are resource accounts
  const roomEmails = new Set((rooms?.value || []).map(r => r.emailAddress?.toLowerCase()));
  const disabledList = disabledUsers?.value || [];
  
  const sharedMailboxes = disabledList.filter(u => !roomEmails.has(u.mail?.toLowerCase()));
  const resourceRooms = rooms?.value || [];

  // App credentials analysis
  const now = new Date();
  const appCredentials = (applications?.value || []).map(app => {
    const allCreds = [
      ...(app.passwordCredentials || []).map(c => ({ ...c, type: 'secret' })),
      ...(app.keyCredentials || []).map(c => ({ ...c, type: 'certificate' })),
    ];
    const activeCredsList = allCreds.filter(c => new Date(c.endDateTime) > now);
    const expiredList = allCreds.filter(c => new Date(c.endDateTime) <= now);
    const soonExpiringList = activeCredsList.filter(c => {
      const daysLeft = (new Date(c.endDateTime) - now) / (1000 * 60 * 60 * 24);
      return daysLeft <= 30;
    });
    const status = allCreds.length === 0 ? 'no_credentials'
      : activeCredsList.length > 0 ? (soonExpiringList.length > 0 ? 'expiring_soon' : 'active')
      : 'expired';
    return {
      id: app.id,
      displayName: app.displayName,
      appId: app.appId,
      createdDateTime: app.createdDateTime,
      status,
      totalCredentials: allCreds.length,
      expiredCount: expiredList.length,
      soonExpiringCount: soonExpiringList.length,
      credentials: allCreds.map(c => ({
        type: c.type,
        displayName: c.displayName || c.customKeyIdentifier || c.keyId,
        endDateTime: c.endDateTime,
        startDateTime: c.startDateTime,
        isExpired: new Date(c.endDateTime) <= now,
        daysLeft: Math.round((new Date(c.endDateTime) - now) / (1000 * 60 * 60 * 24)),
      })),
    };
  });

  return Response.json({
    stats: {
      totalUsers: allUsersCount?.['@odata.count'] ?? 0,
      guestUsers: guestUsers?.value?.length ?? 0,
      activeMailboxes: activeMembers?.value?.length ?? 0,
      sharedMailboxes: sharedMailboxes.length,
      meetingRooms: resourceRooms.length,
      enterpriseApps: enterpriseApps?.value?.length ?? 0,
      contacts: orgContacts?.value?.length ?? 0,
      deletedUsers: deletedUsers?.value?.length ?? 0,
    },
    activeMembers: activeMembers?.value || [],
    guestUsers: guestUsers?.value || [],
    sharedMailboxes,
    rooms: resourceRooms,
    enterpriseApps: enterpriseApps?.value || [],
    appCredentials,
    contacts: orgContacts?.value || [],
    deletedUsers: deletedUsers?.value || [],
  });
});