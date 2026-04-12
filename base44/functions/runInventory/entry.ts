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

async function graphGetAll(token, path, beta = false) {
  let results = [];
  let url = `${beta ? 'https://graph.microsoft.com/beta' : 'https://graph.microsoft.com/v1.0'}${path}`;
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, ConsistencyLevel: 'eventual' } });
    if (!res.ok) { console.error(`graphGetAll ${res.status} ${url}`); break; }
    const data = await res.json();
    results = results.concat(data.value || []);
    url = data['@odata.nextLink'] || null;
  }
  return results;
}

async function graphGet(token, path, beta = false) {
  const base = beta ? 'https://graph.microsoft.com/beta' : 'https://graph.microsoft.com/v1.0';
  const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}`, ConsistencyLevel: 'eventual' } });
  if (!res.ok) return null;
  return res.json();
}

function classifyPermission(name) {
  if (!name) return 'low';
  const n = name.toLowerCase();
  if (n.includes('readwrite') || n.includes('write') || n.includes('fullcontrol') || n.includes('manage') ||
      ['rolemanagement.readwrite.directory','directory.readwrite.all','user.readwrite.all',
       'application.readwrite.all','appRoleAssignment.readwrite.all','exchange.manageasapp',
       'mail.send','full_access_as_app','policy.readwrite.all','organization.readwrite.all',
       'securityevents.readwrite.all','devicemanagementconfiguration.readwrite.all'].some(h => name.toLowerCase().includes(h.toLowerCase()))) {
    return 'high';
  }
  if (n.includes('read.all') || n.includes('.read') ||
      ['directory.read.all','user.read.all','group.read.all','mail.read','files.read.all',
       'sites.read.all','auditlog.read.all','reports.read.all','securityevents.read.all'].some(m => name.toLowerCase().includes(m.toLowerCase()))) {
    return 'medium';
  }
  return 'low';
}

const LICENSE_NAMES = {
  'c7df2760-2c81-4ef7-b578-5b5392b571df': 'M365 E5',
  '06ebc4ee-1bb5-47dd-8120-11324bc54e06': 'M365 E5',
  'efccb6f7-5641-4e0e-bd10-b4976e1bf68e': 'M365 E3',
  '05e9a617-0261-4cee-bb44-138d3ef5d965': 'M365 E3',
  '6fd2c87f-b296-42f0-b197-1e91e994b900': 'Office 365 E3',
  '3b555118-da6a-4418-894f-7df1e2096870': 'M365 Business Basic',
  'dab7782a-93b1-4074-8bb1-0e61318bea0b': 'M365 Business Basic',
  'f245ecc8-75af-4f8e-b61f-27d8114de5f3': 'M365 Business Standard',
  'cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46': 'M365 Business Premium',
  'ac5cef5d-921b-4f97-9ef3-c99076e5470f': 'M365 Business Premium',
  '18181a46-0d4e-45cd-891e-60aabd171b4e': 'Office 365 E1',
  'a403ebcc-fae0-4ca2-8c8c-7a907fd6c235': 'Power BI Pro',
  '710779e8-3d4a-4c88-adb9-386c958d1fdf': 'Teams Phone',
  'e43b5b99-8dfb-405f-9987-dc307f34bcbd': 'Teams Exploratory',
};

function getLicenseName(skuId) {
  return LICENSE_NAMES[skuId?.toLowerCase()] || skuId?.substring(0, 8) + '…';
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { customer_tenant_id, tenant_name, snapshot_id } = await req.json();
  if (!customer_tenant_id || !snapshot_id) return Response.json({ error: 'customer_tenant_id and snapshot_id required' }, { status: 400 });

  const token = await getAccessToken(customer_tenant_id);

  // Parallel fetch base data
  const [
    allUsers,
    placesRooms,
    placesWorkspaces,
    servicePrincipals,
    applications,
    orgContactsMain,
    orgContactsAlt,
    deletedUsers,
  ] = await Promise.all([
    graphGetAll(token, '/users?$select=id,displayName,userPrincipalName,mail,accountEnabled,userType,assignedLicenses,createdDateTime&$top=999', true),
    graphGetAll(token, '/places/microsoft.graph.room?$select=id,displayName,emailAddress,building,floorNumber,capacity&$top=999', false),
    graphGetAll(token, '/places/microsoft.graph.workspace?$select=id,displayName,emailAddress,building,floorNumber,capacity&$top=999', false),
    // All service principals including enterprise apps
    graphGetAll(token, '/servicePrincipals?$filter=servicePrincipalType ne \'Legacy\'&$select=id,displayName,appId,servicePrincipalType,accountEnabled,createdDateTime,passwordCredentials,keyCredentials,tags&$top=999', false),
    // App registrations
    graphGetAll(token, '/applications?$select=id,displayName,appId,createdDateTime,passwordCredentials,keyCredentials,requiredResourceAccess&$top=999', false),
    graphGetAll(token, '/contacts?$select=id,displayName,emailAddresses,companyName,jobTitle&$top=999', false),
    graphGetAll(token, '/orgContacts?$select=id,displayName,mail,companyName,jobTitle,proxyAddresses&$top=999', false),
    graphGetAll(token, '/directory/deletedItems/microsoft.graph.user?$top=999&$select=id,displayName,userPrincipalName,mail,deletedDateTime', false),
  ]);

  // Get Microsoft Graph service principal to resolve permission names
  const msGraphSpData = await graphGet(token, "/servicePrincipals?$filter=appId eq '00000003-0000-0000-c000-000000000000'&$select=id,appRoles,oauth2PermissionScopes", false);
  const msGraphSp = msGraphSpData?.value?.[0];
  const graphAppRoleMap = {};
  const graphScopeMap = {};
  (msGraphSp?.appRoles || []).forEach(r => { graphAppRoleMap[r.id] = r.value; });
  (msGraphSp?.oauth2PermissionScopes || []).forEach(s => { graphScopeMap[s.id] = s.value; });

  // Get all resource SPs to resolve requiredResourceAccess
  const resourceSpIds = new Set();
  applications.forEach(app => {
    (app.requiredResourceAccess || []).forEach(rra => resourceSpIds.add(rra.resourceAppId));
  });
  const resourceSpMap = {}; // appId -> { appRoles, oauth2Perms }
  // Always include MS Graph
  if (msGraphSp) {
    resourceSpMap['00000003-0000-0000-c000-000000000000'] = {
      appRoles: graphAppRoleMap,
      scopes: graphScopeMap,
      name: 'Microsoft Graph',
    };
  }
  // Fetch other resource SPs in parallel (skip MS Graph)
  const otherAppIds = [...resourceSpIds].filter(id => id !== '00000003-0000-0000-c000-000000000000');
  await Promise.all(otherAppIds.slice(0, 20).map(async appId => {
    const spData = await graphGet(token, `/servicePrincipals?$filter=appId eq '${appId}'&$select=id,displayName,appRoles,oauth2PermissionScopes`, false);
    const sp = spData?.value?.[0];
    if (sp) {
      const arMap = {};
      const scMap = {};
      (sp.appRoles || []).forEach(r => { arMap[r.id] = r.value; });
      (sp.oauth2PermissionScopes || []).forEach(s => { scMap[s.id] = s.value; });
      resourceSpMap[appId] = { appRoles: arMap, scopes: scMap, name: sp.displayName };
    }
  }));

  // For enterprise apps: get appRoleAssignments + oauth2PermissionGrants
  const enterpriseAppSps = servicePrincipals.filter(sp =>
    sp.tags?.includes('WindowsAzureActiveDirectoryIntegratedApp') ||
    sp.servicePrincipalType === 'Application'
  ).slice(0, 80); // limit to avoid timeout

  const [appRoleAssignmentsAll, delegatedGrantsAll] = await Promise.all([
    Promise.all(enterpriseAppSps.map(async sp => {
      const data = await graphGetAll(token, `/servicePrincipals/${sp.id}/appRoleAssignments?$top=999`, false);
      return { spId: sp.id, appId: sp.appId, assignments: data || [] };
    })),
    Promise.all(enterpriseAppSps.map(async sp => {
      const data = await graphGetAll(token, `/servicePrincipals/${sp.id}/oauth2PermissionGrants?$top=999`, false);
      return { spId: sp.id, appId: sp.appId, grants: data || [] };
    })),
  ]);

  const appRoleMap = {}; // appId -> [permissions]
  appRoleAssignmentsAll.forEach(({ appId, assignments }) => {
    const perms = assignments.map(ra => {
      const permName = graphAppRoleMap[ra.appRoleId] || ra.appRoleId;
      return { name: permName, type: 'Application', resource: 'Microsoft Graph', threat: classifyPermission(permName) };
    });
    appRoleMap[appId] = (appRoleMap[appId] || []).concat(perms);
  });
  delegatedGrantsAll.forEach(({ appId, grants }) => {
    const perms = grants.flatMap(g =>
      (g.scope || '').split(' ').filter(Boolean).map(scope => ({
        name: scope,
        type: 'Delegated',
        resource: 'Microsoft Graph',
        threat: classifyPermission(scope),
      }))
    );
    appRoleMap[appId] = (appRoleMap[appId] || []).concat(perms);
  });

  // Mailbox settings for unlicensed members
  const unlicensed = allUsers.filter(u =>
    u.userType === 'Member' &&
    Array.isArray(u.assignedLicenses) && u.assignedLicenses.length === 0 && u.mail
  );
  const purposeResults = await Promise.all(
    unlicensed.map(async u => {
      const ms = await graphGet(token, `/users/${u.id}/mailboxSettings`, true);
      return { id: u.id, userPurpose: ms?.userPurpose };
    })
  );
  const purposeMap = {};
  purposeResults.forEach(r => { purposeMap[r.id] = r.userPurpose; });

  // Categorize
  const guestUsers = allUsers.filter(u => u.userType === 'Guest');
  const activeMembers = allUsers.filter(u =>
    u.userType === 'Member' && u.accountEnabled &&
    Array.isArray(u.assignedLicenses) && u.assignedLicenses.length > 0
  );
  const sharedMailboxes = unlicensed.filter(u => {
    const p = purposeMap[u.id];
    return p === 'shared' || p === 'sharedMailbox';
  });
  let rooms = [...placesRooms, ...placesWorkspaces];
  if (rooms.length === 0) {
    rooms = unlicensed
      .filter(u => { const p = purposeMap[u.id]; return p === 'room' || p === 'equipment'; })
      .map(u => ({ id: u.id, displayName: u.displayName, emailAddress: u.mail }));
  }

  const enrichLicenses = (users) => users.map(u => ({
    ...u,
    licenseNames: (u.assignedLicenses || []).map(l => getLicenseName(l.skuId)),
  }));

  // Build app credentials with permissions
  const now = new Date();
  const appCredentials = applications.map(app => {
    const allCreds = [
      ...(app.passwordCredentials || []).map(c => ({ ...c, type: 'secret' })),
      ...(app.keyCredentials || []).map(c => ({ ...c, type: 'certificate' })),
    ];
    const activeCreds = allCreds.filter(c => new Date(c.endDateTime) > now);
    const expiredCreds = allCreds.filter(c => new Date(c.endDateTime) <= now);
    const soonExpiring = activeCreds.filter(c => (new Date(c.endDateTime) - now) / 86400000 <= 30);
    const credStatus = allCreds.length === 0 ? 'no_credentials'
      : activeCreds.length > 0 ? (soonExpiring.length > 0 ? 'expiring_soon' : 'active') : 'expired';

    // Permissions from app registration (requiredResourceAccess = declared)
    const declaredPerms = [];
    (app.requiredResourceAccess || []).forEach(rra => {
      const resourceInfo = resourceSpMap[rra.resourceAppId];
      (rra.resourceAccess || []).forEach(ra => {
        let permName = null;
        if (ra.type === 'Role') permName = resourceInfo?.appRoles?.[ra.id];
        else if (ra.type === 'Scope') permName = resourceInfo?.scopes?.[ra.id];
        if (!permName) permName = ra.id.substring(0, 8) + '…';
        declaredPerms.push({
          name: permName,
          type: ra.type === 'Role' ? 'Application' : 'Delegated',
          resource: resourceInfo?.name || rra.resourceAppId,
          threat: classifyPermission(permName),
          source: 'declared',
        });
      });
    });

    // Granted permissions (from enterprise app assignments)
    const grantedPerms = (appRoleMap[app.appId] || []).map(p => ({ ...p, source: 'granted' }));

    // Merge: prefer granted if available, otherwise show declared
    const permissions = grantedPerms.length > 0 ? grantedPerms : declaredPerms;

    const maxThreat = permissions.some(p => p.threat === 'high') ? 'high'
      : permissions.some(p => p.threat === 'medium') ? 'medium'
      : permissions.length > 0 ? 'low' : 'none';

    return {
      id: app.id,
      displayName: app.displayName,
      appId: app.appId,
      createdDateTime: app.createdDateTime,
      credStatus,
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
      permissionsSource: grantedPerms.length > 0 ? 'granted' : 'declared',
    };
  }).sort((a, b) => {
    const t = { high: 0, medium: 1, low: 2, none: 3 };
    return (t[a.maxThreat] ?? 4) - (t[b.maxThreat] ?? 4);
  });

  // Contacts
  const seenIds = new Set();
  const contacts = [
    ...orgContactsAlt.map(c => ({
      id: c.id, displayName: c.displayName,
      email: c.mail || c.proxyAddresses?.find(p => p.startsWith('SMTP:'))?.replace('SMTP:', ''),
      companyName: c.companyName, jobTitle: c.jobTitle, source: 'org',
    })),
    ...orgContactsMain.map(c => ({
      id: c.id, displayName: c.displayName,
      email: c.emailAddresses?.[0]?.address,
      companyName: c.companyName, jobTitle: c.jobTitle, source: 'exchange',
    })),
  ].filter(c => { if (seenIds.has(c.id)) return false; seenIds.add(c.id); return true; });

  const stats = {
    totalUsers: allUsers.filter(u => u.userType === 'Member').length,
    guestUsers: guestUsers.length,
    activeMailboxes: activeMembers.length,
    sharedMailboxes: sharedMailboxes.length,
    meetingRooms: rooms.length,
    enterpriseApps: appCredentials.length,
    contacts: contacts.length,
    deletedUsers: deletedUsers.length,
  };

  const inventoryData = {
    stats,
    allMembers: enrichLicenses(allUsers.filter(u => u.userType === 'Member')),
    activeMembers: enrichLicenses(activeMembers),
    guestUsers,
    sharedMailboxes,
    rooms,
    appCredentials,
    contacts,
    deletedUsers,
  };

  // Save to entity
  await base44.asServiceRole.entities.InventorySnapshot.update(snapshot_id, {
    status: 'completed',
    stats,
    data: inventoryData,
  });

  return Response.json({ ok: true, snapshot_id });
});