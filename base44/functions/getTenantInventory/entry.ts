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
    console.error(`Graph error ${res.status} for ${path}: ${err.substring(0, 300)}`);
    return null;
  }
  return res.json();
}

async function graphGetAll(token, path, beta = false) {
  let results = [];
  let url = `${beta ? 'https://graph.microsoft.com/beta' : 'https://graph.microsoft.com/v1.0'}${path}`;
  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, ConsistencyLevel: 'eventual' },
    });
    if (!res.ok) { console.error(`graphGetAll error ${res.status} for ${url}`); break; }
    const data = await res.json();
    results = results.concat(data.value || []);
    url = data['@odata.nextLink'] || null;
  }
  return results;
}

// Permission threat classification
function classifyPermission(permName) {
  const high = [
    'RoleManagement.ReadWrite.Directory', 'Directory.ReadWrite.All', 'User.ReadWrite.All',
    'Mail.ReadWrite', 'Mail.Send', 'Files.ReadWrite.All', 'Sites.FullControl.All',
    'Application.ReadWrite.All', 'AppRoleAssignment.ReadWrite.All', 'full_access_as_app',
    'Exchange.ManageAsApp', 'MailboxSettings.ReadWrite', 'Calendars.ReadWrite',
    'GroupMember.ReadWrite.All', 'Group.ReadWrite.All', 'Organization.ReadWrite.All',
    'Policy.ReadWrite.All', 'SecurityEvents.ReadWrite.All', 'ThreatIndicators.ReadWrite.OwnedBy',
    'DeviceManagementConfiguration.ReadWrite.All', 'DeviceManagementApps.ReadWrite.All',
  ];
  const medium = [
    'Directory.Read.All', 'User.Read.All', 'Group.Read.All', 'Mail.Read', 'Mail.ReadBasic',
    'Files.Read.All', 'Sites.Read.All', 'AuditLog.Read.All', 'Reports.Read.All',
    'Calendars.Read', 'Contacts.Read', 'MailboxSettings.Read', 'People.Read.All',
    'SecurityEvents.Read.All', 'IdentityRiskyUser.Read.All', 'DeviceManagementConfiguration.Read.All',
    'ServiceHealth.Read.All', 'TeamMember.Read.All', 'ChannelMessage.Read.All',
  ];
  const perm = permName?.split('.')?.slice(0, -1)?.join('.') || permName;
  if (high.some(h => permName?.includes(h.split('.')[0]) && permName?.toLowerCase().includes('write'))) return 'high';
  if (high.includes(permName)) return 'high';
  if (medium.includes(permName)) return 'medium';
  if (permName?.toLowerCase().includes('write') || permName?.toLowerCase().includes('readwrite')) return 'high';
  if (permName?.toLowerCase().includes('read.all') || permName?.toLowerCase().includes('read')) return 'medium';
  return 'low';
}

// Common license SKU ID to display name mapping
const LICENSE_NAMES = {
  'c7df2760-2c81-4ef7-b578-5b5392b571df': 'Microsoft 365 E5',
  '06ebc4ee-1bb5-47dd-8120-11324bc54e06': 'Microsoft 365 E5',
  'efccb6f7-5641-4e0e-bd10-b4976e1bf68e': 'Microsoft 365 E3',
  '05e9a617-0261-4cee-bb44-138d3ef5d965': 'Microsoft 365 E3',
  '6fd2c87f-b296-42f0-b197-1e91e994b900': 'Microsoft 365 E3',
  'b05e124f-c7cc-45a0-a6aa-8cf78c946968': 'Enterprise Mobility + Security E5',
  '26d45bd9-adf1-46cd-a9e1-51e9a5524128': 'Microsoft 365 F3',
  '66b55226-6b4f-492c-910c-a3b7a3c9d993': 'Microsoft 365 F3',
  '3b555118-da6a-4418-894f-7df1e2096870': 'Microsoft 365 Business Basic',
  'dab7782a-93b1-4074-8bb1-0e61318bea0b': 'Microsoft 365 Business Basic',
  'f245ecc8-75af-4f8e-b61f-27d8114de5f3': 'Microsoft 365 Business Standard',
  'ac5cef5d-921b-4f97-9ef3-c99076e5470f': 'Microsoft 365 Business Premium',
  'cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46': 'Microsoft 365 Business Premium',
  '18181a46-0d4e-45cd-891e-60aabd171b4e': 'Office 365 E1',
  '6fd2c87f-b296-42f0-b197-1e91e994b900': 'Office 365 E3',
  'c7df2760-2c81-4ef7-b578-5b5392b571df': 'Office 365 E5',
  'a403ebcc-fae0-4ca2-8c8c-7a907fd6c235': 'Power BI Pro',
  'f30db892-07e9-47e9-837c-80727f46fd3d': 'Flow Free',
  'e43b5b99-8dfb-405f-9987-dc307f34bcbd': 'Microsoft Teams Exploratory',
  '710779e8-3d4a-4c88-adb9-386c958d1fdf': 'Microsoft Teams Phone Standard',
};

function getLicenseName(skuId) {
  return LICENSE_NAMES[skuId?.toLowerCase()] || skuId?.substring(0, 8) + '...';
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { customer_tenant_id } = await req.json();
  if (!customer_tenant_id) return Response.json({ error: 'customer_tenant_id required' }, { status: 400 });

  const token = await getAccessToken(customer_tenant_id);

  // Fetch everything in parallel
  const [
    allUsers,
    placesRooms,
    placesWorkspaces,
    enterpriseApps,
    applications,
    orgContacts,
    deletedUsers,
  ] = await Promise.all([
    graphGetAll(token, '/users?$select=id,displayName,userPrincipalName,mail,accountEnabled,userType,assignedLicenses,createdDateTime&$top=999', true),
    graphGetAll(token, '/places/microsoft.graph.room?$select=id,displayName,emailAddress,building,floorNumber,capacity&$top=999', false),
    graphGetAll(token, '/places/microsoft.graph.workspace?$select=id,displayName,emailAddress,building,floorNumber,capacity&$top=999', false),
    graphGetAll(token, "/servicePrincipals?$filter=tags/any(t:t eq 'WindowsAzureActiveDirectoryIntegratedApp')&$top=999&$select=id,displayName,appId,accountEnabled,createdDateTime,passwordCredentials,keyCredentials,appRoles,oauth2PermissionScopes", false),
    graphGetAll(token, '/applications?$top=999&$select=id,displayName,appId,createdDateTime,passwordCredentials,keyCredentials', false),
    // orgContacts = external mail contacts in Exchange
    graphGetAll(token, '/contacts?$select=id,displayName,emailAddresses,companyName,jobTitle&$top=999', false),
    graphGetAll(token, '/directory/deletedItems/microsoft.graph.user?$top=999&$select=id,displayName,userPrincipalName,mail,deletedDateTime', false),
  ]);

  // Also fetch org contacts (different from personal contacts)
  const orgContactsAlt = await graphGetAll(token, '/orgContacts?$select=id,displayName,mail,companyName,jobTitle,proxyAddresses&$top=999', false);

  // Combine rooms + workspaces
  const allRooms = [...placesRooms, ...placesWorkspaces];
  const roomEmails = new Set(allRooms.map(r => r.emailAddress?.toLowerCase()));

  // Get mailboxSettings for unlicensed members to identify shared/room
  const unlicensed = allUsers.filter(u =>
    u.userType === 'Member' &&
    Array.isArray(u.assignedLicenses) && u.assignedLicenses.length === 0 &&
    u.mail
  );

  const mailboxPurposeResults = await Promise.all(
    unlicensed.map(async u => {
      const ms = await graphGet(token, `/users/${u.id}/mailboxSettings`, true);
      return { id: u.id, userPurpose: ms?.userPurpose };
    })
  );
  const purposeMap = {};
  mailboxPurposeResults.forEach(r => { purposeMap[r.id] = r.userPurpose; });

  // Categorize users
  const guestUsers = allUsers.filter(u => u.userType === 'Guest');
  const activeMembers = allUsers.filter(u =>
    u.userType === 'Member' && u.accountEnabled &&
    Array.isArray(u.assignedLicenses) && u.assignedLicenses.length > 0
  );
  const sharedMailboxes = unlicensed.filter(u => {
    const p = purposeMap[u.id];
    return p === 'shared' || p === 'sharedMailbox';
  });

  // Rooms: prefer Places API, fallback to mailboxSettings room/equipment
  let rooms = allRooms;
  if (rooms.length === 0) {
    rooms = unlicensed
      .filter(u => { const p = purposeMap[u.id]; return p === 'room' || p === 'equipment'; })
      .map(u => ({ id: u.id, displayName: u.displayName, emailAddress: u.mail }));
  }

  // Enrich users with license names
  const enrichUsersWithLicenses = (users) => users.map(u => ({
    ...u,
    licenseNames: (u.assignedLicenses || []).map(l => getLicenseName(l.skuId)),
  }));

  // Fetch appRoleAssignments (app permissions) for each enterprise app service principal
  const appPermissions = await Promise.all(
    enterpriseApps.slice(0, 50).map(async sp => {
      const assignments = await graphGetAll(token, `/servicePrincipals/${sp.id}/appRoleAssignments?$top=999`, false);
      return { spId: sp.id, assignments: assignments || [] };
    })
  );
  const appPermMap = {};
  appPermissions.forEach(({ spId, assignments }) => { appPermMap[spId] = assignments; });

  // Get resource service principals to resolve permission names
  const msGraphSp = await graphGet(token, "/servicePrincipals?$filter=appId eq '00000003-0000-0000-c000-000000000000'&$select=id,appRoles", false);
  const graphAppRoleMap = {};
  (msGraphSp?.value?.[0]?.appRoles || []).forEach(r => { graphAppRoleMap[r.id] = r.value; });

  // Build app credentials + permissions
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
      : activeCreds.length > 0 ? (soonExpiring.length > 0 ? 'expiring_soon' : 'active') : 'expired';

    // Find matching SP for this app to get permissions
    const matchingSp = enterpriseApps.find(sp => sp.appId === app.appId);
    const roleAssignments = matchingSp ? (appPermMap[matchingSp.id] || []) : [];
    const permissions = roleAssignments.map(ra => {
      const permName = graphAppRoleMap[ra.appRoleId] || ra.appRoleId;
      return {
        name: permName,
        resourceDisplayName: ra.resourceDisplayName || 'Microsoft Graph',
        threat: classifyPermission(permName),
      };
    });

    const maxThreat = permissions.some(p => p.threat === 'high') ? 'high'
      : permissions.some(p => p.threat === 'medium') ? 'medium'
      : permissions.length > 0 ? 'low' : 'none';

    return {
      id: app.id,
      displayName: app.displayName,
      appId: app.appId,
      createdDateTime: app.createdDateTime,
      status,
      expiredCount: expiredCreds.length,
      soonExpiringCount: soonExpiring.length,
      credentials: allCreds.map(c => ({
        type: c.type,
        displayName: c.displayName || c.keyId,
        endDateTime: c.endDateTime,
        isExpired: new Date(c.endDateTime) <= now,
        daysLeft: Math.round((new Date(c.endDateTime) - now) / 86400000),
      })),
      permissions,
      maxThreat,
    };
  });

  // Combine contacts
  const allContacts = [
    ...orgContactsAlt.map(c => ({
      id: c.id,
      displayName: c.displayName,
      email: c.mail || c.proxyAddresses?.find(p => p.startsWith('SMTP:'))?.replace('SMTP:', ''),
      companyName: c.companyName,
      jobTitle: c.jobTitle,
      source: 'org',
    })),
    ...orgContacts.map(c => ({
      id: c.id,
      displayName: c.displayName,
      email: c.emailAddresses?.[0]?.address,
      companyName: c.companyName,
      jobTitle: c.jobTitle,
      source: 'exchange',
    })),
  ];
  // deduplicate by id
  const seenIds = new Set();
  const uniqueContacts = allContacts.filter(c => { if (seenIds.has(c.id)) return false; seenIds.add(c.id); return true; });

  return Response.json({
    stats: {
      totalUsers: allUsers.filter(u => u.userType === 'Member').length,
      guestUsers: guestUsers.length,
      activeMailboxes: activeMembers.length,
      sharedMailboxes: sharedMailboxes.length,
      meetingRooms: rooms.length,
      enterpriseApps: appCredentials.length,
      contacts: uniqueContacts.length,
      deletedUsers: deletedUsers.length,
    },
    allMembers: enrichUsersWithLicenses(allUsers.filter(u => u.userType === 'Member')),
    activeMembers: enrichUsersWithLicenses(activeMembers),
    guestUsers,
    sharedMailboxes,
    rooms,
    enterpriseApps,
    appCredentials,
    contacts: uniqueContacts,
    deletedUsers,
  });
});