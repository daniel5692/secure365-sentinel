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

async function graphGet(token, path, beta = false) {
  const base = beta ? 'https://graph.microsoft.com/beta' : 'https://graph.microsoft.com/v1.0';
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}`, ConsistencyLevel: 'eventual' },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error(`Graph error ${res.status} for ${path}: ${err}`);
    return null;
  }
  return res.json();
}

// Fetch all pages of a resource
async function graphGetAll(token, path, beta = false) {
  let results = [];
  let nextPath = path;
  while (nextPath) {
    const data = await graphGet(token, nextPath, beta);
    if (!data) break;
    results = results.concat(data.value || []);
    // nextLink contains full URL, extract path+query
    if (data['@odata.nextLink']) {
      const base = beta ? 'https://graph.microsoft.com/beta' : 'https://graph.microsoft.com/v1.0';
      nextPath = data['@odata.nextLink'].replace(base, '');
    } else {
      nextPath = null;
    }
  }
  return results;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { customer_tenant_id } = await req.json();
  if (!customer_tenant_id) return Response.json({ error: 'customer_tenant_id required' }, { status: 400 });

  const token = await getAccessToken(customer_tenant_id);

  // Fetch all users with mailboxSettings (beta) and places in parallel
  const [
    allUsersWithMailbox,
    placesRooms,
    enterpriseApps,
    applications,
    orgContacts,
    deletedUsers,
  ] = await Promise.all([
    // Beta endpoint gives us mailboxSettings.userPurpose to distinguish user/shared/room/equipment
    graphGetAll(token, '/users?$select=id,displayName,userPrincipalName,mail,accountEnabled,userType,assignedLicenses,createdDateTime&$top=999', true),
    // Places API for rooms
    graphGetAll(token, '/places/microsoft.graph.room?$select=id,displayName,emailAddress,building,floorNumber,capacity&$top=999', true),
    graphGetAll(token, "/servicePrincipals?$filter=tags/any(t:t eq 'WindowsAzureActiveDirectoryIntegratedApp')&$top=999&$select=id,displayName,appId,accountEnabled,createdDateTime,passwordCredentials,keyCredentials", false),
    graphGetAll(token, '/applications?$top=999&$select=id,displayName,appId,createdDateTime,passwordCredentials,keyCredentials', false),
    graphGetAll(token, '/contacts?$top=999&$select=id,displayName,emailAddresses,companyName,jobTitle', false),
    graphGetAll(token, '/directory/deletedItems/microsoft.graph.user?$top=999&$select=id,displayName,userPrincipalName,mail,deletedDateTime', false),
  ]);

  // Now fetch mailboxSettings per user to determine type
  // For efficiency, fetch unlicensed members' mailboxSettings only
  const unlicensedMembers = allUsersWithMailbox.filter(u =>
    u.userType === 'Member' &&
    Array.isArray(u.assignedLicenses) && u.assignedLicenses.length === 0 &&
    u.mail
  );

  // Fetch mailboxSettings for unlicensed members to detect shared vs room
  const mailboxSettingsResults = await Promise.all(
    unlicensedMembers.map(async u => {
      const ms = await graphGet(token, `/users/${u.id}/mailboxSettings`, true);
      return { id: u.id, userPurpose: ms?.userPurpose };
    })
  );
  const mailboxPurposeMap = {};
  mailboxSettingsResults.forEach(r => { mailboxPurposeMap[r.id] = r.userPurpose; });

  // Categorize
  const guestUsers = allUsersWithMailbox.filter(u => u.userType === 'Guest');
  const activeMembers = allUsersWithMailbox.filter(u =>
    u.userType === 'Member' &&
    u.accountEnabled &&
    Array.isArray(u.assignedLicenses) && u.assignedLicenses.length > 0
  );
  const sharedMailboxes = unlicensedMembers.filter(u => {
    const purpose = mailboxPurposeMap[u.id];
    return purpose === 'shared' || purpose === 'sharedMailbox';
  });
  // Rooms from places API (most reliable)
  const rooms = placesRooms;

  // Also check if places returned nothing - fallback to mailboxSettings room/equipment
  const resourceAccounts = rooms.length === 0
    ? unlicensedMembers.filter(u => {
        const purpose = mailboxPurposeMap[u.id];
        return purpose === 'room' || purpose === 'equipment';
      })
    : [];
  const allRooms = rooms.length > 0 ? rooms : resourceAccounts;

  // App credentials analysis
  const now = new Date();
  const appCredentials = applications.map(app => {
    const allCreds = [
      ...(app.passwordCredentials || []).map(c => ({ ...c, type: 'secret' })),
      ...(app.keyCredentials || []).map(c => ({ ...c, type: 'certificate' })),
    ];
    const activeCreds = allCreds.filter(c => new Date(c.endDateTime) > now);
    const expiredCreds = allCreds.filter(c => new Date(c.endDateTime) <= now);
    const soonExpiring = activeCreds.filter(c => (new Date(c.endDateTime) - now) / 86400000 <= 30);
    const status = allCreds.length === 0 ? 'no_credentials'
      : activeCreds.length > 0 ? (soonExpiring.length > 0 ? 'expiring_soon' : 'active')
      : 'expired';
    return {
      id: app.id,
      displayName: app.displayName,
      appId: app.appId,
      createdDateTime: app.createdDateTime,
      status,
      totalCredentials: allCreds.length,
      expiredCount: expiredCreds.length,
      soonExpiringCount: soonExpiring.length,
      credentials: allCreds.map(c => ({
        type: c.type,
        displayName: c.displayName || c.keyId,
        endDateTime: c.endDateTime,
        isExpired: new Date(c.endDateTime) <= now,
        daysLeft: Math.round((new Date(c.endDateTime) - now) / 86400000),
      })),
    };
  });

  return Response.json({
    stats: {
      totalUsers: allUsersWithMailbox.filter(u => u.userType === 'Member').length,
      guestUsers: guestUsers.length,
      activeMailboxes: activeMembers.length,
      sharedMailboxes: sharedMailboxes.length,
      meetingRooms: allRooms.length,
      enterpriseApps: enterpriseApps.length,
      contacts: orgContacts.length,
      deletedUsers: deletedUsers.length,
    },
    activeMembers,
    guestUsers,
    sharedMailboxes,
    rooms: allRooms,
    enterpriseApps,
    appCredentials,
    contacts: orgContacts,
    deletedUsers,
  });
});