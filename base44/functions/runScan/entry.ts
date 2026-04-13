import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function getAccessToken(tenantId) {
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
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
  if (!res.ok) throw new Error(data.error_description || data.error || 'Token error');
  return data.access_token;
}

async function graphGet(token, path, version = 'v1.0') {
  const res = await fetch(`https://graph.microsoft.com/${version}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Graph ${res.status}: ${err?.error?.message || path}`);
  }
  return res.json();
}

// DNS over HTTPS via Cloudflare - works from Deno
async function dnsQuery(name, type = 'TXT') {
  const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
    headers: { 'Accept': 'application/dns-json' },
  });
  if (!res.ok) return { Answer: [] };
  return res.json();
}

// Get cached Secure Score controls (fetched once per scan)
let _secureScoreCache = null;
let _exToken = null;
let _spoSettingsCache = null;
let _tenantDomain = null; // e.g. contoso.onmicrosoft.com

async function getExchangeToken(tenantId) {
  // Exchange.ManageAsAppV2 is the new permission required for the v2.0 Admin API
  // The scope is still https://outlook.office365.com/.default
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
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
  if (!res.ok) throw new Error(data.error_description || data.error || 'Exchange token error');
  console.log('Exchange token acquired, scope:', data.scope);
  return data.access_token;
}

// Maps old beta resource names to v2.0 endpoint + cmdlet names
const EXCHANGE_RESOURCE_MAP = {
  Organization:     { endpoint: 'OrganizationConfig', cmdlet: 'Get-OrganizationConfig' },
  RemoteDomain:     { endpoint: 'RemoteDomain',       cmdlet: 'Get-RemoteDomain' },
  OwaMailboxPolicy: { endpoint: 'OwaMailboxPolicy',   cmdlet: 'Get-OwaMailboxPolicy' },
  TransportRule:    { endpoint: 'TransportRule',      cmdlet: 'Get-TransportRule' },
  InboundConnector: { endpoint: 'InboundConnector',  cmdlet: 'Get-InboundConnector' },
};

async function exchangeGet(tenantId, resource) {
  if (!_exToken) return null;
  const map = EXCHANGE_RESOURCE_MAP[resource] || { endpoint: resource, cmdlet: `Get-${resource}` };
  // X-AnchorMailbox is mandatory for v2.0 — use fixed system mailbox GUID
  const anchorMailbox = _tenantDomain
    ? `APP:SystemMailbox{bb558c35-97f1-4cb9-8ff7-d53741dc928c}@${_tenantDomain}`
    : `UPN:SystemMailbox{bb558c35-97f1-4cb9-8ff7-d53741dc928c}@${tenantId}.onmicrosoft.com`;
  const res = await fetch(`https://outlook.office365.com/adminapi/v2.0/${tenantId}/${map.endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${_exToken}`,
      'Content-Type': 'application/json',
      'X-AnchorMailbox': anchorMailbox,
    },
    body: JSON.stringify({ CmdletInput: { CmdletName: map.cmdlet, Parameters: {} } }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`Exchange v2.0 API error [${map.cmdlet}]: ${res.status} ${errText.substring(0, 200)}`);
    return null;
  }
  return res.json();
}

async function getSpoSettings(graphToken) {
  if (_spoSettingsCache) return _spoSettingsCache;
  const res = await graphGet(graphToken, '/admin/sharepoint/settings').catch(() => null);
  _spoSettingsCache = res || null;
  return _spoSettingsCache;
}

let _pbiToken = null;
let _pbiSettingsCache = null;

async function getPowerBiToken(tenantId) {
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: Deno.env.get('AZURE_CLIENT_ID'),
      client_secret: Deno.env.get('AZURE_CLIENT_SECRET'),
      scope: 'https://analysis.windows.net/powerbi/api/.default',
    }).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'PBI token error');
  return data.access_token;
}

async function getPbiSettings() {
  if (_pbiSettingsCache) return _pbiSettingsCache;
  if (!_pbiToken) return null;
  const res = await fetch('https://api.powerbi.com/v1.0/myorg/admin/tenantsettings', {
    headers: { Authorization: `Bearer ${_pbiToken}` },
  }).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json().catch(() => null);
  _pbiSettingsCache = data?.tenantSettings || null;
  return _pbiSettingsCache;
}

function findPbiSetting(settings, ...names) {
  if (!settings) return null;
  for (const name of names) {
    const found = settings.find(s => (s.name || s.settingName || '').toLowerCase().includes(name.toLowerCase()));
    if (found) return found;
  }
  return null;
}
async function getSecureScoreControls(token) {
  if (_secureScoreCache) return _secureScoreCache;
  const data = await graphGet(token, '/security/secureScores?$top=1');
  _secureScoreCache = data.value?.[0] || null;
  return _secureScoreCache;
}

function getControl(score, ...keywords) {
  if (!score?.controlScores) return null;
  for (const kw of keywords) {
    const found = score.controlScores.find(c =>
      c.controlName?.toLowerCase().includes(kw.toLowerCase())
    );
    if (found) return found;
  }
  return null;
}

// Helper: check if a CA policy's includeUsers covers 'All'
function includesAllUsers(policy) {
  const users = policy.conditions?.users?.includeUsers;
  if (!users) return false;
  if (Array.isArray(users)) return users.includes('All') || users.includes('all');
  return users === 'All' || users === 'all';
}

// Helper: check if a CA policy enforces MFA (builtInControls or authenticationStrength)
function hasMfaControl(policy) {
  return !!(
    policy.grantControls?.builtInControls?.includes('mfa') ||
    policy.grantControls?.authenticationStrength != null
  );
}

// =============================================
// CIS Microsoft 365 Foundations Benchmark v6.0.1
// All checks are fully automated
// =============================================

async function runCheck(token, checkId) {
  switch (checkId) {

    // --- SECTION 1: Entra ID ---

    case 'CIS-1.1.1': {
      const data = await graphGet(token, '/policies/identitySecurityDefaultsEnforcementPolicy');
      const enabled = data.isEnabled;
      return {
        status: enabled ? 'failed' : 'passed',
        actual_value: `isEnabled: ${enabled}`,
        // actual:
        expected_value: 'מכובה (Disabled)',
        evidence: { 'Security Defaults': enabled ? 'מופעל ✗' : 'מכובה ✓', 'משמעות': enabled ? 'מגביל שימוש ב-Conditional Access' : 'ניתן להגדיר CA מותאם' },
      };
    }

    case 'CIS-1.1.2': {
      // Check via organization - onPremisesSyncEnabled on any user indicates hybrid
      const org = await graphGet(token, '/organization?$select=id,displayName,onPremisesLastSyncDateTime,onPremisesSyncEnabled');
      const orgData = org.value?.[0] || {};
      const isHybrid = orgData.onPremisesSyncEnabled === true;
      const lastSync = orgData.onPremisesLastSyncDateTime;
      // If not hybrid, PHS is not applicable
      if (!isHybrid) {
        return {
          status: 'not_applicable',
          actual_value: 'Cloud-only (onPremisesSyncEnabled: false)',
          //
          expected_value: 'לא רלוונטי לסביבה זו',
          evidence: { 'סוג סביבה': 'Cloud-only', 'סנכרון AD': 'לא מוגדר', 'הערה': 'Password Hash Sync רלוונטי רק לסביבות היברידיות' },
        };
      }
      const syncRecent = lastSync && (new Date() - new Date(lastSync)) < 3 * 60 * 60 * 1000; // within 3h
      return {
      status: syncRecent ? 'passed' : 'warning',
      actual_value: lastSync ? `Last sync: ${new Date(lastSync).toISOString()}` : 'Unknown',
      //
        expected_value: 'סנכרון AD פעיל ועדכני',
        evidence: { 'סביבה היברידית': 'כן', 'סנכרון אחרון': lastSync || 'לא ידוע', 'סטטוס סנכרון': syncRecent ? 'תקין ✓' : 'ישן / לא תקין ✗' },
      };
    }

    case 'CIS-1.2.1': {
      const data = await graphGet(token, '/identity/conditionalAccess/policies');
      const policies = (data.value || []).filter(p => p.state === 'enabled');
      const mfaAdminPolicies = policies.filter(p =>
        hasMfaControl(p) &&
        (p.conditions?.users?.includeRoles?.length > 0 || includesAllUsers(p))
      );
      return {
        status: mfaAdminPolicies.length > 0 ? 'passed' : 'failed',
        actual_value: `${mfaAdminPolicies.length} CA policies requiring MFA for privileged users`,
        //
        expected_value: 'לפחות מדיניות CA אחת פעילה המחייבת MFA לתפקידי ניהול',
        evidence: {
          'מדיניות פעילות שנמצאו': mfaAdminPolicies.length,
          'רשימת מדיניות': mfaAdminPolicies.map(p => p.displayName).join(', ') || 'אין',
          'סך מדיניות CA פעילות': policies.length,
        },
      };
    }

    case 'CIS-1.2.2': {
      const data = await graphGet(token, '/identity/conditionalAccess/policies');
      const policies = (data.value || []).filter(p => p.state === 'enabled');
      // Match policies that cover all users AND enforce MFA (via builtInControls or authStrength)
      const mfaAllPolicies = policies.filter(p => includesAllUsers(p) && hasMfaControl(p));
      // Also check broader coverage: any large policy with MFA
      const anyMfaPolicies = policies.filter(p => hasMfaControl(p));
      const passed = mfaAllPolicies.length > 0;
      return {
        status: passed ? 'passed' : 'failed',
        actual_value: passed
          ? `${mfaAllPolicies.length} CA policies requiring MFA for All users`
          : `No CA policy enforcing MFA for All users (${anyMfaPolicies.length} other MFA policies found)`,
        //
        expected_value: 'לפחות מדיניות CA אחת המחייבת MFA לכל המשתמשים',
        evidence: {
          'מדיניות MFA לכולם (includeUsers=All)': mfaAllPolicies.map(p => p.displayName).join(', ') || 'אין',
          'מדיניות MFA אחרות': anyMfaPolicies.filter(p => !mfaAllPolicies.includes(p)).map(p => `${p.displayName} (${JSON.stringify(p.conditions?.users?.includeUsers)})`).join(', ') || 'אין',
          'סך מדיניות CA פעילות': policies.length,
          'מצב': passed ? 'תקין ✓' : 'MFA אינו מחייב לכל המשתמשים ✗',
        },
      };
    }

    case 'CIS-1.3.1': {
      const domainsData = await graphGet(token, '/domains?$select=id,passwordValidityPeriodInDays,isVerified');
      const domains = (domainsData.value || []).filter(d => d.isVerified);
      const expiring = domains.filter(d => d.passwordValidityPeriodInDays !== 2147483647 && d.passwordValidityPeriodInDays !== null);
      return {
        status: expiring.length === 0 ? 'passed' : 'failed',
        actual_value: expiring.length === 0 ? 'passwordValidityPeriodInDays: 2147483647 (Never)' : `${expiring.length} domain(s) with password expiration set`,
        //
        expected_value: 'PasswordValidityPeriodInDays = 2147483647 (לעולם לא פג)',
        evidence: {
          'דומיינים שנבדקו': domains.length,
          'דומיינים עם פקיעת סיסמה': expiring.map(d => `${d.id} (${d.passwordValidityPeriodInDays} ימים)`).join(', ') || 'אין',
          'מצב': expiring.length === 0 ? 'תקין ✓' : 'דורש תיקון ✗',
        },
      };
    }

    case 'CIS-1.3.3': {
      const policy = await graphGet(token, '/policies/authenticationMethodsPolicy');
      const sspr = policy.selfServicePasswordReset;
      const state = sspr?.state || 'unknown';
      const methodsCount = sspr?.authenticationMethodConfigurations?.filter(m => m.state === 'enabled')?.length || 0;
      const passed = (state === 'enabled' || state === 'enabledForAllUsers') && methodsCount >= 2;
      return {
        status: passed ? 'passed' : 'failed',
        actual_value: `SSPR state: ${state}, methods enabled: ${methodsCount}`,
        //
        expected_value: 'SSPR מופעל לכל המשתמשים עם לפחות 2 שיטות אימות',
        evidence: {
          'סטטוס SSPR': state,
          'שיטות אימות מופעלות': methodsCount,
          'מינימום נדרש': '2 שיטות',
          'מצב': passed ? 'תקין ✓' : 'דורש תיקון ✗',
        },
      };
    }

    case 'CIS-1.4.1': {
      const roles = await graphGet(token, '/directoryRoles?$filter=roleTemplateId eq \'62e90394-69f5-4237-9190-012177145e10\'');
      let admins = [];
      if (roles.value?.length > 0) {
        const members = await graphGet(token, `/directoryRoles/${roles.value[0].id}/members?$select=displayName,userPrincipalName`);
        admins = members.value || [];
      }
      const count = admins.length;
      const status = count >= 2 && count <= 4 ? 'passed' : 'failed';
      return {
        status,
        actual_value: `${count} Global Administrator(s)`,
        //
        expected_value: 'בין 2 ל-4 מנהלי Global Admin',
        evidence: {
          'מספר מנהלים': count,
          'טווח מומלץ': '2–4',
          'מנהלים': admins.map(a => a.displayName || a.userPrincipalName).join(', '),
          'מצב': status === 'passed' ? 'תקין ✓' : count < 2 ? 'מעט מדי מנהלים ✗' : 'יותר מדי מנהלים ✗',
        },
      };
    }

    case 'CIS-1.4.2': {
      const roles = await graphGet(token, '/directoryRoles?$filter=roleTemplateId eq \'62e90394-69f5-4237-9190-012177145e10\'');
      if (!roles.value?.length) {
        return { status: 'passed', actual_value: 'לא נמצאו מנהלים', expected_value: 'אין מנהלים מסונכרנים', evidence: { 'מנהלים מסונכרנים': 0 } };
      }
      const members = await graphGet(token, `/directoryRoles/${roles.value[0].id}/members?$select=displayName,userPrincipalName,onPremisesSyncEnabled`);
      const all = members.value || [];
      const synced = all.filter(u => u.onPremisesSyncEnabled === true);
      return {
        status: synced.length === 0 ? 'passed' : 'failed',
        actual_value: synced.length === 0 ? 'All admin accounts are cloud-only (onPremisesSyncEnabled: false)' : `${synced.length} admin(s) synced from on-premises AD`,
        //
        expected_value: 'כל חשבונות המנהל הם cloud-only (לא מסונכרנים)',
        evidence: {
          'סך מנהלים': all.length,
          'מנהלים מסונכרנים מ-AD': synced.length,
          'מנהלים מסונכרנים': synced.map(u => u.userPrincipalName).join(', ') || 'אין',
          'מצב': synced.length === 0 ? 'תקין ✓' : 'דורש תיקון ✗',
        },
      };
    }

    case 'CIS-1.5.1': {
      const data = await graphGet(token, '/identity/conditionalAccess/policies');
      const policies = (data.value || []).filter(p => p.state === 'enabled');
      const blockLegacy = policies.filter(p =>
        p.grantControls?.builtInControls?.includes('block') &&
        p.conditions?.clientAppTypes?.some(t => ['exchangeActiveSync', 'other'].includes(t))
      );
      return {
        status: blockLegacy.length > 0 ? 'passed' : 'failed',
        actual_value: blockLegacy.length > 0 ? `${blockLegacy.length} CA policy(ies) blocking Legacy Auth clients` : 'No CA policy blocking Legacy Authentication',
        //
        expected_value: 'מדיניות CA פעילה החוסמת ExchangeActiveSync ו-Other clients',
        evidence: {
          'מדיניות חסימה נמצאו': blockLegacy.length,
          'רשימת מדיניות': blockLegacy.map(p => p.displayName).join(', ') || 'אין',
          'מצב': blockLegacy.length > 0 ? 'תקין ✓' : 'Legacy Auth פתוח ✗',
        },
      };
    }

    case 'CIS-1.6.1': {
      const data = await graphGet(token, '/identity/conditionalAccess/policies');
      const policies = (data.value || []).filter(p => p.state === 'enabled');
      const riskPolicy = policies.filter(p =>
        p.conditions?.signInRiskLevels?.some(r => ['high', 'medium'].includes(r)) &&
        (p.grantControls?.builtInControls?.includes('block') || p.grantControls?.builtInControls?.includes('mfa'))
      );
      return {
        status: riskPolicy.length > 0 ? 'passed' : 'failed',
        actual_value: riskPolicy.length > 0 ? `${riskPolicy.length} Sign-in Risk CA policy(ies) found` : 'No Sign-in Risk policy configured',
        expected_value: 'CA policy: signInRiskLevels = high, medium → Block or MFA',
        evidence: {
          'מדיניות סיכון נמצאו': riskPolicy.length,
          'רשימת מדיניות': riskPolicy.map(p => `${p.displayName} (${p.conditions?.signInRiskLevels?.join(',')})`).join(', ') || 'אין',
          'מצב': riskPolicy.length > 0 ? 'תקין ✓' : 'כניסות בסיכון גבוה אינן נחסמות ✗',
        },
      };
    }

    case 'CIS-1.6.2': {
      const data = await graphGet(token, '/identity/conditionalAccess/policies');
      const policies = (data.value || []).filter(p => p.state === 'enabled');
      const riskPolicy = policies.filter(p =>
        p.conditions?.userRiskLevels?.some(r => ['high', 'medium'].includes(r)) &&
        (p.grantControls?.builtInControls?.includes('block') || p.grantControls?.builtInControls?.includes('passwordChange'))
      );
      return {
        status: riskPolicy.length > 0 ? 'passed' : 'failed',
        actual_value: riskPolicy.length > 0 ? `${riskPolicy.length} User Risk CA policy(ies) found` : 'No User Risk policy configured',
        expected_value: 'CA policy: userRiskLevels = high → Block or password change',
        evidence: {
          'מדיניות סיכון משתמש': riskPolicy.length,
          'רשימת מדיניות': riskPolicy.map(p => `${p.displayName} (${p.conditions?.userRiskLevels?.join(',')})`).join(', ') || 'אין',
          'מצב': riskPolicy.length > 0 ? 'תקין ✓' : 'משתמשים בסיכון גבוה אינם נחסמים ✗',
        },
      };
    }

    case 'CIS-1.7.1': {
      const guestUsers = await graphGet(token, '/users?$filter=userType eq \'Guest\'&$select=displayName,userPrincipalName,id&$top=50');
      const guests = guestUsers.value || [];
      const guestAdmins = [];
      for (const guest of guests.slice(0, 15)) {
        const memberOf = await graphGet(token, `/users/${guest.id}/memberOf/microsoft.graph.directoryRole?$select=displayName`).catch(() => ({ value: [] }));
        if ((memberOf.value || []).length > 0) {
          guestAdmins.push({ name: guest.displayName, roles: memberOf.value.map(r => r.displayName) });
        }
      }
      return {
        status: guestAdmins.length === 0 ? 'passed' : 'failed',
        actual_value: guestAdmins.length === 0 ? 'No guest users with directory roles' : `${guestAdmins.length} guest(s) found with admin roles`,
        //
        expected_value: 'אפס משתמשי אורח עם תפקידי ניהול',
        evidence: {
          'סך אורחים': guests.length,
          'אורחים עם תפקידי מנהל': guestAdmins.length,
          'פרטים': guestAdmins.map(g => `${g.name}: ${g.roles.join(', ')}`).join(' | ') || 'אין',
          'מצב': guestAdmins.length === 0 ? 'תקין ✓' : 'דורש תיקון מיידי ✗',
        },
      };
    }

    // --- SECTION 2: Conditional Access ---

    case 'CIS-2.1.1': {
      const data = await graphGet(token, '/identity/conditionalAccess/policies');
      const policies = (data.value || []).filter(p => p.state === 'enabled');
      const allAppsPolicies = policies.filter(p =>
        p.conditions?.applications?.includeApplications?.some(a => ['All', 'all'].includes(a))
      );
      return {
        status: allAppsPolicies.length > 0 ? 'passed' : 'failed',
        actual_value: `${allAppsPolicies.length} CA policy(ies) with includeApplications: All`,
        //
        expected_value: 'לפחות מדיניות CA אחת עם Cloud apps = All',
        evidence: {
          'מדיניות "כל האפליקציות"': allAppsPolicies.length,
          'רשימת מדיניות': allAppsPolicies.map(p => p.displayName).join(', ') || 'אין',
          'סך מדיניות CA': policies.length,
          'מצב': allAppsPolicies.length > 0 ? 'תקין ✓' : 'אפליקציות ללא כיסוי ✗',
        },
      };
    }

    case 'CIS-2.1.2': {
      const data = await graphGet(token, '/identity/conditionalAccess/policies');
      const policies = (data.value || []).filter(p => p.state === 'enabled');
      const compliantDevice = policies.filter(p =>
        p.grantControls?.builtInControls?.includes('compliantDevice') ||
        p.grantControls?.builtInControls?.includes('domainJoinedDevice')
      );
      return {
        status: compliantDevice.length > 0 ? 'passed' : 'failed',
        actual_value: compliantDevice.length > 0 ? `${compliantDevice.length} CA policy(ies) requiring compliantDevice/domainJoined` : 'No compliant device requirement found',
        //
        expected_value: 'מדיניות CA המחייבת Compliant device או Hybrid Azure AD join',
        evidence: {
          'מדיניות עם דרישת התקן': compliantDevice.length,
          'רשימת מדיניות': compliantDevice.map(p => p.displayName).join(', ') || 'אין',
          'מצב': compliantDevice.length > 0 ? 'תקין ✓' : 'גישה ללא התקן מנוהל אפשרית ✗',
        },
      };
    }

    case 'CIS-2.1.3': {
      const data = await graphGet(token, '/identity/conditionalAccess/policies');
      const policies = (data.value || []).filter(p => p.state === 'enabled');
      const sessionPolicies = policies.filter(p =>
        p.sessionControls?.signInFrequency?.isEnabled ||
        p.sessionControls?.persistentBrowser?.isEnabled
      );
      return {
        status: sessionPolicies.length > 0 ? 'passed' : 'warning',
        actual_value: `${sessionPolicies.length} CA policy(ies) with session controls configured`,
        //
        expected_value: 'לפחות מדיניות CA אחת עם Sign-in frequency מוגדרת',
        evidence: {
          'מדיניות session': sessionPolicies.length,
          'פרטי session': sessionPolicies.map(p => {
            const freq = p.sessionControls?.signInFrequency;
            return `${p.displayName}: ${freq?.value} ${freq?.type || ''}`;
          }).join(', ') || 'אין',
          'מצב': sessionPolicies.length > 0 ? 'תקין ✓' : 'סשנים ללא הגבלת זמן ✗',
        },
      };
    }

    // --- SECTION 3: Exchange Online ---

    case 'CIS-3.1.1': {
      // Direct Exchange REST API - same as Get-OrganizationConfig | Select OAuth2ClientProfileEnabled
      const orgId311 = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      const org311 = orgId311 && _exToken ? await exchangeGet(orgId311, 'Organization') : null;
      const orgData311 = org311?.value?.[0] || org311;
      if (orgData311?.OAuth2ClientProfileEnabled !== undefined) {
        const enabled = orgData311.OAuth2ClientProfileEnabled;
        return {
          status: enabled ? 'passed' : 'failed',
          actual_value: `OAuth2ClientProfileEnabled: ${enabled}`,
          expected_value: 'OAuth2ClientProfileEnabled = True',
          evidence: {
            'OAuth2ClientProfileEnabled': enabled,
            'מקור': 'Exchange REST API (real-time)',
            'מצב': enabled ? 'Modern Auth מופעל ✓' : 'Modern Auth מושבת ✗',
          },
        };
      }
      return {
        status: 'warning',
        actual_value: 'לא ניתן לגשת ל-Exchange API',
        expected_value: 'OAuth2ClientProfileEnabled = True',
        evidence: { 'הערה': 'ודא ש-Exchange.ManageAsApp מוגדר ואפליקציה הוקצתה ל-Exchange Administrator role' },
      };
    }

    case 'CIS-3.2.1': {
      // Direct Exchange REST API - same as Get-RemoteDomain | Select AutoForwardEnabled
      const orgId321 = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      const remoteDomains321 = orgId321 && _exToken ? await exchangeGet(orgId321, 'RemoteDomain') : null;
      if (remoteDomains321?.value) {
        const domains = remoteDomains321.value;
        const defaultDomain = domains.find(d => d.DomainName === '*') || domains[0];
        const autoForward = defaultDomain?.AutoForwardEnabled;
        const anyEnabled = domains.some(d => d.AutoForwardEnabled === true);
        return {
          status: !anyEnabled ? 'passed' : 'failed',
          actual_value: `AutoForwardEnabled (Default): ${autoForward} | כל הדומיינים: ${anyEnabled ? 'לפחות אחד מאופשר' : 'כולם חסומים'}`,
          expected_value: 'AutoForwardEnabled = False על כל Remote Domains',
          evidence: {
            'Default Domain AutoForward': autoForward,
            'דומיינים עם AutoForward פעיל': domains.filter(d => d.AutoForwardEnabled).map(d => d.DomainName).join(', ') || 'אין',
            'סך דומיינים': domains.length,
            'מקור': 'Exchange REST API (real-time)',
            'מצב': !anyEnabled ? 'תקין ✓' : 'AutoForward פעיל ✗',
          },
        };
      }
      return {
        status: 'warning',
        actual_value: 'לא ניתן לגשת ל-Exchange API',
        expected_value: 'AutoForwardEnabled = False',
        evidence: { 'הערה': 'ודא ש-Exchange.ManageAsApp מוגדר ואפליקציה הוקצתה ל-Exchange Administrator role' },
      };
    }

    case 'CIS-3.3.1': {
      // SPF via DNS-over-HTTPS for all custom domains
      const domainsData = await graphGet(token, '/domains?$select=id,isVerified');
      const customDomains = (domainsData.value || []).filter(d => d.isVerified && !d.id.endsWith('.onmicrosoft.com') && !d.id.endsWith('.mail.onmicrosoft.com'));
      if (customDomains.length === 0) {
        return { status: 'not_applicable', actual_value: 'אין דומיינים מותאמים', expected_value: 'לא רלוונטי', evidence: { 'דומיינים': 'רק onmicrosoft.com' } };
      }
      const results = {};
      for (const domain of customDomains.slice(0, 5)) {
        const dns = await dnsQuery(domain.id, 'TXT');
        const spfRecord = (dns.Answer || []).find(r => r.data?.includes('v=spf1'));
        results[domain.id] = spfRecord ? `${spfRecord.data.substring(0, 60)}...` : 'לא נמצא';
      }
      const allHaveSPF = Object.values(results).every(v => v !== 'לא נמצא');
      return {
        status: allHaveSPF ? 'passed' : 'failed',
        actual_value: allHaveSPF ? 'SPF configured for all custom domains' : 'SPF missing for one or more domains',
        //
        expected_value: 'v=spf1 include:spf.protection.outlook.com -all',
        evidence: { ...results, 'מצב': allHaveSPF ? 'תקין ✓' : 'דורש תיקון ✗' },
      };
    }

    case 'CIS-3.3.2': {
      // DKIM via DNS-over-HTTPS - check BOTH selector1 and selector2 per domain
      const domainsData = await graphGet(token, '/domains?$select=id,isVerified');
      const customDomains = (domainsData.value || []).filter(d => d.isVerified && !d.id.endsWith('.onmicrosoft.com') && !d.id.endsWith('.mail.onmicrosoft.com'));
      if (customDomains.length === 0) {
        return { status: 'not_applicable', actual_value: 'אין דומיינים מותאמים', expected_value: 'לא רלוונטי', evidence: { 'דומיינים': 'רק onmicrosoft.com' } };
      }
      const evidence = {};
      const perDomainStatus = {};
      for (const domain of customDomains.slice(0, 6)) {
        const [dns1, dns2] = await Promise.all([
          dnsQuery(`selector1._domainkey.${domain.id}`, 'CNAME'),
          dnsQuery(`selector2._domainkey.${domain.id}`, 'CNAME'),
        ]);
        const has1 = (dns1.Answer || []).length > 0;
        const has2 = (dns2.Answer || []).length > 0;
        if (has1 || has2) {
          evidence[`${domain.id} - selector1`] = has1 ? `✓ ${dns1.Answer[0]?.data || 'CNAME קיים'}` : '✗ חסר';
          evidence[`${domain.id} - selector2`] = has2 ? `✓ ${dns2.Answer[0]?.data || 'CNAME קיים'}` : '✗ חסר';
          perDomainStatus[domain.id] = (has1 && has2) ? 'מלא' : 'חלקי';
        } else {
          evidence[`${domain.id}`] = '✗ DKIM לא מוגדר (selector1 + selector2 חסרים)';
          perDomainStatus[domain.id] = 'חסר';
        }
      }
      const allFull = Object.values(perDomainStatus).every(v => v === 'מלא');
      const anyMissing = Object.values(perDomainStatus).some(v => v === 'חסר');
      const domainsWithDkim = Object.entries(perDomainStatus).filter(([,v]) => v !== 'חסר').map(([k]) => k);
      const domainsWithoutDkim = Object.entries(perDomainStatus).filter(([,v]) => v === 'חסר').map(([k]) => k);
      return {
        status: allFull ? 'passed' : anyMissing ? 'failed' : 'warning',
        actual_value: anyMissing
          ? `DKIM missing: ${domainsWithoutDkim.join(', ')}${domainsWithDkim.length > 0 ? ` | Configured: ${domainsWithDkim.join(', ')}` : ''}`
          : `DKIM configured for all domains (${domainsWithDkim.join(', ')})`,
        //
        expected_value: 'selector1 + selector2 CNAME records לכל דומיין מותאם',
        evidence: { ...evidence, 'מצב': allFull ? 'תקין ✓' : anyMissing ? 'דורש הפעלה ✗' : 'חלקי ⚠' },
      };
    }

    case 'CIS-3.3.3': {
      // DMARC via DNS-over-HTTPS
      const domainsData = await graphGet(token, '/domains?$select=id,isVerified');
      const customDomains = (domainsData.value || []).filter(d => d.isVerified && !d.id.endsWith('.onmicrosoft.com'));
      if (customDomains.length === 0) {
        return { status: 'not_applicable', actual_value: 'אין דומיינים מותאמים', expected_value: 'לא רלוונטי', evidence: { 'דומיינים': 'רק onmicrosoft.com' } };
      }
      const results = {};
      let strictCount = 0;
      for (const domain of customDomains.slice(0, 5)) {
        const dns = await dnsQuery(`_dmarc.${domain.id}`, 'TXT');
        const dmarcRecord = (dns.Answer || []).find(r => r.data?.includes('v=DMARC1'));
        if (dmarcRecord) {
          const isStrict = dmarcRecord.data.includes('p=reject') || dmarcRecord.data.includes('p=quarantine');
          results[domain.id] = `${dmarcRecord.data.substring(0, 80)}`;
          if (isStrict) strictCount++;
        } else {
          results[domain.id] = 'לא נמצא';
        }
      }
      const allHaveDMARC = Object.values(results).every(v => v !== 'לא נמצא');
      return {
        status: allHaveDMARC && strictCount === customDomains.slice(0, 5).length ? 'passed' : allHaveDMARC ? 'warning' : 'failed',
        actual_value: allHaveDMARC ? (strictCount > 0 ? `DMARC policy=quarantine/reject (${strictCount}/${customDomains.length} domains)` : 'DMARC found but policy=none (no enforcement)') : 'DMARC record missing',
        //
        expected_value: 'v=DMARC1; p=quarantine או p=reject',
        evidence: { ...results, 'מצב': allHaveDMARC ? (strictCount > 0 ? 'תקין ✓' : 'DMARC ב-none mode ✗') : 'חסר DMARC ✗' },
      };
    }

    case 'CIS-3.4.1': {
      // Get-OrganizationConfig | Select AuditDisabled
      // Use direct POST to Exchange API requesting AuditDisabled explicitly
      const orgId341 = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      
      let org341Raw = null;
      if (orgId341 && _exToken) {
        // Make a specific call requesting only AuditDisabled to ensure we get the field
        const anchorMailbox341 = _tenantDomain
          ? `APP:SystemMailbox{bb558c35-97f1-4cb9-8ff7-d53741dc928c}@${_tenantDomain}`
          : `UPN:SystemMailbox{bb558c35-97f1-4cb9-8ff7-d53741dc928c}@${orgId341}.onmicrosoft.com`;
        const res341 = await fetch(`https://outlook.office365.com/adminapi/v2.0/${orgId341}/OrganizationConfig`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${_exToken}`,
            'Content-Type': 'application/json',
            'X-AnchorMailbox': anchorMailbox341,
          },
          body: JSON.stringify({ CmdletInput: { CmdletName: 'Get-OrganizationConfig', Parameters: {} } }),
        });
        if (res341.ok) {
          org341Raw = await res341.json();
          console.log('CIS-3.4.1 raw response keys:', Object.keys(org341Raw || {}));
          const firstItem = org341Raw?.value?.[0];
          if (firstItem) console.log('CIS-3.4.1 AuditDisabled field:', firstItem.AuditDisabled, '| available fields sample:', Object.keys(firstItem).slice(0, 20).join(', '));
        }
      }

      // Parse response - Exchange v2.0 may return value array or tabular format
      let orgData341 = null;
      if (org341Raw) {
        if (Array.isArray(org341Raw.value) && org341Raw.value.length > 0) {
          orgData341 = org341Raw.value[0];
        } else if (org341Raw.FieldNames && org341Raw.RowValues) {
          orgData341 = {};
          org341Raw.FieldNames.forEach((f, i) => { orgData341[f] = org341Raw.RowValues[0]?.[i]; });
        } else if (org341Raw.AuditDisabled !== undefined) {
          orgData341 = org341Raw;
        }
      }

      if (orgData341 !== null && orgData341 !== undefined) {
        // If AuditDisabled field is present, use it. If absent, Exchange defaults it to false (auditing enabled).
        // When explicitly set to true (disabled), Exchange WILL include it in the response.
        const auditDisabled = orgData341.AuditDisabled === true;
        const fieldPresent = 'AuditDisabled' in orgData341;
        return {
          status: auditDisabled === false ? 'passed' : 'failed',
          actual_value: `AuditDisabled: ${auditDisabled}${!fieldPresent ? ' (field absent = default false)' : ''}`,
          expected_value: 'AuditDisabled = false (תיעוד מופעל)',
          evidence: {
            'AuditDisabled': auditDisabled,
            'שדה בתגובה': fieldPresent ? 'כן' : 'לא (ברירת מחדל = false)',
            'מקור': 'Exchange Admin REST API v2.0 (Get-OrganizationConfig)',
            'מצב': auditDisabled === false ? 'Mailbox Auditing מופעל ✓' : 'Mailbox Auditing מושבת ✗',
          },
        };
      }
      return {
        status: 'warning',
        actual_value: _exToken ? 'Exchange API נגיש אך תגובה לא צפויה' : 'Exchange token לא התקבל',
        expected_value: 'AuditDisabled = false',
        evidence: {
          'Exchange Token': _exToken ? 'קיים ✓' : 'חסר ✗',
          'Tenant Domain': _tenantDomain || 'לא נמצא',
        },
      };
    }

    // --- SECTION 4: Defender ---

    case 'CIS-4.1.1': {
      const score = await getSecureScoreControls(token);
      // Try multiple known control names for Safe Attachments
      const ctrl = getControl(score, 'safeattach', 'SafeAttach', 'MDOSafeAttachment', 'safeattachmentforall', 'EnableSafeAttachment');
      const implemented = ctrl && (ctrl.score > 0 || ctrl.implementationStatus === 'Implemented' || ctrl.implementationStatus === 'implemented');
      // Fallback: search all controls for anything attachment-related
      const allCtrl = !ctrl && score?.controlScores?.find(c => c.controlName?.toLowerCase().includes('attach'));
      const effectiveCtrl = ctrl || allCtrl;
      const effectiveImplemented = effectiveCtrl && (effectiveCtrl.score > 0 || effectiveCtrl.implementationStatus === 'Implemented');
      return {
        status: effectiveCtrl ? (effectiveImplemented ? 'passed' : 'failed') : 'warning',
        actual_value: effectiveCtrl
          ? (effectiveImplemented ? `${effectiveCtrl.controlName}: Implemented (score ${effectiveCtrl.score}/${effectiveCtrl.maxScore})` : `${effectiveCtrl.controlName}: Not Implemented`)
          : 'לא נמצא ב-Secure Score — ייתכן שדורש Defender for Office 365 Plan 1',
        expected_value: 'Safe Attachments policy enabled for all users',
        evidence: effectiveCtrl ? {
          'שם בקרה': effectiveCtrl.controlName,
          'ציון Secure Score': `${effectiveCtrl.score}/${effectiveCtrl.maxScore}`,
          'סטטוס': effectiveCtrl.implementationStatus || 'לא ידוע',
          'מצב': effectiveImplemented ? 'תקין ✓' : 'דורש הפעלה ✗',
        } : {
          'הערה': 'בדוק ב-Microsoft Defender > Policies > Safe attachments',
          'כל בקרות Secure Score (attachment)': (score?.controlScores || []).filter(c => c.controlName?.toLowerCase().includes('attach')).map(c => c.controlName).join(', ') || 'אין',
        },
      };
    }

    case 'CIS-4.1.2': {
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'safelink', 'SafeLink', 'EnableSafeLinks', 'MDOSafeLink');
      const allCtrl = !ctrl && score?.controlScores?.find(c => c.controlName?.toLowerCase().includes('link'));
      const effectiveCtrl = ctrl || allCtrl;
      const effectiveImplemented = effectiveCtrl && (effectiveCtrl.score > 0 || effectiveCtrl.implementationStatus === 'Implemented');
      return {
        status: effectiveCtrl ? (effectiveImplemented ? 'passed' : 'failed') : 'warning',
        actual_value: effectiveCtrl
          ? (effectiveImplemented ? `${effectiveCtrl.controlName}: Implemented (score ${effectiveCtrl.score}/${effectiveCtrl.maxScore})` : `${effectiveCtrl.controlName}: Not Implemented`)
          : 'לא נמצא ב-Secure Score — ייתכן שדורש Defender for Office 365 Plan 1',
        expected_value: 'Safe Links policy enabled for Email and Office apps',
        evidence: effectiveCtrl ? {
          'שם בקרה': effectiveCtrl.controlName,
          'ציון Secure Score': `${effectiveCtrl.score}/${effectiveCtrl.maxScore}`,
          'סטטוס': effectiveCtrl.implementationStatus || 'לא ידוע',
          'מצב': effectiveImplemented ? 'תקין ✓' : 'דורש הפעלה ✗',
        } : {
          'הערה': 'בדוק ב-Microsoft Defender > Policies > Safe links',
          'כל בקרות Secure Score (link)': (score?.controlScores || []).filter(c => c.controlName?.toLowerCase().includes('link')).map(c => c.controlName).join(', ') || 'אין',
        },
      };
    }

    case 'CIS-4.2.1': {
      const score = await getSecureScoreControls(token);
      // Try multiple known control names for Anti-Phishing
      const ctrl = getControl(score, 'antiphish', 'AntiPhish', 'phishing', 'Phishing', 'setEmailAntiPhishing', 'EnableAntiPhishing');
      const allCtrl = !ctrl && score?.controlScores?.find(c => c.controlName?.toLowerCase().includes('phish'));
      const effectiveCtrl = ctrl || allCtrl;
      const effectiveImplemented = effectiveCtrl && (effectiveCtrl.score > 0 || effectiveCtrl.implementationStatus === 'Implemented');
      // Also check for Anti-Spam via Secure Score
      const spamCtrl = getControl(score, 'antispam', 'AntiSpam', 'spam', 'setEmailAntiSpam');
      const spamAllCtrl = !spamCtrl && score?.controlScores?.find(c => c.controlName?.toLowerCase().includes('spam'));
      const effectiveSpamCtrl = spamCtrl || spamAllCtrl;
      const spamImplemented = effectiveSpamCtrl && (effectiveSpamCtrl.score > 0 || effectiveSpamCtrl.implementationStatus === 'Implemented');
      return {
        status: effectiveCtrl ? (effectiveImplemented ? 'passed' : 'failed') : 'warning',
        actual_value: effectiveCtrl
          ? (effectiveImplemented ? `${effectiveCtrl.controlName}: Implemented (score ${effectiveCtrl.score}/${effectiveCtrl.maxScore})` : `${effectiveCtrl.controlName}: Not Implemented`)
          : 'לא נמצא ב-Secure Score',
        expected_value: 'Anti-phishing policy with impersonation protection enabled',
        evidence: {
          ...(effectiveCtrl ? {
            'Anti-Phishing - שם בקרה': effectiveCtrl.controlName,
            'Anti-Phishing - ציון': `${effectiveCtrl.score != null ? effectiveCtrl.score : '?'}${effectiveCtrl.maxScore != null ? '/' + effectiveCtrl.maxScore : ''}`,
            'Anti-Phishing - סטטוס': effectiveCtrl.implementationStatus || 'לא ידוע',
            'Anti-Phishing - מצב': effectiveImplemented ? 'תקין ✓' : 'דורש הגדרה ✗',
          } : { 'Anti-Phishing': 'לא נמצא — בדוק ב-Microsoft Defender > Anti-phishing policies' }),
          ...(effectiveSpamCtrl ? {
            'Anti-Spam - שם בקרה': effectiveSpamCtrl.controlName,
            'Anti-Spam - ציון': `${effectiveSpamCtrl.score != null ? effectiveSpamCtrl.score : '?'}${effectiveSpamCtrl.maxScore != null ? '/' + effectiveSpamCtrl.maxScore : ''}`,
            'Anti-Spam - סטטוס': effectiveSpamCtrl.implementationStatus || 'לא ידוע',
            'Anti-Spam - מצב': spamImplemented ? 'תקין ✓' : 'דורש הגדרה ✗',
          } : {}),
          ...((!effectiveCtrl || !effectiveSpamCtrl) ? {
            'כל בקרות זמינות (email)': (score?.controlScores || []).filter(c => ['phish','spam','malware','attach','link','mail'].some(k => c.controlName?.toLowerCase().includes(k))).map(c => `${c.controlName}(${c.score}/${c.maxScore})`).join(' | ') || 'אין',
          } : {}),
        },
      };
    }

    case 'CIS-4.3.1': {
      const score = await getSecureScoreControls(token);
      if (!score) {
        return { status: 'warning', actual_value: 'לא ניתן לגשת ל-Secure Score', expected_value: 'ציון ≥ 60%', evidence: { 'הערה': 'ודא הרשאת SecurityEvents.Read.All' } };
      }
      const pct = Math.round((score.currentScore / score.maxScore) * 100);
      return {
        status: pct >= 60 ? 'passed' : pct >= 40 ? 'warning' : 'failed',
        actual_value: `${score.currentScore.toFixed(0)} / ${score.maxScore.toFixed(0)} points (${pct}%)`,
        //
        expected_value: 'ציון אבטחה ≥ 60%',
        evidence: {
          'ציון נוכחי': `${score.currentScore.toFixed(0)}`,
          'ציון מקסימלי': `${score.maxScore.toFixed(0)}`,
          'אחוז': `${pct}%`,
          'תאריך עדכון': score.createdDateTime ? new Date(score.createdDateTime).toLocaleDateString('he-IL') : 'לא ידוע',
          'מצב': pct >= 60 ? 'תקין ✓' : 'נדרש שיפור ✗',
        },
      };
    }

    case 'CIS-4.4.1': {
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'CustomerLockbox') || getControl(score, 'customerlockbox');
      const implemented = ctrl && (ctrl.score > 0 || ctrl.implementationStatus === 'Implemented');
      return {
        status: ctrl ? (implemented ? 'passed' : 'failed') : 'warning',
        actual_value: ctrl ? (implemented ? `${ctrl.controlName}: Implemented (score ${ctrl.score}/${ctrl.maxScore})` : `${ctrl.controlName}: Not Implemented`) : 'Not found in Secure Score',
        //
        expected_value: 'Customer Lockbox = Enabled',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score != null ? ctrl.score : '?'}${ctrl.maxScore != null ? '/' + ctrl.maxScore : ''}`,
          'סטטוס': ctrl.implementationStatus || 'לא ידוע',
          'מצב': implemented ? 'תקין ✓' : 'דורש הפעלה ✗',
        } : { 'הערה': 'M365 Admin Center > Settings > Org settings > Customer Lockbox' },
      };
    }

    // --- SECTION 5: SharePoint ---

    case 'CIS-5.1.1': {
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'SharePointExternalSharing') || getControl(score, 'externalsharing') || getControl(score, 'SharingPolicy');
      const implemented = ctrl && (ctrl.score > 0 || ctrl.implementationStatus === 'Implemented');
      return {
        status: ctrl ? (implemented ? 'passed' : 'failed') : 'warning',
        actual_value: ctrl ? (implemented ? `${ctrl.controlName}: Implemented (score ${ctrl.score}/${ctrl.maxScore})` : `${ctrl.controlName}: Not Implemented`) : 'Not found in Secure Score',
        //
        expected_value: 'External sharing = New and existing guests (לא "Anyone")',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score != null ? ctrl.score : '?'}${ctrl.maxScore != null ? '/' + ctrl.maxScore : ''}`,
          'סטטוס': ctrl.implementationStatus || 'לא ידוע',
          'מצב': implemented ? 'תקין ✓' : 'שיתוף "Anyone" פעיל ✗',
        } : { 'הערה': 'SharePoint Admin Center > Policies > Sharing' },
      };
    }

    case 'CIS-5.1.2': {
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'OneDriveSharing') || getControl(score, 'onedrivesharing');
      const implemented = ctrl && (ctrl.score > 0 || ctrl.implementationStatus === 'Implemented');
      return {
        status: ctrl ? (implemented ? 'passed' : 'failed') : 'warning',
        actual_value: ctrl ? (implemented ? `${ctrl.controlName}: Implemented (score ${ctrl.score}/${ctrl.maxScore})` : `${ctrl.controlName}: Not Implemented`) : 'Not found in Secure Score',
        //
        expected_value: 'OneDrive sharing ≤ New and existing guests',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score != null ? ctrl.score : '?'}${ctrl.maxScore != null ? '/' + ctrl.maxScore : ''}`,
          'סטטוס': ctrl.implementationStatus || 'לא ידוע',
          'מצב': implemented ? 'תקין ✓' : 'שיתוף OneDrive פתוח ✗',
        } : { 'הערה': 'SharePoint Admin Center > OneDrive > Sharing' },
      };
    }

    case 'CIS-5.2.1': {
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'SharePointLegacyAuth') || getControl(score, 'legacyauth') || getControl(score, 'LegacyProtocol');
      const implemented = ctrl && (ctrl.score > 0 || ctrl.implementationStatus === 'Implemented');
      return {
        status: ctrl ? (implemented ? 'passed' : 'failed') : 'warning',
        actual_value: ctrl ? (implemented ? `${ctrl.controlName}: Implemented (score ${ctrl.score}/${ctrl.maxScore})` : `${ctrl.controlName}: Not Implemented`) : 'Not found in Secure Score',
        //
        expected_value: 'LegacyAuthProtocolsEnabled = False',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score != null ? ctrl.score : '?'}${ctrl.maxScore != null ? '/' + ctrl.maxScore : ''}`,
          'סטטוס': ctrl.implementationStatus || 'לא ידוע',
          'מצב': implemented ? 'תקין ✓' : 'Legacy Auth פעיל ✗',
        } : { 'הערה': 'PowerShell: Set-SPOTenant -LegacyAuthProtocolsEnabled $false' },
      };
    }

    case 'CIS-5.3.1': {
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'OneDriveSyncDomain') || getControl(score, 'onedrivesyncdomain');
      const implemented = ctrl && (ctrl.score > 0 || ctrl.implementationStatus === 'Implemented');
      return {
        status: ctrl ? (implemented ? 'passed' : 'warning') : 'warning',
        actual_value: ctrl ? (implemented ? `${ctrl.controlName}: Implemented (score ${ctrl.score}/${ctrl.maxScore})` : `${ctrl.controlName}: Not Implemented`) : 'Not found in Secure Score',
        //
        expected_value: 'AllowedDomainGuids מוגדר ל-OneDrive Sync',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score != null ? ctrl.score : '?'}${ctrl.maxScore != null ? '/' + ctrl.maxScore : ''}`,
          'סטטוס': ctrl.implementationStatus || 'לא ידוע',
          'מצב': implemented ? 'תקין ✓' : 'ניתן לסנכרן מכל התקן ✗',
        } : { 'הערה': 'SharePoint Admin Center > Settings > Sync' },
      };
    }

    // --- SECTION 6: Teams ---

    case 'CIS-6.1.1': {
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'TeamsExternalAccess') || getControl(score, 'externalaccess');
      const implemented = ctrl && (ctrl.score > 0 || ctrl.implementationStatus === 'Implemented');
      return {
        status: ctrl ? (implemented ? 'passed' : 'failed') : 'warning',
        actual_value: ctrl ? (implemented ? `${ctrl.controlName}: Implemented (score ${ctrl.score}/${ctrl.maxScore})` : `${ctrl.controlName}: Not Implemented`) : 'Not found in Secure Score',
        //
        expected_value: 'External access restricted to specific allowed domains only',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score != null ? ctrl.score : '?'}${ctrl.maxScore != null ? '/' + ctrl.maxScore : ''}`,
          'סטטוס': ctrl.implementationStatus || 'לא ידוע',
          'מצב': implemented ? 'תקין ✓' : 'גישה מכל דומיין אפשרית ✗',
        } : { 'הערה': 'Teams Admin Center > Users > External access' },
      };
    }

    case 'CIS-6.1.2': {
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'TeamsGuestAccess') || getControl(score, 'guestaccess');
      const implemented = ctrl && (ctrl.score > 0 || ctrl.implementationStatus === 'Implemented');
      return {
        status: ctrl ? (implemented ? 'passed' : 'warning') : 'warning',
        actual_value: ctrl ? (implemented ? `${ctrl.controlName}: Implemented (score ${ctrl.score}/${ctrl.maxScore})` : `${ctrl.controlName}: Not Implemented`) : 'Not found in Secure Score',
        //
        expected_value: 'Guest access with limited permissions (no private calling)',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score != null ? ctrl.score : '?'}${ctrl.maxScore != null ? '/' + ctrl.maxScore : ''}`,
          'סטטוס': ctrl.implementationStatus || 'לא ידוע',
          'מצב': implemented ? 'תקין ✓' : 'הגדרות אורחים לא מאובטחות ✗',
        } : { 'הערה': 'Teams Admin Center > Users > Guest access' },
      };
    }

    case 'CIS-6.2.1': {
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'MeetingAnonymous') || getControl(score, 'anonymous') || getControl(score, 'AnonymousMeeting');
      const implemented = ctrl && (ctrl.score > 0 || ctrl.implementationStatus === 'Implemented');
      return {
        status: ctrl ? (implemented ? 'passed' : 'failed') : 'warning',
        actual_value: ctrl ? (implemented ? `${ctrl.controlName}: Implemented (score ${ctrl.score}/${ctrl.maxScore})` : `${ctrl.controlName}: Not Implemented`) : 'Not found in Secure Score',
        //
        expected_value: 'AllowAnonymousUsersToStartMeeting = False',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score != null ? ctrl.score : '?'}${ctrl.maxScore != null ? '/' + ctrl.maxScore : ''}`,
          'סטטוס': ctrl.implementationStatus || 'לא ידוע',
          'מצב': implemented ? 'תקין ✓' : 'פגישות פתוחות לאנונימיים ✗',
        } : { 'הערה': 'Teams Admin Center > Meetings > Meeting policies > Allow anonymous users to start meetings' },
      };
    }

    case 'CIS-6.3.1': {
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'MeetingRecording') || getControl(score, 'recording');
      const implemented = ctrl && (ctrl.score > 0 || ctrl.implementationStatus === 'Implemented');
      return {
        status: ctrl ? (implemented ? 'passed' : 'warning') : 'warning',
        actual_value: ctrl ? (implemented ? `${ctrl.controlName}: Implemented (score ${ctrl.score}/${ctrl.maxScore})` : `${ctrl.controlName}: Not Implemented`) : 'Not found in Secure Score',
        //
        expected_value: 'Recording storage = OneDrive (default in new Teams)',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score != null ? ctrl.score : '?'}${ctrl.maxScore != null ? '/' + ctrl.maxScore : ''}`,
          'סטטוס': ctrl.implementationStatus || 'לא ידוע',
          'מצב': implemented ? 'תקין ✓' : 'בדוק הגדרות ✗',
        } : { 'הערה': 'גרסאות Teams מודרניות שומרות ב-OneDrive אוטומטית' },
      };
    }

    // --- SECTION 7: Purview ---

    case 'CIS-7.1.1': {
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'AuditLogSearch') || getControl(score, 'auditlog') || getControl(score, 'UnifiedAuditLog');
      const implemented = ctrl && (ctrl.score > 0 || ctrl.implementationStatus === 'Implemented');
      return {
        status: ctrl ? (implemented ? 'passed' : 'failed') : 'warning',
        actual_value: ctrl ? (implemented ? `${ctrl.controlName}: Implemented (score ${ctrl.score}/${ctrl.maxScore})` : `${ctrl.controlName}: Not Implemented`) : 'Not found in Secure Score',
        //
        expected_value: 'Unified Audit Log enabled in Microsoft Purview',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score != null ? ctrl.score : '?'}${ctrl.maxScore != null ? '/' + ctrl.maxScore : ''}`,
          'סטטוס': ctrl.implementationStatus || 'לא ידוע',
          'מצב': implemented ? 'תקין ✓' : 'יומן ביקורת לא פעיל ✗',
        } : { 'הערה': 'Microsoft Purview > Audit > Start recording user and admin activity' },
      };
    }

    case 'CIS-7.2.1': {
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'DLPPolicy') || getControl(score, 'dlp') || getControl(score, 'DataLossPrevention');
      const implemented = ctrl && (ctrl.score > 0 || ctrl.implementationStatus === 'Implemented');
      return {
        status: ctrl ? (implemented ? 'passed' : 'failed') : 'warning',
        actual_value: ctrl ? (implemented ? `${ctrl.controlName}: Implemented (score ${ctrl.score}/${ctrl.maxScore})` : `${ctrl.controlName}: Not Implemented`) : 'Not found in Secure Score',
        //
        expected_value: 'לפחות מדיניות DLP פעילה אחת ב-Exchange, SharePoint, Teams',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score != null ? ctrl.score : '?'}${ctrl.maxScore != null ? '/' + ctrl.maxScore : ''}`,
          'סטטוס': ctrl.implementationStatus || 'לא ידוע',
          'מצב': implemented ? 'תקין ✓' : 'אין הגנת DLP ✗',
        } : { 'הערה': 'Microsoft Purview > Data loss prevention > Policies' },
      };
    }

    case 'CIS-7.3.1': {
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'SensitivityLabel') || getControl(score, 'sensitivitylabel') || getControl(score, 'InformationProtection');
      const implemented = ctrl && (ctrl.score > 0 || ctrl.implementationStatus === 'Implemented');
      return {
        status: ctrl ? (implemented ? 'passed' : 'failed') : 'warning',
        actual_value: ctrl ? (implemented ? `${ctrl.controlName}: Implemented (score ${ctrl.score}/${ctrl.maxScore})` : `${ctrl.controlName}: Not Implemented`) : 'Not found in Secure Score',
        //
        expected_value: 'Sensitivity labels created and published to users',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score != null ? ctrl.score : '?'}${ctrl.maxScore != null ? '/' + ctrl.maxScore : ''}`,
          'סטטוס': ctrl.implementationStatus || 'לא ידוע',
          'מצב': implemented ? 'תקין ✓' : 'אין תוויות סיווג ✗',
        } : { 'הערה': 'Microsoft Purview > Information protection > Labels' },
      };
    }

    // --- M365 Admin Center ---
    case 'CIS-M365-1.1.4': {
      const roles11 = await graphGet(token, "/directoryRoles?$filter=roleTemplateId eq '62e90394-69f5-4237-9190-012177145e10'");
      if (!roles11.value?.length) return { status: 'not_applicable', actual_value: 'No Global Admins found', expected_value: 'Admin accounts with minimal licenses', evidence: {} };
      const members11 = await graphGet(token, `/directoryRoles/${roles11.value[0].id}/members?$select=displayName,userPrincipalName,id`);
      const admins11 = members11.value || [];
      const withHighFootprint = [];
      for (const admin of admins11.slice(0, 8)) {
        const lic = await graphGet(token, `/users/${admin.id}/licenseDetails?$select=skuPartNumber`).catch(() => ({ value: [] }));
        const skus = (lic.value || []).map(l => l.skuPartNumber);
        if (skus.some(s => ['SPE_E3','SPE_E5','ENTERPRISEPACK','ENTERPRISEPREMIUM','SPB'].some(p => s.includes(p)))) withHighFootprint.push(admin.displayName || admin.userPrincipalName);
      }
      return { status: withHighFootprint.length === 0 ? 'passed' : 'warning', actual_value: withHighFootprint.length === 0 ? 'Admin accounts appear to use minimal licenses' : `${withHighFootprint.length} admin(s) with E3/E5 licenses`, expected_value: 'Admin accounts should not have E3/E5 licenses', evidence: { 'מנהלים שנבדקו': admins11.length, 'עם E3/E5': withHighFootprint.join(', ') || 'אין', 'מצב': withHighFootprint.length === 0 ? 'תקין ✓' : 'בדוק ✗' } };
    }

    case 'CIS-M365-1.2.1': {
      const groups121 = await graphGet(token, "/groups?$filter=visibility eq 'Public' and groupTypes/any(c:c eq 'Unified')&$select=displayName,visibility&$top=50");
      const publicGroups = groups121.value || [];
      return { status: publicGroups.length === 0 ? 'passed' : 'warning', actual_value: `${publicGroups.length} public Microsoft 365 Groups found`, expected_value: 'No unmanaged public M365 Groups', evidence: { 'קבוצות ציבוריות': publicGroups.length, 'שמות': publicGroups.slice(0,10).map(g => g.displayName).join(', ') || 'אין', 'מצב': publicGroups.length === 0 ? 'תקין ✓' : 'בדוק קבוצות ✗' } };
    }

    case 'CIS-M365-1.2.2': {
      const unlicensed = await graphGet(token, "/users?$select=displayName,userPrincipalName,accountEnabled,assignedLicenses&$top=100").catch(() => ({ value: [] }));
      const shared = (unlicensed.value || []).filter(u => (!u.assignedLicenses || u.assignedLicenses.length === 0) && u.accountEnabled === true);
      return { status: shared.length === 0 ? 'passed' : 'failed', actual_value: shared.length === 0 ? 'All unlicensed accounts have sign-in disabled' : `${shared.length} unlicensed account(s) with sign-in enabled`, expected_value: 'Shared mailboxes: accountEnabled = false', evidence: { 'חשבונות ללא רישיון עם כניסה פעילה': shared.length, 'דוגמאות': shared.slice(0,5).map(u => u.userPrincipalName).join(', ') || 'אין', 'מצב': shared.length === 0 ? 'תקין ✓' : 'דורש תיקון ✗' } };
    }

    case 'CIS-M365-1.3.2': {
      const policies132 = await graphGet(token, '/policies/activityBasedTimeoutPolicies').catch(() => ({ value: [] }));
      const policyList = policies132.value || [];
      if (policyList.length === 0) return { status: 'failed', actual_value: 'No activity-based timeout policy configured', expected_value: 'Idle session timeout ≤ 3 hours', evidence: { 'מצב': 'לא מוגדר ✗' } };
      const hasShortTimeout = policyList.some(p => { try { const def = JSON.parse(p.definition?.[0] || '{}'); const timeout = def.ActivityBasedAuthenticationTimeoutPolicy?.WebSessionIdleTimeout || ''; const m = timeout.match(/PT(\d+)H/); return m && parseInt(m[1]) <= 3; } catch { return false; } });
      return { status: hasShortTimeout ? 'passed' : 'warning', actual_value: hasShortTimeout ? 'Idle session timeout ≤ 3h configured' : 'Policy exists but timeout may be > 3h', expected_value: 'Idle session timeout ≤ 3 hours', evidence: { 'מדיניות קיימת': policyList.length, 'מצב': hasShortTimeout ? 'תקין ✓' : 'בדוק ידנית ✗' } };
    }

    case 'CIS-M365-1.3.3': {
      const orgId133 = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      const orgCfg133 = orgId133 && _exToken ? await exchangeGet(orgId133, 'Organization') : null;
      const orgD133 = orgCfg133?.value?.[0] || orgCfg133;
      if (orgD133?.ExternalCalendarSharingEnabled !== undefined) {
        const allowed = orgD133.ExternalCalendarSharingEnabled;
        return { status: !allowed ? 'passed' : 'failed', actual_value: `ExternalCalendarSharingEnabled: ${allowed}`, expected_value: 'false', evidence: { 'שיתוף לוח שנה חיצוני': allowed, 'מצב': !allowed ? 'תקין ✓' : 'יש להשבית ✗' } };
      }
      return { status: 'manual', actual_value: 'Cannot verify via Exchange API', expected_value: 'External calendar sharing = disabled', evidence: { 'הערה': 'Exchange Admin Center → Organization → Sharing → Disable external calendar sharing' } };
    }

    case 'CIS-M365-1.3.4': {
      const apps134 = await graphGet(token, '/admin/appsAndServices', 'beta').catch(() => null);
      if (apps134?.settings) {
        const storeEnabled = apps134.settings.isOfficeStoreEnabled;
        const trialEnabled = apps134.settings.isAppAndServicesTrialEnabled;
        return { status: !storeEnabled && !trialEnabled ? 'passed' : 'failed', actual_value: `isOfficeStoreEnabled: ${storeEnabled}, trial: ${trialEnabled}`, expected_value: 'Both = false', evidence: { 'Office Store': storeEnabled, 'Trial': trialEnabled, 'מצב': !storeEnabled && !trialEnabled ? 'תקין ✓' : 'משתמשים יכולים להתקין אפליקציות ✗' } };
      }
      return { status: 'manual', actual_value: 'Add OrgSettings-AppsAndServices.Read.All permission', expected_value: 'isOfficeStoreEnabled = false', evidence: { 'הוסף הרשאה': 'OrgSettings-AppsAndServices.Read.All' } };
    }

    case 'CIS-M365-1.3.5': {
      const forms135 = await graphGet(token, '/admin/forms', 'beta').catch(() => null);
      if (forms135?.isInOrgFormsPhishingScanEnabled !== undefined) {
        const en = forms135.isInOrgFormsPhishingScanEnabled;
        return { status: en ? 'passed' : 'failed', actual_value: `isInOrgFormsPhishingScanEnabled: ${en}`, expected_value: 'true', evidence: { 'הגנת פישינג': en, 'מצב': en ? 'תקין ✓' : 'הפעל ✗' } };
      }
      return { status: 'manual', actual_value: 'Add OrgSettings-Forms.Read.All permission', expected_value: 'isInOrgFormsPhishingScanEnabled = true', evidence: { 'הוסף הרשאה': 'OrgSettings-Forms.Read.All' } };
    }

    case 'CIS-M365-1.3.7': {
      const sp137 = await graphGet(token, "/servicePrincipals?$filter=appId eq 'c1f33bc0-bdb4-4248-ba9b-096807ddb43e'&$select=displayName,accountEnabled").catch(() => null);
      if (sp137?.value !== undefined) {
        if (sp137.value.length === 0) return { status: 'passed', actual_value: 'Third-party storage SP absent (disabled)', expected_value: 'SP disabled or absent', evidence: { 'מצב': 'תקין ✓' } };
        const en = sp137.value[0].accountEnabled;
        return { status: !en ? 'passed' : 'failed', actual_value: `accountEnabled: ${en}`, expected_value: 'false', evidence: { 'SP פעיל': en, 'מצב': !en ? 'תקין ✓' : 'אחסון צד שלישי פעיל ✗' } };
      }
      return { status: 'manual', actual_value: 'Cannot query service principals', expected_value: 'Third-party storage SP disabled', evidence: { 'הערה': 'M365 Admin Center → Settings → Org settings → Microsoft 365 on the web' } };
    }

    case 'CIS-M365-1.3.9': {
      const bk = await graphGet(token, '/admin/bookings', 'beta').catch(() => null);
      if (bk) { const en = bk.isBookingsEnabled ?? bk.bookingsEnabled; if (en !== undefined) return { status: !en ? 'passed' : 'warning', actual_value: `Bookings enabled: ${en}`, expected_value: 'Bookings restricted', evidence: { 'Bookings': en, 'מצב': !en ? 'תקין ✓' : 'בדוק הגבלות ✗' } }; }
      return { status: 'manual', actual_value: 'Cannot access Bookings via Graph API', expected_value: 'Bookings pages restricted', evidence: { 'הערה': 'M365 Admin Center → Settings → Org settings → Bookings' } };
    }

    // --- Defender Email Security ---
    case 'CIS-2.1.5': case 'CIS-2.1.6': case 'CIS-2.1.11': case 'CIS-2.1.12': case 'CIS-2.1.13': case 'CIS-2.1.14': case 'CIS-2.1.15': case 'CIS-2.4.1': case 'CIS-2.4.2': case 'CIS-2.4.4': case 'CIS-3.2.2': {
      const scoreD = await getSecureScoreControls(token);
      const kwMapD = { 'CIS-2.1.5': ['SafeAttachmentSPO','safeattachspo'], 'CIS-2.1.6': ['OutboundSpam','spamoutbound'], 'CIS-2.1.11': ['AttachmentFilter','CommonAttachment'], 'CIS-2.1.12': ['IPAllowList','ipallow'], 'CIS-2.1.13': ['SafeList','safelist'], 'CIS-2.1.14': ['AllowedDomains','alloweddomain'], 'CIS-2.1.15': ['MessageLimit','OutboundLimit'], 'CIS-2.4.1': ['PriorityAccount','priorityaccount'], 'CIS-2.4.2': ['StrictPreset','strictprotection'], 'CIS-2.4.4': ['ZAPTeams','zapteams'], 'CIS-3.2.2': ['DLPTeams','dlpteams'] };
      const noteD = { 'CIS-2.1.5': 'Defender → Safe Attachments → Global settings', 'CIS-2.1.6': 'Defender → Anti-spam outbound → Notifications', 'CIS-2.1.11': 'Defender → Anti-malware → Common attachment filter', 'CIS-2.1.12': 'Defender → Connection filter → IP Allow List: empty', 'CIS-2.1.13': 'Defender → Connection filter → Safe list: Off', 'CIS-2.1.14': 'Defender → Anti-spam → Allowed sender domains: empty', 'CIS-2.1.15': 'Defender → Anti-spam outbound → Message limits', 'CIS-2.4.1': 'Defender → Settings → User tags → Priority account', 'CIS-2.4.2': 'Defender → Preset security policies → Strict', 'CIS-2.4.4': 'Defender → Safe Attachments → ZAP for Teams', 'CIS-3.2.2': 'Purview → DLP → Policies → Teams location' };
      const kws = kwMapD[checkId] || [];
      let ctrlD = null; for (const kw of kws) { ctrlD = getControl(scoreD, kw); if (ctrlD) break; }
      if (ctrlD) { const impl = ctrlD.score > 0; return { status: impl ? 'passed' : 'failed', actual_value: `${ctrlD.controlName}: ${ctrlD.score}/${ctrlD.maxScore}`, expected_value: 'Implemented', evidence: { 'ציון': `${ctrlD.score}/${ctrlD.maxScore}`, 'מצב': impl ? 'תקין ✓' : 'הגדר ✗' } }; }
      return { status: 'warning', actual_value: 'Not found in Secure Score', expected_value: 'Implemented', evidence: { 'הערה': noteD[checkId] || 'בדוק בפורטל' } };
    }

    // --- Intune ---
    case 'CIS-4.1': {
      let settings41 = null;
      let err41 = null;
      try {
        settings41 = await graphGet(token, '/deviceManagement/settings');
      } catch (e) {
        try {
          settings41 = await graphGet(token, '/deviceManagement/settings', 'beta');
        } catch (e2) {
          err41 = e2.message || e.message;
        }
      }
      if (!settings41) return { status: 'warning', actual_value: `Cannot access Intune settings: ${err41}`, expected_value: 'secureByDefault = true', evidence: { 'הרשאה נדרשת': 'DeviceManagementConfiguration.Read.All', 'שגיאה': err41 } };
      const secureByDefault = settings41.secureByDefault;
      return {
        status: secureByDefault === true ? 'passed' : 'failed',
        actual_value: `secureByDefault: ${secureByDefault}`,
        expected_value: 'secureByDefault = true',
        evidence: {
          'secureByDefault': secureByDefault,
          'משמעות': secureByDefault ? 'מכשירים ללא policy = Not Compliant ✓' : 'מכשירים ללא policy = Compliant ✗',
          'תיקון': 'Intune admin center → Devices → Compliance → Compliance policy settings → Mark devices with no compliance policy as: Not compliant',
        },
      };
    }

    case 'CIS-4.2': {
      const enroll = await graphGet(token, '/deviceManagement/deviceEnrollmentConfigurations?$select=displayName,deviceEnrollmentConfigurationType&$top=20').catch(() => ({ value: [] }));
      const restrictions = (enroll.value || []).filter(c => c.deviceEnrollmentConfigurationType === 'limit' || c.deviceEnrollmentConfigurationType === 'platformRestrictions');
      return { status: restrictions.length > 0 ? 'warning' : 'failed', actual_value: `${restrictions.length} enrollment restriction(s) found`, expected_value: 'Personally owned devices blocked', evidence: { 'הגדרות': restrictions.map(r => r.displayName).join(', ') || 'אין', 'הערה': 'Intune → Devices → Enrollment → Block personally owned' } };
    }

    // --- Entra ID Extended ---
    case 'CIS-5.1.2.1': {
      const ud = await graphGet(token, "/users?$select=id,userPrincipalName,userType&$filter=userType eq 'Member'&$top=30").catch(() => null);
      if (!ud?.value) return { status: 'manual', actual_value: 'Cannot query users', expected_value: 'Per-user MFA disabled for all', evidence: { 'הערה': 'Entra admin center → Users → Multi-Factor Authentication (legacy)' } };
      const withMfa = [];
      for (const u of ud.value.slice(0, 20)) {
        const req = await graphGet(token, `/users/${u.id}/authentication/requirements`, 'beta').catch(() => null);
        if (req?.perUserMfaState && req.perUserMfaState !== 'disabled') withMfa.push(`${u.userPrincipalName}(${req.perUserMfaState})`);
      }
      return { status: withMfa.length === 0 ? 'passed' : 'failed', actual_value: `${withMfa.length} user(s) with per-user MFA enabled/enforced`, expected_value: 'All users perUserMfaState = disabled', evidence: { 'משתמשים': withMfa.length, 'דוגמאות': withMfa.slice(0,5).join(', ') || 'אין', 'מצב': withMfa.length === 0 ? 'תקין ✓' : 'כבה per-user MFA ✗' } };
    }

    case 'CIS-5.1.2.2': { const p = await graphGet(token, '/policies/authorizationPolicy?$select=defaultUserRolePermissions'); const v = p?.defaultUserRolePermissions?.allowedToCreateApps; return { status: v === false ? 'passed' : 'failed', actual_value: `allowedToCreateApps: ${v}`, expected_value: 'false', evidence: { 'הגדרה': v, 'מצב': v === false ? 'תקין ✓' : 'משתמשים יכולים לאשר אפליקציות ✗' } }; }
    case 'CIS-5.1.2.3': { const p = await graphGet(token, '/policies/authorizationPolicy?$select=allowedToCreateTenants'); const v = p?.allowedToCreateTenants; return { status: v === false ? 'passed' : 'failed', actual_value: `allowedToCreateTenants: ${v}`, expected_value: 'false', evidence: { 'הגדרה': v, 'מצב': v === false ? 'תקין ✓' : 'משתמשים יכולים ליצור Tenants ✗' } }; }
    case 'CIS-5.1.2.4': return { status: 'manual', actual_value: 'Cannot verify Entra admin center restriction via Graph API', expected_value: 'Restrict access to Entra admin center = Yes', evidence: { 'הערה': 'Entra admin center → Users → User settings → Restrict access to Microsoft Entra admin center: Yes' } };
    case 'CIS-5.1.2.5': return { status: 'manual', actual_value: 'Cannot verify Sign-in branding via Graph API', expected_value: 'Show option to remain signed in = No', evidence: { 'הערה': 'Entra admin center → Identity → Company branding → Sign-in page → Stay signed in: Off' } };
    case 'CIS-5.1.2.6': {
      const pLi = await graphGet(token, '/policies/authorizationPolicy', 'beta').catch(() => null);
      const linkedin = pLi?.linkedInConfiguration;
      if (linkedin !== undefined) {
        const isDisabled = linkedin === null || linkedin?.isEnabled === false || linkedin?.allowedGroups?.length === 0;
        return { status: isDisabled ? 'passed' : 'failed', actual_value: `linkedInConfiguration: ${JSON.stringify(linkedin)}`, expected_value: 'isEnabled = false', evidence: { 'LinkedIn Config': JSON.stringify(linkedin), 'מצב': isDisabled ? 'תקין ✓' : 'LinkedIn פעיל ✗' } };
      }
      return { status: 'manual', actual_value: 'Cannot check LinkedIn connections via Graph API', expected_value: 'LinkedIn account connections = No', evidence: { 'הערה': 'Entra admin center → Identity → Users → User settings → LinkedIn: No' } };
    }

    case 'CIS-5.1.3.1': {
      const dg = await graphGet(token, "/groups?$filter=groupTypes/any(c:c eq 'DynamicMembership')&$select=displayName,membershipRule&$top=50");
      const guestGroups = (dg.value || []).filter(g => g.membershipRule?.toLowerCase().includes('guest'));
      return { status: guestGroups.length > 0 ? 'passed' : 'failed', actual_value: guestGroups.length > 0 ? `${guestGroups.length} dynamic guest group(s) found` : 'No dynamic guest group', expected_value: 'Dynamic group: user.userType -eq "Guest"', evidence: { 'קבוצות': guestGroups.map(g => g.displayName).join(', ') || 'אין', 'מצב': guestGroups.length > 0 ? 'תקין ✓' : 'צור קבוצה דינמית לאורחים ✗' } };
    }

    case 'CIS-5.1.3.2': { const p = await graphGet(token, '/policies/authorizationPolicy?$select=defaultUserRolePermissions'); const v = p?.defaultUserRolePermissions?.allowedToCreateSecurityGroups; return { status: v === false ? 'passed' : 'failed', actual_value: `allowedToCreateSecurityGroups: ${v}`, expected_value: 'false', evidence: { 'הגדרה': v, 'מצב': v === false ? 'תקין ✓' : 'משתמשים יכולים ליצור קבוצות אבטחה ✗' } }; }

    case 'CIS-5.1.4.1': { const p = await graphGet(token, '/policies/deviceRegistrationPolicy').catch(() => null); if (!p) return { status: 'warning', actual_value: 'Cannot access device registration policy', expected_value: 'Device join restricted', evidence: {} }; const s = p.azureADJoin?.allowedToJoin?.setting || 'all'; return { status: s !== 'all' ? 'passed' : 'failed', actual_value: `azureADJoin.allowedToJoin: ${s}`, expected_value: 'selected or none', evidence: { 'הגדרה': s, 'מצב': s !== 'all' ? 'תקין ✓' : 'כל משתמש יכול לצרף מכשיר ✗' } }; }
    case 'CIS-5.1.4.2': { const p = await graphGet(token, '/policies/deviceRegistrationPolicy').catch(() => null); const q = p?.userDeviceQuota; return { status: q != null && q <= 5 ? 'passed' : 'failed', actual_value: `userDeviceQuota: ${q ?? 'Unlimited'}`, expected_value: '≤ 5', evidence: { 'מכסה': q ?? 'Unlimited', 'מצב': q != null && q <= 5 ? 'תקין ✓' : 'הגדר מגבלה ✗' } }; }
    case 'CIS-5.1.4.3': {
      const p543 = await graphGet(token, '/policies/deviceRegistrationPolicy').catch(() => null);
      if (!p543) return { status: 'warning', actual_value: 'Cannot access device registration policy', expected_value: 'GA not auto local admin', evidence: {} };
      const joinCfg = p543.azureADJoin || {};
      // Check if Global Administrators are auto-added as local admins
      const gaLocalAdmin = joinCfg.localAdminsEnablement?.mode ?? joinCfg.enableGlobalAdmins ?? joinCfg.localAdmins?.enableGlobalAdmins;
      if (gaLocalAdmin !== undefined) {
        const isEnabled = gaLocalAdmin === true || gaLocalAdmin === 'enabled' || gaLocalAdmin === 'all';
        return { status: !isEnabled ? 'passed' : 'failed', actual_value: `GA localAdmin: ${gaLocalAdmin}`, expected_value: 'GA not auto local admin on join', evidence: { 'GA כמנהל מקומי': isEnabled, 'ערך': gaLocalAdmin, 'מצב': !isEnabled ? 'תקין ✓' : 'GA נוסף אוטומטית כמנהל מקומי ✗' } };
      }
      return { status: 'manual', actual_value: `Policy accessible. azureADJoin: ${JSON.stringify(joinCfg).substring(0,300)}`, expected_value: 'Global Administrator not auto local admin', evidence: { 'הערה': 'Entra admin center → Devices → Device settings → Additional local administrators' } };
    }
    case 'CIS-5.1.4.4': {
      const p544 = await graphGet(token, '/policies/deviceRegistrationPolicy').catch(() => null);
      if (!p544) return { status: 'warning', actual_value: 'Cannot access device registration policy', expected_value: 'Registering user not local admin', evidence: {} };
      const joinCfg2 = p544.azureADJoin || {};
      const regUserAdmin = joinCfg2.isDeviceAdministratorEnabled ?? joinCfg2.registeringUserAsLocalAdministratorEnabled ?? joinCfg2.localAdmins?.enableDeviceOwners;
      if (regUserAdmin !== undefined) {
        return { status: regUserAdmin === false ? 'passed' : 'failed', actual_value: `registeringUserAsLocalAdmin: ${regUserAdmin}`, expected_value: 'false', evidence: { 'משתמש רושם כמנהל': regUserAdmin, 'מצב': regUserAdmin === false ? 'תקין ✓' : 'משתמש הרושם הוא מנהל מקומי ✗' } };
      }
      return { status: 'manual', actual_value: `Policy accessible. azureADJoin: ${JSON.stringify(joinCfg2).substring(0,300)}`, expected_value: 'Registering user not local admin', evidence: { 'הערה': 'Entra admin center → Devices → Device settings → Registering user is an administrator: Off' } };
    }
    case 'CIS-5.1.4.5': { const p = await graphGet(token, '/policies/deviceRegistrationPolicy').catch(() => null); const en = p?.localAdminPassword?.isEnabled; return { status: en === true ? 'passed' : 'failed', actual_value: `LAPS isEnabled: ${en}`, expected_value: 'true', evidence: { 'LAPS': en, 'מצב': en ? 'תקין ✓' : 'הפעל LAPS ✗' } }; }
    case 'CIS-5.1.4.6': { const p = await graphGet(token, '/policies/deviceRegistrationPolicy').catch(() => null); const s = p?.selfServiceBitLockerEnabled; return { status: s === false ? 'passed' : 'warning', actual_value: `selfServiceBitLockerEnabled: ${s}`, expected_value: 'false', evidence: { 'ערך': s, 'הערה': 'Entra admin center → Devices → Device settings → Users can view BitLocker keys: No' } }; }

    case 'CIS-5.1.5.1': { const p = await graphGet(token, '/policies/authorizationPolicy?$select=defaultUserRolePermissions'); const perms = p?.defaultUserRolePermissions?.permissionGrantPoliciesAssigned || []; const hasConsent = perms.some(x => typeof x === 'string' && (x.includes('ManagePermissionGrantsForSelf') || x.includes('microsoft-user-default-legacy'))); return { status: !hasConsent ? 'passed' : 'failed', actual_value: `permissionGrantPolicies: [${perms.join(', ')}]`, expected_value: 'No user consent policy', evidence: { 'מדיניות': perms.join(', ') || 'ריק', 'מצב': !hasConsent ? 'תקין ✓' : 'משתמשים יכולים לאשר אפליקציות ✗' } }; }
    case 'CIS-5.1.5.2': { const p = await graphGet(token, '/policies/adminConsentRequestPolicy').catch(() => null); const en = p?.isEnabled; return { status: en === true ? 'passed' : 'failed', actual_value: `adminConsentWorkflow isEnabled: ${en}`, expected_value: 'true', evidence: { 'מופעל': en, 'מצב': en ? 'תקין ✓' : 'הפעל Admin consent workflow ✗' } }; }
    case 'CIS-5.1.6.1': { const p = await graphGet(token, '/policies/authorizationPolicy?$select=allowInvitesFrom'); const v = p?.allowInvitesFrom || 'everyone'; return { status: v !== 'everyone' && v !== 'everyoneWithVerifiedEmail' ? 'passed' : 'failed', actual_value: `allowInvitesFrom: ${v}`, expected_value: '!= everyone', evidence: { 'הגדרה': v, 'מצב': v !== 'everyone' && v !== 'everyoneWithVerifiedEmail' ? 'תקין ✓' : 'כל אחד יכול להזמין אורחים ✗' } }; }
    case 'CIS-5.1.6.2': { const p516 = await graphGet(token, '/policies/authorizationPolicy?$select=guestUserRoleId'); const v516 = p516?.guestUserRoleId; const ok516 = v516 === '10dae51f-b6af-4016-8d66-8c2a99b929b3' || v516 === 'bf6b6499-e8a3-423a-b71b-b3a194b5d56a'; return { status: ok516 ? 'passed' : 'failed', actual_value: `guestUserRoleId: ${v516}`, expected_value: 'Most restrictive guest role', evidence: { 'guestUserRoleId': v516, 'מצב': ok516 ? 'תקין ✓' : 'אורחים יכולים למנות ספריית ארגון ✗' } }; }
    case 'CIS-5.1.6.3': { const p = await graphGet(token, '/policies/authorizationPolicy?$select=allowInvitesFrom'); const v = p?.allowInvitesFrom || 'everyone'; return { status: ['admins','adminsAndGuestInviters'].includes(v) ? 'passed' : 'failed', actual_value: `allowInvitesFrom: ${v}`, expected_value: 'admins or adminsAndGuestInviters', evidence: { 'הגדרה': v, 'מצב': ['admins','adminsAndGuestInviters'].includes(v) ? 'תקין ✓' : 'כל עובד יכול להזמין אורחים ✗' } }; }

    case 'CIS-5.1.8.1': { const org = await graphGet(token, '/organization?$select=onPremisesSyncEnabled,onPremisesLastSyncDateTime'); const d = org.value?.[0] || {}; if (!d.onPremisesSyncEnabled) return { status: 'not_applicable', actual_value: 'Cloud-only', expected_value: 'N/A', evidence: {} }; const recent = d.onPremisesLastSyncDateTime && (new Date() - new Date(d.onPremisesLastSyncDateTime)) < 3 * 60 * 60 * 1000; return { status: recent ? 'passed' : 'warning', actual_value: `PHS last sync: ${d.onPremisesLastSyncDateTime || 'unknown'}`, expected_value: 'PHS sync recent', evidence: { 'סנכרון אחרון': d.onPremisesLastSyncDateTime || 'לא ידוע', 'מצב': recent ? 'תקין ✓' : 'סנכרון ישן ✗' } }; }

    // --- ID Protection (CA checks) ---
    case 'CIS-5.2.2.1': case 'CIS-5.2.2.2': case 'CIS-5.2.2.3': case 'CIS-5.2.2.4': case 'CIS-5.2.2.5': case 'CIS-5.2.2.6': case 'CIS-5.2.2.7': case 'CIS-5.2.2.8': case 'CIS-5.2.2.9': case 'CIS-5.2.2.10': case 'CIS-5.2.2.11': case 'CIS-5.2.2.12': {
      const caData = await graphGet(token, '/identity/conditionalAccess/policies');
      const enabled = (caData.value || []).filter(p => p.state === 'enabled');
      const checkMap = {
        'CIS-5.2.2.1': { label: 'MFA for admin roles', fn: p => hasMfaControl(p) && p.conditions?.users?.includeRoles?.length > 0 },
        'CIS-5.2.2.2': { label: 'MFA for all users', fn: p => includesAllUsers(p) && hasMfaControl(p) },
        'CIS-5.2.2.3': { label: 'Block legacy auth', fn: p => p.grantControls?.builtInControls?.includes('block') && p.conditions?.clientAppTypes?.some(t => ['exchangeActiveSync','other'].includes(t)) },
        'CIS-5.2.2.4': { label: 'Admin session controls', fn: p => p.conditions?.users?.includeRoles?.length > 0 && (p.sessionControls?.signInFrequency?.isEnabled || p.sessionControls?.persistentBrowser?.isEnabled) },
        'CIS-5.2.2.5': { label: 'Phishing-resistant MFA for admins', fn: p => p.conditions?.users?.includeRoles?.length > 0 && p.grantControls?.authenticationStrength?.displayName?.toLowerCase().includes('phish') },
        'CIS-5.2.2.6': { label: 'User risk policy', fn: p => p.conditions?.userRiskLevels?.some(r => ['high','medium'].includes(r)) && (p.grantControls?.builtInControls?.includes('block') || p.grantControls?.builtInControls?.includes('passwordChange')) },
        'CIS-5.2.2.7': { label: 'Sign-in risk policy', fn: p => p.conditions?.signInRiskLevels?.some(r => ['high','medium'].includes(r)) && (p.grantControls?.builtInControls?.includes('block') || hasMfaControl(p)) },
        'CIS-5.2.2.8': { label: 'Med/High risk blocked', fn: p => p.conditions?.signInRiskLevels?.includes('high') && p.grantControls?.builtInControls?.includes('block') },
        'CIS-5.2.2.9': { label: 'Managed device required', fn: p => p.grantControls?.builtInControls?.includes('compliantDevice') || p.grantControls?.builtInControls?.includes('domainJoinedDevice') },
        'CIS-5.2.2.10': { label: 'Security info reg on managed device', fn: p => p.conditions?.applications?.includeUserActions?.includes('urn:user:registersecurityinfo') && (p.grantControls?.builtInControls?.includes('compliantDevice') || p.grantControls?.builtInControls?.includes('domainJoinedDevice')) },
        'CIS-5.2.2.11': { label: 'Intune enrollment re-auth', fn: p => p.conditions?.applications?.includeApplications?.some(a => a === 'd4ebce55-015a-49b5-a083-c84d1797ae8c') && p.sessionControls?.signInFrequency?.type === 'everyTime' },
        'CIS-5.2.2.12': { label: 'Block device code flow', fn: p => p.conditions?.authenticationFlows?.transferMethods?.includes('deviceCodeFlow') && p.grantControls?.builtInControls?.includes('block') },
      };
      const { label, fn } = checkMap[checkId];
      const matching = enabled.filter(fn);
      return { status: matching.length > 0 ? 'passed' : (checkId.includes('5') ? 'warning' : 'failed'), actual_value: `${matching.length} CA policy(ies): ${label}`, expected_value: `At least 1 CA policy for: ${label}`, evidence: { 'מדיניות': matching.map(p => p.displayName).join(', ') || 'אין', 'מצב': matching.length > 0 ? 'תקין ✓' : 'חסר ✗' } };
    }

    // --- Auth Methods ---
    case 'CIS-5.2.3.1': {
      const policy = await graphGet(token, '/policies/authenticationMethodsPolicy');
      const authConfig = (policy.authenticationMethodConfigurations || []).find(m => m.id === 'MicrosoftAuthenticator');
      if (!authConfig) return { status: 'warning', actual_value: 'Microsoft Authenticator config not found', expected_value: 'Number matching + additional context enabled', evidence: {} };
      const numMatch = authConfig.featureSettings?.numberMatchingRequiredState?.state || 'default';
      const addCtx = authConfig.featureSettings?.displayAppInformationRequiredState?.state || 'default';
      return { status: numMatch === 'enabled' && addCtx === 'enabled' ? 'passed' : 'failed', actual_value: `numberMatching: ${numMatch}, additionalContext: ${addCtx}`, expected_value: 'Both = enabled', evidence: { 'Number Matching': numMatch, 'Additional Context': addCtx, 'מצב': numMatch === 'enabled' && addCtx === 'enabled' ? 'תקין ✓' : 'הפעל Anti-fatigue features ✗' } };
    }
    case 'CIS-5.2.3.2': {
      const betaSettings = await graphGet(token, '/settings', 'beta').catch(() => null);
      const pwdSetting = (betaSettings?.value || []).find(s =>
        s.displayName === 'Password Rule Settings' || s.templateId === '5cf42378-d67d-4f36-ba46-e8b86229381d'
      );
      if (pwdSetting?.values) {
        const getVal = (n) => pwdSetting.values.find(v => v.name === n)?.value;
        const enabled = getVal('EnableBannedPasswordList') === 'true';
        const list = getVal('BannedPasswordList') || '';
        const hasList = list.trim().length > 0;
        return { status: enabled && hasList ? 'passed' : 'failed', actual_value: `EnableBannedPasswordList: ${enabled}, hasCustomList: ${hasList}`, expected_value: 'Enabled + custom list', evidence: { 'Banned List': enabled, 'רשימה מותאמת': hasList, 'מצב': enabled && hasList ? 'תקין ✓' : 'הגדר רשימת סיסמאות אסורות ✗' } };
      }
      return { status: 'manual', actual_value: 'Password protection settings not found via Graph API', expected_value: 'Custom banned passwords list in Enforced mode', evidence: { 'הערה': 'Entra admin center → Protection → Authentication methods → Password protection → Custom banned passwords: Enforced' } };
    }
    case 'CIS-5.2.3.3': {
      const betaSettings3 = await graphGet(token, '/settings', 'beta').catch(() => null);
      const pwdSetting3 = (betaSettings3?.value || []).find(s =>
        s.displayName === 'Password Rule Settings' || s.templateId === '5cf42378-d67d-4f36-ba46-e8b86229381d'
      );
      if (pwdSetting3?.values) {
        const getVal = (n) => pwdSetting3.values.find(v => v.name === n)?.value;
        const onPremEnabled = getVal('EnableBannedPasswordCheckOnPremises') === 'true';
        const mode = getVal('BannedPasswordCheckOnPremisesMode') || '';
        const isEnforced = mode.toLowerCase() === 'enforced';
        return { status: onPremEnabled && isEnforced ? 'passed' : 'failed', actual_value: `onPremEnabled: ${onPremEnabled}, mode: ${mode}`, expected_value: 'Enabled + Enforced mode', evidence: { 'On-prem': onPremEnabled, 'Mode': mode, 'מצב': onPremEnabled && isEnforced ? 'תקין ✓' : 'הגדר Enforced mode ✗' } };
      }
      return { status: 'manual', actual_value: 'Password protection settings not found via Graph API', expected_value: 'DC Agent installed, Mode = Enforced', evidence: { 'הערה': 'Entra admin center → Protection → Authentication methods → Password protection → On-premises: Enforced' } };
    }

    case 'CIS-5.2.3.4': {
      const data534 = await graphGet(token, "/reports/authenticationMethods/userRegistrationDetails?$select=userPrincipalName,isMfaCapable&$top=100&$filter=userType eq 'member'").catch(() => null);
      if (!data534) return { status: 'warning', actual_value: 'Cannot access reports - needs Reports.Read.All', expected_value: '100% members MFA capable', evidence: {} };
      const users534 = data534.value || [];
      const notCapable = users534.filter(u => !u.isMfaCapable);
      return { status: notCapable.length === 0 ? 'passed' : 'failed', actual_value: `${notCapable.length}/${users534.length} not MFA capable`, expected_value: '100% MFA capable', evidence: { 'סך משתמשים': users534.length, 'לא מסוגלים': notCapable.length, 'מצב': notCapable.length === 0 ? 'תקין ✓' : 'יש משתמשים ללא MFA ✗' } };
    }

    case 'CIS-5.2.3.5': { const p = await graphGet(token, '/policies/authenticationMethodsPolicy'); const sms = (p.authenticationMethodConfigurations || []).find(m => m.id === 'Sms'); const voice = (p.authenticationMethodConfigurations || []).find(m => m.id === 'Voice'); return { status: sms?.state !== 'enabled' && voice?.state !== 'enabled' ? 'passed' : 'failed', actual_value: `SMS: ${sms?.state}, Voice: ${voice?.state}`, expected_value: 'Both disabled', evidence: { 'SMS': sms?.state, 'Voice': voice?.state, 'מצב': sms?.state !== 'enabled' && voice?.state !== 'enabled' ? 'תקין ✓' : 'שיטות חלשות פעילות ✗' } }; }
    case 'CIS-5.2.3.6': { const p = await graphGet(token, '/policies/authenticationMethodsPolicy?$select=systemCredentialPreferences'); const s = p?.systemCredentialPreferences?.state; return { status: s === 'enabled' ? 'passed' : 'warning', actual_value: `systemCredentialPreferences: ${s}`, expected_value: 'enabled', evidence: { 'מצב': s, 'תוצאה': s === 'enabled' ? 'תקין ✓' : 'הפעל ✗' } }; }
    case 'CIS-5.2.3.7': { const p = await graphGet(token, '/policies/authenticationMethodsPolicy'); const em = (p.authenticationMethodConfigurations || []).find(m => m.id === 'Email'); return { status: em?.state !== 'enabled' ? 'passed' : 'failed', actual_value: `Email OTP: ${em?.state || 'not found'}`, expected_value: 'disabled', evidence: { 'Email OTP': em?.state || 'לא נמצא', 'מצב': em?.state !== 'enabled' ? 'תקין ✓' : 'כבה Email OTP ✗' } }; }
    case 'CIS-5.2.4.1': { const p = await graphGet(token, '/policies/authenticationMethodsPolicy').catch(() => null); const sspr = p?.selfServicePasswordReset; const st = sspr?.state || 'unknown'; const m = (sspr?.authenticationMethodConfigurations || []).filter(x => x.state === 'enabled').length; return { status: (st === 'enabled' || st === 'enabledForAllUsers') && m >= 2 ? 'passed' : 'failed', actual_value: `SSPR: ${st}, methods: ${m}`, expected_value: 'Enabled for all, ≥2 methods', evidence: { 'SSPR state': st, 'שיטות': m, 'מצב': st === 'enabled' && m >= 2 ? 'תקין ✓' : 'בדוק ✗' } }; }

    // --- ID Governance (PIM) ---
    case 'CIS-5.3.1': { const pim = await graphGet(token, "/roleManagement/directory/roleAssignmentScheduleInstances?$filter=assignmentType eq 'Assigned'&$select=principalId,roleDefinitionId&$top=50").catch(() => null); if (!pim) return { status: 'warning', actual_value: 'Cannot access PIM - needs RoleManagement.Read.All', expected_value: 'All roles via PIM (Eligible)', evidence: {} }; const permanent = pim.value || []; return { status: permanent.length === 0 ? 'passed' : 'warning', actual_value: `${permanent.length} permanent role assignment(s)`, expected_value: 'All roles Eligible (not Permanent)', evidence: { 'קצאות קבועות': permanent.length, 'מצב': permanent.length === 0 ? 'תקין ✓' : 'יש הקצאות קבועות ✗' } }; }
    case 'CIS-5.3.2': { const rev = await graphGet(token, '/identityGovernance/accessReviews/definitions?$top=50').catch(() => null); if (!rev) return { status: 'warning', actual_value: 'Cannot access access reviews - needs AccessReview.Read.All', expected_value: 'Recurring review for guests', evidence: {} }; const guest = (rev.value || []).filter(r => JSON.stringify(r.scope || {}).toLowerCase().includes('guest')); return { status: guest.length > 0 ? 'passed' : 'failed', actual_value: `${guest.length} guest access review(s)`, expected_value: 'Recurring access review for all guests', evidence: { 'ביקורות': guest.map(r => r.displayName).join(', ') || 'אין', 'מצב': guest.length > 0 ? 'תקין ✓' : 'צור access review לאורחים ✗' } }; }
    case 'CIS-5.3.3': { const rev = await graphGet(token, '/identityGovernance/accessReviews/definitions?$top=50').catch(() => null); if (!rev) return { status: 'warning', actual_value: 'Cannot access access reviews', expected_value: 'Recurring review for privileged roles', evidence: {} }; const roleRev = (rev.value || []).filter(r => JSON.stringify(r.scope || {}).toLowerCase().includes('role')); return { status: roleRev.length > 0 ? 'passed' : 'failed', actual_value: `${roleRev.length} privileged role review(s)`, expected_value: 'Recurring access review for privileged roles', evidence: { 'ביקורות': roleRev.map(r => r.displayName).join(', ') || 'אין', 'מצב': roleRev.length > 0 ? 'תקין ✓' : 'צור access review לתפקידים ✗' } }; }
    case 'CIS-5.3.4': {
      // GA role template ID
      const GA_ID = '62e90394-69f5-4237-9190-012177145e10';
      const asgn534 = await graphGet(token, `/policies/roleManagementPolicyAssignments?$filter=scopeId eq '/' and scopeType eq 'DirectoryRole' and roleDefinitionId eq '${GA_ID}'`).catch(() => null);
      if (!asgn534?.value?.length) return { status: 'warning', actual_value: 'Cannot access PIM policies — add RoleManagement.Read.All permission', expected_value: 'Approval required for GA activation', evidence: { 'הרשאה נדרשת': 'RoleManagement.Read.All' } };
      const policyId534 = asgn534.value[0].policyId;
      const policy534 = await graphGet(token, `/policies/roleManagementPolicies/${policyId534}?$expand=rules`).catch(() => null);
      const approvalRule534 = (policy534?.rules || []).find(r => r['@odata.type']?.toLowerCase().includes('approval'));
      const isRequired534 = approvalRule534?.setting?.isApprovalRequired;
      if (isRequired534 !== undefined) {
        return { status: isRequired534 ? 'passed' : 'failed', actual_value: `isApprovalRequired: ${isRequired534}`, expected_value: 'true', evidence: { 'אישור נדרש': isRequired534, 'מדיניות': policyId534, 'מצב': isRequired534 ? 'תקין ✓' : 'הפעל דרישת אישור ✗' } };
      }
      return { status: 'manual', actual_value: 'PIM policy found but approval rule unclear', expected_value: 'PIM Global Admin: Require approval = Yes', evidence: { 'הערה': 'Entra admin center → Identity governance → PIM → Entra roles → Global Administrator → Settings → Require approval: Yes' } };
    }
    case 'CIS-5.3.5': {
      // Privileged Role Administrator template ID
      const PRA_ID = 'e8611ab8-c189-46e8-94e1-60213ab1f814';
      const asgn535 = await graphGet(token, `/policies/roleManagementPolicyAssignments?$filter=scopeId eq '/' and scopeType eq 'DirectoryRole' and roleDefinitionId eq '${PRA_ID}'`).catch(() => null);
      if (!asgn535?.value?.length) return { status: 'warning', actual_value: 'Cannot access PIM policies — add RoleManagement.Read.All permission', expected_value: 'Approval required for PRA activation', evidence: { 'הרשאה נדרשת': 'RoleManagement.Read.All' } };
      const policyId535 = asgn535.value[0].policyId;
      const policy535 = await graphGet(token, `/policies/roleManagementPolicies/${policyId535}?$expand=rules`).catch(() => null);
      const approvalRule535 = (policy535?.rules || []).find(r => r['@odata.type']?.toLowerCase().includes('approval'));
      const isRequired535 = approvalRule535?.setting?.isApprovalRequired;
      if (isRequired535 !== undefined) {
        return { status: isRequired535 ? 'passed' : 'failed', actual_value: `isApprovalRequired: ${isRequired535}`, expected_value: 'true', evidence: { 'אישור נדרש': isRequired535, 'מדיניות': policyId535, 'מצב': isRequired535 ? 'תקין ✓' : 'הפעל דרישת אישור ✗' } };
      }
      return { status: 'manual', actual_value: 'PIM policy found but approval rule unclear', expected_value: 'PIM Privileged Role Admin: Require approval = Yes', evidence: { 'הערה': 'Entra admin center → Identity governance → PIM → Entra roles → Privileged Role Administrator → Settings → Require approval: Yes' } };
    }

    // --- Teams Extended ---
    case 'CIS-8.1.1': case 'CIS-8.1.2': case 'CIS-8.2.1': case 'CIS-8.2.2': case 'CIS-8.5.1': case 'CIS-8.5.2': case 'CIS-8.5.3': case 'CIS-8.5.9': {
      const scoreT = await getSecureScoreControls(token);
      const kwT = { 'CIS-8.1.1': ['TeamsFileSharing','CloudStorage'], 'CIS-8.1.2': ['ChannelEmail','channelemail'], 'CIS-8.2.1': ['TeamsExternal','FederationExternal'], 'CIS-8.2.2': ['UnmanagedTeams','ConsumerTeams'], 'CIS-8.5.1': ['AnonymousJoin','AllowAnonymous'], 'CIS-8.5.2': ['AnonymousStart','AnonymousMeeting'], 'CIS-8.5.3': ['LobbyBypass','AutoAdmit'], 'CIS-8.5.9': ['MeetingRecording','AllowRecording'] };
      const noteT = { 'CIS-8.1.1': 'Teams Admin → Teams apps → 3rd party cloud storage: Off', 'CIS-8.1.2': 'Teams Admin → Teams settings → Email integration: Off', 'CIS-8.2.1': 'Teams Admin → Users → External access → Specific domains only', 'CIS-8.2.2': 'Teams Admin → Users → External access → Block unmanaged Teams users', 'CIS-8.5.1': 'Teams Admin → Meetings → Meeting policies → Anonymous users cannot join', 'CIS-8.5.2': 'Teams Admin → Meetings → Allow anonymous users to start: Off', 'CIS-8.5.3': 'Teams Admin → Meetings → Who can bypass lobby: People in my org', 'CIS-8.5.9': 'Teams Admin → Meetings → Recording: Off' };
      const kws = kwT[checkId] || [];
      let ctrl = null; for (const kw of kws) { ctrl = getControl(scoreT, kw); if (ctrl) break; }
      if (ctrl) { const impl = ctrl.score > 0; return { status: impl ? 'passed' : 'warning', actual_value: `${ctrl.controlName}: ${ctrl.score}/${ctrl.maxScore}`, expected_value: 'Implemented', evidence: { 'ציון': `${ctrl.score}/${ctrl.maxScore}`, 'מצב': impl ? 'תקין ✓' : 'בדוק ✗' } }; }
      return { status: 'manual', actual_value: 'Teams API not accessible via standard Graph', expected_value: 'See Teams Admin Center', evidence: { 'הערה': noteT[checkId] || 'Teams Admin Center' } };
    }

    case 'CIS-8.2.3': case 'CIS-8.2.4': case 'CIS-8.5.4': case 'CIS-8.5.5': case 'CIS-8.5.6': case 'CIS-8.5.7': case 'CIS-8.5.8': case 'CIS-8.6.1': {
      const noteT2 = { 'CIS-8.2.3': 'Teams Admin → External access → External users cannot initiate chats', 'CIS-8.2.4': 'Teams Admin → External access → Block trial tenants', 'CIS-8.5.4': 'Teams Admin → Meetings → Dial-in lobby bypass: Off', 'CIS-8.5.5': 'Teams Admin → Meetings → Chat: Enabled for everyone except anonymous', 'CIS-8.5.6': 'Teams Admin → Meetings → Who can present: Only organizers', 'CIS-8.5.7': 'Teams Admin → Meetings → External participants can give control: Off', 'CIS-8.5.8': 'Teams Admin → Meetings → External users chat in meetings: Off', 'CIS-8.6.1': 'Teams Admin → Messaging policies → Report a security concern: On' };
      return { status: 'manual', actual_value: 'Teams API not accessible via standard Graph (requires Teams PowerShell)', expected_value: 'See Teams Admin Center', evidence: { 'הערה': noteT2[checkId] || 'Teams Admin Center' } };
    }

    // --- Microsoft Fabric (Power BI Admin API) ---
    case 'CIS-9.1.1': case 'CIS-9.1.2': case 'CIS-9.1.3': case 'CIS-9.1.4': case 'CIS-9.1.5':
    case 'CIS-9.1.6': case 'CIS-9.1.7': case 'CIS-9.1.8': case 'CIS-9.1.9': case 'CIS-9.1.10':
    case 'CIS-9.1.11': case 'CIS-9.1.12': {
      const pbiSettings = await getPbiSettings();
      if (!pbiSettings) {
        return { status: 'manual', actual_value: 'Power BI Admin API not accessible — add Tenant.Read.All to Power BI Service', expected_value: 'See Fabric admin portal', evidence: { 'הרשאה נדרשת': 'Power BI Service → Tenant.Read.All', 'פורטל': 'app.powerbi.com/admin-portal/tenantSettings' } };
      }
      // Map each check to the Power BI tenant setting name + desired state
      const fabricMap = {
        'CIS-9.1.1': { keys: ['ExternalSharingEnabled','ShareWithExternalUsers','ExternalUserSharingEnabled'], wantEnabled: false, label: 'Guest access' },
        'CIS-9.1.2': { keys: ['ExternalInvitationEnabled','InviteExternalUsers','AllowExternalInvitation'], wantEnabled: false, label: 'External invitations' },
        'CIS-9.1.3': { keys: ['AllowGuestUserToAccessSharedContent','GuestUserAccessSharedContent'], wantEnabled: false, label: 'Guest content access' },
        'CIS-9.1.4': { keys: ['PublishToWeb'], wantEnabled: false, label: 'Publish to web' },
        'CIS-9.1.5': { keys: ['AllowRVisuals','InteractWithRVisuals','AllowPythonVisuals','PythonVisuals'], wantEnabled: false, label: 'R/Python visuals' },
        'CIS-9.1.6': { keys: ['SensitivityLabelsEnabled','MicrosoftInformationProtectionSensitivityLabels'], wantEnabled: true, label: 'Sensitivity labels' },
        'CIS-9.1.7': { keys: ['ShareableLinks','AllowShareableLinks'], wantEnabled: false, label: 'Shareable links' },
        'CIS-9.1.8': { keys: ['ExternalDataSharingEnabled','AllowExternalDataSharing'], wantEnabled: false, label: 'External data sharing' },
        'CIS-9.1.9': { keys: ['ResourceKeyAuthenticationEnabled','EmbedCodesEnabled','EmbedCodeAuthentication'], wantEnabled: false, label: 'ResourceKey authentication' },
        'CIS-9.1.10': { keys: ['ServicePrincipalsCanUseApis','ServicePrincipalAccess'], wantEnabled: false, label: 'Service Principal API access' },
        'CIS-9.1.11': { keys: ['ServicePrincipalsCanCreateProfiles','ServicePrincipalsProfiles'], wantEnabled: false, label: 'SP create profiles' },
        'CIS-9.1.12': { keys: ['ServicePrincipalsCanCreateWorkspaces','CreateWorkspaces'], wantEnabled: false, label: 'SP create workspaces/pipelines' },
      };
      const { keys, wantEnabled, label } = fabricMap[checkId] || { keys: [], wantEnabled: false, label: checkId };
      const setting = findPbiSetting(pbiSettings, ...keys);
      if (setting) {
        const isEnabled = setting.enabled ?? setting.isEnabled;
        const passed = wantEnabled ? isEnabled === true : isEnabled === false;
        return { status: passed ? 'passed' : 'failed', actual_value: `${setting.name || setting.settingName}: enabled=${isEnabled}`, expected_value: `enabled = ${wantEnabled}`, evidence: { 'Setting': setting.name || setting.settingName, 'Enabled': isEnabled, 'מצב': passed ? 'תקין ✓' : `יש לשנות ל-${wantEnabled} ✗` } };
      }
      // Setting not found by name - list available settings for debug
      const available = pbiSettings.slice(0,20).map(s => s.name || s.settingName).join(', ');
      return { status: 'warning', actual_value: `Power BI API accessible (${pbiSettings.length} settings) but setting for '${label}' not found`, expected_value: `enabled = ${wantEnabled}`, evidence: { 'בדיקה': label, 'הגדרות זמינות (20 ראשונות)': available, 'פורטל': 'app.powerbi.com/admin-portal/tenantSettings' } };
    }

    // --- Exchange Extended (via Exchange REST API) ---
    case 'CIS-6.5.2': {
      const orgId652 = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      const org652 = orgId652 && _exToken ? await exchangeGet(orgId652, 'Organization') : null;
      const orgData652 = org652?.value?.[0] || org652;
      if (orgData652?.MailTipsExternalRecipientsTipsEnabled !== undefined) {
        const enabled = orgData652.MailTipsExternalRecipientsTipsEnabled;
        return { status: enabled ? 'passed' : 'failed', actual_value: `MailTipsExternalRecipientsTipsEnabled: ${enabled}`, expected_value: 'true', evidence: { 'MailTips': enabled, 'מצב': enabled ? 'תקין ✓' : 'כבה ✗' } };
      }
      return { status: 'manual', actual_value: 'Exchange API not accessible', expected_value: 'true', evidence: { 'הערה': 'Exchange Admin Center → Settings → Mail tips → External recipients' } };
    }
    case 'CIS-6.5.4': {
      const orgId654 = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      const org654 = orgId654 && _exToken ? await exchangeGet(orgId654, 'Organization') : null;
      const orgData654 = org654?.value?.[0] || org654;
      if (orgData654?.SmtpClientAuthenticationDisabled !== undefined) {
        const disabled = orgData654.SmtpClientAuthenticationDisabled;
        return { status: disabled ? 'passed' : 'failed', actual_value: `SmtpClientAuthenticationDisabled: ${disabled}`, expected_value: 'true', evidence: { 'SMTP AUTH': disabled, 'מצב': disabled ? 'תקין ✓' : 'SMTP AUTH פעיל ✗' } };
      }
      return { status: 'manual', actual_value: 'Exchange API not accessible', expected_value: 'true', evidence: { 'הערה': 'Exchange Admin Center → Settings → Modern authentication → Disable SMTP AUTH' } };
    }
    case 'CIS-6.5.3': {
      const orgId653 = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      const policies653 = orgId653 && _exToken ? await exchangeGet(orgId653, 'OwaMailboxPolicy') : null;
      const dp = (policies653?.value || []).find(p => p.Name === 'OwaMailboxPolicy-Default') || (policies653?.value || [])[0];
      if (dp?.AdditionalStorageProvidersAvailable !== undefined) {
        return { status: !dp.AdditionalStorageProvidersAvailable ? 'passed' : 'failed', actual_value: `AdditionalStorageProvidersAvailable: ${dp.AdditionalStorageProvidersAvailable}`, expected_value: 'false', evidence: { 'Storage': dp.AdditionalStorageProvidersAvailable, 'מצב': !dp.AdditionalStorageProvidersAvailable ? 'תקין ✓' : 'אחסון חיצוני פתוח ✗' } };
      }
      return { status: 'manual', actual_value: 'Exchange API not accessible', expected_value: 'false', evidence: { 'הערה': 'Exchange Admin Center → OWA policies → Default → Features → Third-party storage: Off' } };
    }
    case 'CIS-6.2.3': {
      const orgId623 = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      const rules623 = orgId623 && _exToken ? await exchangeGet(orgId623, 'TransportRule') : null;
      if (rules623?.value) {
        const ext = rules623.value.filter(r => JSON.stringify(r).toLowerCase().includes('external') && (JSON.stringify(r).toLowerCase().includes('disclaimer') || JSON.stringify(r).toLowerCase().includes('prepend')));
        return { status: ext.length > 0 ? 'passed' : 'failed', actual_value: `${ext.length} external sender tag rule(s)`, expected_value: 'Rule tagging external senders', evidence: { 'חוקים': ext.map(r => r.Name).join(', ') || 'אין', 'מצב': ext.length > 0 ? 'תקין ✓' : 'אין תיוג חיצוני ✗' } };
      }
      return { status: 'manual', actual_value: 'Exchange API not accessible', expected_value: 'Transport rule tags external senders', evidence: { 'הערה': 'Exchange Admin Center → Mail flow → Rules → Add [External] prefix' } };
    }
    case 'CIS-6.2.2': {
      const orgId622 = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      const rules622 = orgId622 && _exToken ? await exchangeGet(orgId622, 'TransportRule') : null;
      if (rules622?.value) {
        const bypass = rules622.value.filter(r => JSON.stringify(r).includes('-1') || JSON.stringify(r).toLowerCase().includes('scl'));
        return { status: bypass.length === 0 ? 'passed' : 'failed', actual_value: `${bypass.length} SCL=-1 rule(s)`, expected_value: 'No SCL=-1 rules', evidence: { 'חוקים': bypass.map(r => r.Name).join(', ') || 'אין', 'מצב': bypass.length === 0 ? 'תקין ✓' : 'בדוק ✗' } };
      }
      return { status: 'manual', actual_value: 'Exchange API not accessible', expected_value: 'No SCL=-1 rules', evidence: { 'הערה': 'Exchange Admin Center → Mail flow → Rules → בדוק SCL=-1' } };
    }
    case 'CIS-6.1.3': {
      const orgId613 = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      const org613 = orgId613 && _exToken ? await exchangeGet(orgId613, 'Organization') : null;
      const d613 = org613?.value?.[0] || org613;
      if (d613) return { status: d613.AuditDisabled === false || d613.AuditDisabled === undefined ? 'passed' : 'warning', actual_value: `AuditDisabled: ${d613.AuditDisabled ?? false}`, expected_value: 'No mailboxes with AuditBypass', evidence: { 'AuditDisabled': d613.AuditDisabled ?? false } };
      return { status: 'manual', actual_value: 'Exchange API not accessible', expected_value: 'No AuditBypass', evidence: { 'הערה': 'PowerShell: Get-MailboxAuditBypassAssociation' } };
    }
    case 'CIS-6.5.5': {
      const orgId655 = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      const conn = orgId655 && _exToken ? await exchangeGet(orgId655, 'InboundConnector') : null;
      if (conn?.value) return { status: 'warning', actual_value: `${conn.value.length} inbound connector(s)`, expected_value: 'No Direct Send', evidence: { 'Connectors': conn.value.map(c => c.Name).join(', ') || 'אין' } };
      return { status: 'manual', actual_value: 'Exchange API not accessible', expected_value: 'No Direct Send', evidence: { 'הערה': 'Exchange Admin Center → Mail flow → Connectors' } };
    }
    // SharePoint Extended
    case 'CIS-7.2.6': { const spo = await getSpoSettings(token); if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'sharingCapability = Disabled/ExistingOnly', evidence: {} }; const cap = spo.sharingCapability; const ok = ['disabled','existingExternalUserSharingOnly'].includes((cap||'').toLowerCase()); return { status: ok ? 'passed' : 'failed', actual_value: `sharingCapability: ${cap}`, expected_value: 'Disabled or ExistingExternalUserSharingOnly', evidence: { sharingCapability: cap, 'מצב': ok ? 'תקין ✓' : 'Anonymous פעיל ✗' } }; }
    case 'CIS-7.2.7': { const spo = await getSpoSettings(token); if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'direct', evidence: {} }; const v = spo.defaultSharingLinkType; return { status: v === 'direct' ? 'passed' : 'failed', actual_value: `defaultSharingLinkType: ${v}`, expected_value: 'direct', evidence: { 'Link Type': v, 'מצב': v === 'direct' ? 'תקין ✓' : 'לא מוגבל ✗' } }; }
    case 'CIS-7.2.11': { const spo = await getSpoSettings(token); if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'view', evidence: {} }; const v = spo.defaultLinkPermission; return { status: v === 'view' ? 'passed' : 'failed', actual_value: `defaultLinkPermission: ${v}`, expected_value: 'view', evidence: { 'Permission': v, 'מצב': v === 'view' ? 'תקין ✓' : 'Edit כברירת מחדל ✗' } }; }
    case 'CIS-7.2.9': { const spo = await getSpoSettings(token); if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'Guest expires ≤30d', evidence: {} }; const req = spo.requireExternalUserExpirationRequired ?? spo.externalUserExpirationRequired; const d = spo.externalUserExpireInDays; return { status: req && d && d <= 30 ? 'passed' : req ? 'warning' : 'failed', actual_value: `required: ${req}, days: ${d}`, expected_value: 'true, ≤30d', evidence: { 'Required': req, 'Days': d, 'מצב': req && d <= 30 ? 'תקין ✓' : 'הגדר פקיעה ✗' } }; }
    case 'CIS-7.2.5': { const spo = await getSpoSettings(token); if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'false', evidence: {} }; const v = spo.isResharingByExternalUsersEnabled ?? spo.allowGuestUserShareToUsersNotInSiteCollection; return { status: v === false ? 'passed' : 'failed', actual_value: `isResharingByExternalUsersEnabled: ${v}`, expected_value: 'false', evidence: { 'Resharing': v, 'מצב': v === false ? 'תקין ✓' : 'אורחים יכולים לשתף ✗' } }; }
    case 'CIS-7.2.2': { const spo = await getSpoSettings(token); if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'true', evidence: {} }; const v = spo.isAzureADB2BEnabled ?? spo.enableAzureADB2BIntegration; return { status: v === true ? 'passed' : 'failed', actual_value: `isAzureADB2BEnabled: ${v}`, expected_value: 'true', evidence: { 'B2B': v, 'מצב': v ? 'תקין ✓' : 'הפעל B2B ✗' } }; }
    case 'CIS-7.3.2': { const spo = await getSpoSettings(token); if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'GUIDs configured', evidence: {} }; const v = spo.allowedDomainGuidsForSyncApp; const ok = Array.isArray(v) ? v.length > 0 : !!v; return { status: ok ? 'passed' : 'failed', actual_value: `allowedDomainGuids: ${JSON.stringify(v)}`, expected_value: 'At least 1 GUID', evidence: { 'GUIDs': ok, 'מצב': ok ? 'תקין ✓' : 'סנכרון פתוח לכל ✗' } }; }
    case 'CIS-7.2.8': { const spo = await getSpoSettings(token); if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'AllowList/BlockList', evidence: {} }; const m = spo.sharingDomainRestrictionMode; return { status: m && m !== 'none' ? 'passed' : 'warning', actual_value: `sharingDomainRestrictionMode: ${m}`, expected_value: 'AllowList or BlockList', evidence: { 'Mode': m, 'מצב': m && m !== 'none' ? 'תקין ✓' : 'ללא הגבלת דומיינים ✗' } }; }
    case 'CIS-7.2.10': { const spo = await getSpoSettings(token); if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'Required ≤30d', evidence: {} }; const req = spo.emailAttestationRequired; const d = spo.emailAttestationReAuthDays; return { status: req && d && d <= 30 ? 'passed' : req ? 'warning' : 'failed', actual_value: `required: ${req}, days: ${d}`, expected_value: 'true, ≤30d', evidence: { 'Required': req, 'Days': d, 'מצב': req && d <= 30 ? 'תקין ✓' : 'הגדר ✗' } }; }

    default:
      return { status: 'manual', actual_value: 'בדיקה דורשת אימות ידני', expected_value: 'ראה הנחיות תיקון', evidence: { 'הערה': 'בדיקה זו דורשת אימות ידני בפורטל הרלוונטי' } };
  }
}

// CIS M365 v6.0.1 - Full check metadata
const CHECK_META = {
  'CIS-1.1.1': { title: 'Security Defaults Disabled', title_he: 'הגדרות ברירת מחדל לאבטחה מכובות', domain: 'entra_id', severity: 'high', category: 'Entra ID' },
  'CIS-1.1.2': { title: 'Password Hash Sync Enabled', title_he: 'סנכרון גיבוב סיסמאות מופעל', domain: 'entra_id', severity: 'medium', category: 'Entra ID' },
  'CIS-1.2.1': { title: 'MFA for Privileged Users', title_he: 'MFA לבעלי הרשאות מוגברות', domain: 'entra_id', severity: 'critical', category: 'Entra ID' },
  'CIS-1.2.2': { title: 'MFA for All Users', title_he: 'MFA לכלל המשתמשים', domain: 'entra_id', severity: 'critical', category: 'Entra ID' },
  'CIS-1.3.1': { title: 'Password Expiration Policy', title_he: 'מדיניות פקיעת סיסמאות', domain: 'entra_id', severity: 'medium', category: 'Entra ID' },
  'CIS-1.3.3': { title: 'SSPR Requires 2 Methods', title_he: 'SSPR דורש 2 שיטות אימות', domain: 'entra_id', severity: 'medium', category: 'Entra ID' },
  'CIS-1.4.1': { title: 'Global Admin Count 2-4', title_he: 'מספר מנהלי Global Admin: 2–4', domain: 'entra_id', severity: 'critical', category: 'Entra ID' },
  'CIS-1.4.2': { title: 'Cloud-Only Admin Accounts', title_he: 'חשבונות מנהל ענן-בלבד', domain: 'entra_id', severity: 'high', category: 'Entra ID' },
  'CIS-1.5.1': { title: 'Block Legacy Authentication', title_he: 'חסימת Legacy Authentication', domain: 'conditional_access', severity: 'critical', category: 'Conditional Access' },
  'CIS-1.6.1': { title: 'Sign-in Risk Policy', title_he: 'מדיניות סיכון כניסה', domain: 'conditional_access', severity: 'critical', category: 'Conditional Access' },
  'CIS-1.6.2': { title: 'User Risk Policy', title_he: 'מדיניות סיכון משתמש', domain: 'conditional_access', severity: 'critical', category: 'Conditional Access' },
  'CIS-1.7.1': { title: 'No Guest Admins', title_he: 'אין אורחים עם תפקידי מנהל', domain: 'entra_id', severity: 'critical', category: 'Entra ID' },
  'CIS-2.1.1': { title: 'CA Covers All Cloud Apps', title_he: 'CA מכסה את כל אפליקציות הענן', domain: 'conditional_access', severity: 'high', category: 'Conditional Access' },
  'CIS-2.1.2': { title: 'Compliant Device Required', title_he: 'נדרש התקן תואם מדיניות', domain: 'conditional_access', severity: 'high', category: 'Conditional Access' },
  'CIS-2.1.3': { title: 'Session Controls Configured', title_he: 'בקרות Session מוגדרות', domain: 'conditional_access', severity: 'medium', category: 'Conditional Access' },
  'CIS-3.1.1': { title: 'Modern Authentication (Exchange)', title_he: 'אימות מודרני ב-Exchange Online', domain: 'exchange_online', severity: 'high', category: 'Exchange Online' },
  'CIS-3.2.1': { title: 'Block Auto-Forwarding', title_he: 'חסימת העברה אוטומטית חיצונית', domain: 'exchange_online', severity: 'critical', category: 'Exchange Online' },
  'CIS-3.3.1': { title: 'SPF Record Configured', title_he: 'רשומת SPF מוגדרת', domain: 'mail_flow', severity: 'high', category: 'Mail Flow' },
  'CIS-3.3.2': { title: 'DKIM Enabled', title_he: 'DKIM מופעל', domain: 'mail_flow', severity: 'high', category: 'Mail Flow' },
  'CIS-3.3.3': { title: 'DMARC Policy Configured', title_he: 'מדיניות DMARC מוגדרת', domain: 'mail_flow', severity: 'high', category: 'Mail Flow' },
  'CIS-3.4.1': { title: 'Mailbox Audit Logging', title_he: 'תיעוד ביקורת תיבות דואר', domain: 'exchange_online', severity: 'high', category: 'Exchange Online' },
  'CIS-4.1.1': { title: 'Safe Attachments Enabled', title_he: 'Safe Attachments מופעל', domain: 'defender', severity: 'high', category: 'Defender' },
  'CIS-4.1.2': { title: 'Safe Links Enabled', title_he: 'Safe Links מופעל', domain: 'defender', severity: 'high', category: 'Defender' },
  'CIS-4.2.1': { title: 'Anti-Phishing Policy', title_he: 'מדיניות אנטי-פישינג', domain: 'defender', severity: 'critical', category: 'Defender' },
  'CIS-4.3.1': { title: 'Secure Score >= 60%', title_he: 'ציון אבטחה מינימלי 60%', domain: 'defender', severity: 'high', category: 'Secure Score' },
  'CIS-4.4.1': { title: 'Customer Lockbox', title_he: 'Customer Lockbox מופעל', domain: 'defender', severity: 'medium', category: 'Defender' },
  'CIS-5.1.1': { title: 'SharePoint External Sharing Restricted', title_he: 'שיתוף חיצוני SharePoint מוגבל', domain: 'sharepoint', severity: 'high', category: 'SharePoint Online' },
  'CIS-5.1.2': { title: 'OneDrive External Sharing Restricted', title_he: 'שיתוף חיצוני OneDrive מוגבל', domain: 'sharepoint', severity: 'high', category: 'SharePoint Online' },
  'CIS-5.2.1': { title: 'SharePoint Legacy Auth Disabled', title_he: 'Legacy Auth ב-SharePoint מושבת', domain: 'sharepoint', severity: 'high', category: 'SharePoint Online' },
  'CIS-5.3.1': { title: 'OneDrive Sync Restricted', title_he: 'סנכרון OneDrive מוגבל', domain: 'sharepoint', severity: 'medium', category: 'SharePoint Online' },
  'CIS-6.1.1': { title: 'Teams External Access Restricted', title_he: 'גישה חיצונית Teams מוגבלת', domain: 'teams', severity: 'high', category: 'Teams' },
  'CIS-6.1.2': { title: 'Teams Guest Access Controlled', title_he: 'גישת אורחים Teams מאובטחת', domain: 'teams', severity: 'medium', category: 'Teams' },
  'CIS-6.2.1': { title: 'Anonymous Cannot Start Meetings', title_he: 'חסימת פגישות אנונימיות', domain: 'teams', severity: 'high', category: 'Teams' },
  'CIS-6.3.1': { title: 'Meeting Recordings Stored Securely', title_he: 'הקלטות ישיבות באחסון מאובטח', domain: 'teams', severity: 'low', category: 'Teams' },
  'CIS-7.1.1': { title: 'Audit Log Search Enabled', title_he: 'יומן ביקורת מאוחד פעיל', domain: 'purview', severity: 'critical', category: 'Purview' },
  'CIS-7.2.1': { title: 'DLP Policy Active', title_he: 'מדיניות DLP פעילה', domain: 'purview', severity: 'high', category: 'Purview' },
  'CIS-7.3.1': { title: 'Sensitivity Labels Configured', title_he: 'תוויות רגישות מוגדרות', domain: 'purview', severity: 'medium', category: 'Purview' },
  // --- M365 Admin Center ---
  'CIS-M365-1.1.4': { title: 'Admin Accounts Use Minimal Licenses', title_he: 'חשבונות מנהל עם רישיונות מינימליים', domain: 'entra_id', severity: 'high', category: 'M365 Admin Center' },
  'CIS-M365-1.2.1': { title: 'Only Approved Public Groups Exist', title_he: 'קבוצות ציבוריות מאושרות בלבד', domain: 'entra_id', severity: 'medium', category: 'M365 Admin Center' },
  'CIS-M365-1.2.2': { title: 'Shared Mailbox Sign-in Blocked', title_he: 'כניסה לתיבות משותפות חסומה', domain: 'entra_id', severity: 'high', category: 'M365 Admin Center' },
  'CIS-M365-1.3.2': { title: 'Idle Session Timeout <= 3h', title_he: 'תפוגת סשן בטלה עד 3 שעות', domain: 'entra_id', severity: 'medium', category: 'M365 Admin Center' },
  'CIS-M365-1.3.3': { title: 'Calendar External Sharing Disabled', title_he: 'שיתוף לוחות שנה חיצוני מושבת', domain: 'exchange_online', severity: 'medium', category: 'M365 Admin Center' },
  'CIS-M365-1.3.4': { title: 'User-Owned Apps Restricted', title_he: 'אפליקציות בבעלות משתמש מוגבלות', domain: 'entra_id', severity: 'medium', category: 'M365 Admin Center' },
  'CIS-M365-1.3.5': { title: 'Forms Phishing Protection Enabled', title_he: 'הגנת פישינג ב-Forms מופעלת', domain: 'entra_id', severity: 'medium', category: 'M365 Admin Center' },
  'CIS-M365-1.3.7': { title: 'Third-Party Storage Restricted', title_he: 'אחסון צד שלישי מוגבל', domain: 'entra_id', severity: 'medium', category: 'M365 Admin Center' },
  'CIS-M365-1.3.9': { title: 'Bookings Pages Restricted', title_he: 'דפי Bookings מוגבלים', domain: 'entra_id', severity: 'medium', category: 'M365 Admin Center' },
  // --- Defender Email Security ---
  'CIS-2.1.5': { title: 'Safe Attachments for SPO/OD/Teams', title_he: 'Safe Attachments ל-SharePoint/OneDrive/Teams', domain: 'defender', severity: 'high', category: 'Defender' },
  'CIS-2.1.6': { title: 'Spam Policy Notifies Admins', title_he: 'מדיניות Spam מתריעה למנהלים', domain: 'defender', severity: 'medium', category: 'Defender' },
  'CIS-2.1.11': { title: 'Comprehensive Attachment Filtering', title_he: 'סינון קבצים מצורפים מקיף', domain: 'defender', severity: 'medium', category: 'Defender' },
  'CIS-2.1.12': { title: 'IP Allow List Not Used', title_he: 'רשימת IP מותרים לא בשימוש', domain: 'defender', severity: 'high', category: 'Defender' },
  'CIS-2.1.13': { title: 'Connection Filter Safe List Off', title_he: 'Safe List במסנן חיבורים מושבת', domain: 'defender', severity: 'medium', category: 'Defender' },
  'CIS-2.1.14': { title: 'Anti-Spam No Allowed Domains', title_he: 'אנטי-ספאם ללא דומיינים מותרים', domain: 'defender', severity: 'high', category: 'Defender' },
  'CIS-2.1.15': { title: 'Outbound Spam Message Limits', title_he: 'מגבלות הודעות יוצאות', domain: 'defender', severity: 'medium', category: 'Defender' },
  'CIS-2.4.1': { title: 'Priority Account Protection Enabled', title_he: 'הגנת חשבונות עדיפות מופעלת', domain: 'defender', severity: 'high', category: 'Defender' },
  'CIS-2.4.2': { title: 'Priority Accounts - Strict Protection', title_he: 'חשבונות עדיפות עם Strict Protection', domain: 'defender', severity: 'high', category: 'Defender' },
  'CIS-2.4.4': { title: 'ZAP for Teams Enabled', title_he: 'ZAP ל-Teams מופעל', domain: 'defender', severity: 'high', category: 'Defender' },
  // --- Purview DLP Teams ---
  'CIS-3.2.2': { title: 'DLP Policy for Microsoft Teams', title_he: 'מדיניות DLP ל-Teams', domain: 'purview', severity: 'high', category: 'Purview' },
  // --- Intune ---
  'CIS-4.1': { title: 'Devices Without Policy = Not Compliant', title_he: 'מכשירים ללא מדיניות = לא תואמים', domain: 'defender', severity: 'high', category: 'Intune' },
  'CIS-4.2': { title: 'Block BYOD Enrollment', title_he: 'חסימת רישום מכשירים אישיים', domain: 'defender', severity: 'high', category: 'Intune' },
  // --- Entra ID Extended ---
  'CIS-5.1.2.1': { title: 'Per-User MFA Disabled', title_he: 'MFA פר-משתמש מושבת', domain: 'entra_id', severity: 'medium', category: 'Entra ID' },
  'CIS-5.1.2.2': { title: 'Third-Party App Integration Restricted', title_he: 'אפליקציות צד שלישי מוגבלות', domain: 'entra_id', severity: 'high', category: 'Entra ID' },
  'CIS-5.1.2.3': { title: 'Non-Admin Cannot Create Tenants', title_he: 'משתמשים רגילים לא יוצרים Tenants', domain: 'entra_id', severity: 'medium', category: 'Entra ID' },
  'CIS-5.1.2.4': { title: 'Entra Admin Center Access Restricted', title_he: 'גישה ל-Entra Admin Center מוגבלת', domain: 'entra_id', severity: 'medium', category: 'Entra ID' },
  'CIS-5.1.2.5': { title: 'Stay Signed In Option Hidden', title_he: 'אפשרות להישאר מחובר מוסתרת', domain: 'entra_id', severity: 'low', category: 'Entra ID' },
  'CIS-5.1.2.6': { title: 'LinkedIn Connections Disabled', title_he: 'חיבור LinkedIn מושבת', domain: 'entra_id', severity: 'low', category: 'Entra ID' },
  'CIS-5.1.3.1': { title: 'Dynamic Group for Guest Users', title_he: 'קבוצה דינמית לאורחים', domain: 'entra_id', severity: 'medium', category: 'Entra ID' },
  'CIS-5.1.3.2': { title: 'Users Cannot Create Security Groups', title_he: 'משתמשים לא יוצרים קבוצות אבטחה', domain: 'entra_id', severity: 'medium', category: 'Entra ID' },
  'CIS-5.1.4.1': { title: 'Device Join Restricted', title_he: 'צירוף מכשירים ל-Entra מוגבל', domain: 'entra_id', severity: 'high', category: 'Entra ID' },
  'CIS-5.1.4.2': { title: 'Max Devices Per User Limited', title_he: 'מספר מכשירים מרבי מוגבל', domain: 'entra_id', severity: 'low', category: 'Entra ID' },
  'CIS-5.1.4.3': { title: 'GA Not Local Admin on Join', title_he: 'GA לא מנהל מקומי בצירוף Entra', domain: 'entra_id', severity: 'high', category: 'Entra ID' },
  'CIS-5.1.4.4': { title: 'Local Admin Assignment Restricted', title_he: 'הקצאת מנהל מקומי מוגבלת', domain: 'entra_id', severity: 'medium', category: 'Entra ID' },
  'CIS-5.1.4.5': { title: 'LAPS Enabled', title_he: 'LAPS מופעל', domain: 'entra_id', severity: 'high', category: 'Entra ID' },
  'CIS-5.1.4.6': { title: 'BitLocker Key Recovery Restricted', title_he: 'שחזור מפתח BitLocker מוגבל', domain: 'entra_id', severity: 'medium', category: 'Entra ID' },
  'CIS-5.1.5.1': { title: 'User Consent to Apps Blocked', title_he: 'הסכמת משתמש לאפליקציות חסומה', domain: 'entra_id', severity: 'high', category: 'Entra ID' },
  'CIS-5.1.5.2': { title: 'Admin Consent Workflow Enabled', title_he: 'תהליך הסכמת מנהל מופעל', domain: 'entra_id', severity: 'medium', category: 'Entra ID' },
  'CIS-5.1.6.1': { title: 'Invitations to Allowed Domains Only', title_he: 'הזמנות לדומיינים מאושרים בלבד', domain: 'entra_id', severity: 'high', category: 'Entra ID' },
  'CIS-5.1.6.2': { title: 'Guest User Access Restricted', title_he: 'גישת אורחים מוגבלת', domain: 'entra_id', severity: 'high', category: 'Entra ID' },
  'CIS-5.1.6.3': { title: 'Guest Invite Limited to Guest Inviter Role', title_he: 'הזמנת אורחים מוגבלת לתפקיד Guest Inviter', domain: 'entra_id', severity: 'high', category: 'Entra ID' },
  'CIS-5.1.8.1': { title: 'Password Hash Sync for Hybrid', title_he: 'PHS בסביבות היברידיות', domain: 'entra_id', severity: 'high', category: 'Entra ID' },
  // --- ID Protection ---
  'CIS-5.2.2.1': { title: 'MFA for Admin Roles (CA)', title_he: 'MFA לתפקידי מנהל ב-CA', domain: 'conditional_access', severity: 'critical', category: 'ID Protection' },
  'CIS-5.2.2.2': { title: 'MFA for All Users (CA)', title_he: 'MFA לכל המשתמשים ב-CA', domain: 'conditional_access', severity: 'critical', category: 'ID Protection' },
  'CIS-5.2.2.3': { title: 'Block Legacy Auth (CA)', title_he: 'חסימת Legacy Auth ב-CA', domain: 'conditional_access', severity: 'critical', category: 'ID Protection' },
  'CIS-5.2.2.4': { title: 'Admin Sign-in Frequency and Session', title_he: 'תדירות כניסה ו-Session למנהלים', domain: 'conditional_access', severity: 'high', category: 'ID Protection' },
  'CIS-5.2.2.5': { title: 'Phishing-Resistant MFA for Admins', title_he: 'MFA עמיד פישינג למנהלים', domain: 'conditional_access', severity: 'high', category: 'ID Protection' },
  'CIS-5.2.2.6': { title: 'User Risk Policy (IDP)', title_he: 'מדיניות סיכון משתמש ב-IDP', domain: 'conditional_access', severity: 'high', category: 'ID Protection' },
  'CIS-5.2.2.7': { title: 'Sign-in Risk Policy (IDP)', title_he: 'מדיניות סיכון כניסה ב-IDP', domain: 'conditional_access', severity: 'high', category: 'ID Protection' },
  'CIS-5.2.2.8': { title: 'Medium/High Risk Sign-ins Blocked', title_he: 'כניסות סיכון בינוני/גבוה נחסמות', domain: 'conditional_access', severity: 'high', category: 'ID Protection' },
  'CIS-5.2.2.9': { title: 'Managed Device Required for Auth', title_he: 'מכשיר מנוהל נדרש לאימות', domain: 'conditional_access', severity: 'high', category: 'ID Protection' },
  'CIS-5.2.2.10': { title: 'Managed Device for Security Info Registration', title_he: 'מכשיר מנוהל לרישום מידע אבטחה', domain: 'conditional_access', severity: 'high', category: 'ID Protection' },
  'CIS-5.2.2.11': { title: 'Intune Enrollment Sign-in Frequency', title_he: 'תדירות כניסה לרישום Intune', domain: 'conditional_access', severity: 'medium', category: 'ID Protection' },
  'CIS-5.2.2.12': { title: 'Device Code Flow Blocked', title_he: 'Device Code Flow חסום', domain: 'conditional_access', severity: 'high', category: 'ID Protection' },
  'CIS-5.2.3.1': { title: 'Authenticator Anti-Fatigue Config', title_he: 'הגנת Authenticator מפני MFA fatigue', domain: 'entra_id', severity: 'high', category: 'ID Protection' },
  'CIS-5.2.3.2': { title: 'Custom Banned Passwords List', title_he: 'רשימת סיסמאות אסורות מותאמת', domain: 'entra_id', severity: 'medium', category: 'ID Protection' },
  'CIS-5.2.3.3': { title: 'On-Prem Password Protection', title_he: 'הגנת סיסמאות on-prem', domain: 'entra_id', severity: 'medium', category: 'ID Protection' },
  'CIS-5.2.3.4': { title: 'All Users MFA Capable', title_he: 'כל המשתמשים מסוגלים ל-MFA', domain: 'entra_id', severity: 'high', category: 'ID Protection' },
  'CIS-5.2.3.5': { title: 'Weak Auth Methods Disabled', title_he: 'שיטות אימות חלשות מושבתות', domain: 'entra_id', severity: 'high', category: 'ID Protection' },
  'CIS-5.2.3.6': { title: 'System-Preferred MFA Enabled', title_he: 'System-preferred MFA מופעל', domain: 'entra_id', severity: 'medium', category: 'ID Protection' },
  'CIS-5.2.3.7': { title: 'Email OTP Disabled', title_he: 'Email OTP מושבת', domain: 'entra_id', severity: 'medium', category: 'ID Protection' },
  'CIS-5.2.4.1': { title: 'SSPR Enabled for All Users', title_he: 'SSPR מופעל לכל המשתמשים', domain: 'entra_id', severity: 'medium', category: 'ID Protection' },
  // --- ID Governance ---
  'CIS-5.3.1': { title: 'PIM Manages Privileged Roles', title_he: 'PIM מנהל תפקידים מיוחסים', domain: 'entra_id', severity: 'critical', category: 'ID Governance' },
  'CIS-5.3.2': { title: 'Access Reviews for Guest Users', title_he: 'Access Reviews למשתמשי אורח', domain: 'entra_id', severity: 'high', category: 'ID Governance' },
  'CIS-5.3.3': { title: 'Access Reviews for Privileged Roles', title_he: 'Access Reviews לתפקידים מיוחסים', domain: 'entra_id', severity: 'high', category: 'ID Governance' },
  'CIS-5.3.4': { title: 'Approval Required for GA Activation', title_he: 'אישור נדרש להפעלת Global Admin', domain: 'entra_id', severity: 'critical', category: 'ID Governance' },
  'CIS-5.3.5': { title: 'Approval Required for PRA Activation', title_he: 'אישור נדרש להפעלת Privileged Role Admin', domain: 'entra_id', severity: 'critical', category: 'ID Governance' },
  // --- Exchange Extended ---
  'CIS-6.1.3': { title: 'AuditBypassEnabled Not Set', title_he: 'AuditBypassEnabled לא מופעל', domain: 'exchange_online', severity: 'high', category: 'Exchange Audit' },
  'CIS-6.2.2': { title: 'Mail Transport No Domain Whitelist', title_he: 'Transport Rules ללא Whitelist דומיינים', domain: 'exchange_online', severity: 'high', category: 'Exchange Mail Flow' },
  'CIS-6.2.3': { title: 'External Senders Identified', title_he: 'שולחים חיצוניים מזוהים', domain: 'exchange_online', severity: 'medium', category: 'Exchange Mail Flow' },
  'CIS-6.5.2': { title: 'MailTips Enabled', title_he: 'MailTips מופעל', domain: 'exchange_online', severity: 'low', category: 'Exchange Settings' },
  'CIS-6.5.3': { title: 'OWA Additional Storage Restricted', title_he: 'אחסון נוסף ב-OWA מוגבל', domain: 'exchange_online', severity: 'medium', category: 'Exchange Settings' },
  'CIS-6.5.4': { title: 'SMTP AUTH Disabled', title_he: 'SMTP AUTH מושבת', domain: 'exchange_online', severity: 'high', category: 'Exchange Settings' },
  'CIS-6.5.5': { title: 'Direct Send Rejected', title_he: 'Direct Send נדחה', domain: 'exchange_online', severity: 'high', category: 'Exchange Settings' },
  // --- SharePoint Extended ---
  'CIS-7.2.2': { title: 'SharePoint B2B Integration Enabled', title_he: 'SharePoint B2B עם Entra מופעל', domain: 'sharepoint', severity: 'medium', category: 'SharePoint Policies' },
  'CIS-7.2.5': { title: 'Guests Cannot Reshare Content', title_he: 'אורחים לא יכולים לשתף תוכן מחדש', domain: 'sharepoint', severity: 'high', category: 'SharePoint Policies' },
  'CIS-7.2.6': { title: 'SharePoint External Sharing Restricted', title_he: 'שיתוף חיצוני SharePoint מוגבל', domain: 'sharepoint', severity: 'high', category: 'SharePoint Policies' },
  'CIS-7.2.7': { title: 'Default Sharing Link = Specific People', title_he: 'קישור שיתוף ברירת מחדל = אנשים ספציפיים', domain: 'sharepoint', severity: 'high', category: 'SharePoint Policies' },
  'CIS-7.2.8': { title: 'External Sharing Restricted by Security Group', title_he: 'שיתוף חיצוני מוגבל לקבוצת אבטחה', domain: 'sharepoint', severity: 'medium', category: 'SharePoint Policies' },
  'CIS-7.2.9': { title: 'Guest Access Expires Automatically', title_he: 'גישת אורח פוקעת אוטומטית', domain: 'sharepoint', severity: 'high', category: 'SharePoint Policies' },
  'CIS-7.2.10': { title: 'Verification Code Reauthentication Restricted', title_he: 'אימות קוד מוגבל לימים ספורים', domain: 'sharepoint', severity: 'medium', category: 'SharePoint Policies' },
  'CIS-7.2.11': { title: 'Default Sharing Link Permission = View', title_he: 'הרשאת קישור ברירת מחדל = View', domain: 'sharepoint', severity: 'medium', category: 'SharePoint Policies' },
  'CIS-7.3.2': { title: 'OneDrive Sync Restricted to Managed Devices', title_he: 'סנכרון OneDrive למכשירים מנוהלים בלבד', domain: 'sharepoint', severity: 'high', category: 'SharePoint Settings' },
  // --- Teams Extended ---
  'CIS-8.1.1': { title: 'Teams File Sharing - Approved Services Only', title_he: 'שיתוף קבצים Teams לשירותים מאושרים', domain: 'teams', severity: 'medium', category: 'Teams' },
  'CIS-8.1.2': { title: 'Teams Channel Email Disabled', title_he: 'דואר לכתובת ערוץ Teams מושבת', domain: 'teams', severity: 'medium', category: 'Teams' },
  'CIS-8.2.1': { title: 'Teams External Domains Restricted', title_he: 'דומיינים חיצוניים ב-Teams מוגבלים', domain: 'teams', severity: 'high', category: 'Teams' },
  'CIS-8.2.2': { title: 'Unmanaged Teams Users Communication Disabled', title_he: 'תקשורת עם Teams לא מנוהל מושבתת', domain: 'teams', severity: 'high', category: 'Teams' },
  'CIS-8.2.3': { title: 'External Teams Users Cannot Initiate', title_he: 'משתמשים חיצוניים לא יכולים ליזום שיחות', domain: 'teams', severity: 'medium', category: 'Teams' },
  'CIS-8.2.4': { title: 'No Communication with Trial Tenants', title_he: 'אין תקשורת עם Trial Tenants', domain: 'teams', severity: 'medium', category: 'Teams' },
  'CIS-8.5.1': { title: 'Anonymous Cannot Join Meetings', title_he: 'אנונימיים לא יכולים להצטרף לפגישות', domain: 'teams', severity: 'high', category: 'Teams Meetings' },
  'CIS-8.5.2': { title: 'Anonymous Cannot Start Meetings', title_he: 'אנונימיים לא יכולים להתחיל פגישות', domain: 'teams', severity: 'high', category: 'Teams Meetings' },
  'CIS-8.5.3': { title: 'Only Org Users Bypass Lobby', title_he: 'רק משתמשים פנימיים עוקפים לובי', domain: 'teams', severity: 'high', category: 'Teams Meetings' },
  'CIS-8.5.4': { title: 'Dial-in Cannot Bypass Lobby', title_he: 'מחייגים לא עוקפים לובי', domain: 'teams', severity: 'medium', category: 'Teams Meetings' },
  'CIS-8.5.5': { title: 'Meeting Chat No Anonymous', title_he: 'צ׳אט פגישה ללא אנונימיים', domain: 'teams', severity: 'medium', category: 'Teams Meetings' },
  'CIS-8.5.6': { title: 'Only Organizers Can Present', title_he: 'רק מארגנים יכולים להציג', domain: 'teams', severity: 'medium', category: 'Teams Meetings' },
  'CIS-8.5.7': { title: 'Externals Cannot Give/Request Control', title_he: 'חיצוניים לא יכולים לתת/לבקש שליטה', domain: 'teams', severity: 'high', category: 'Teams Meetings' },
  'CIS-8.5.8': { title: 'External Meeting Chat Off', title_he: 'צ׳אט עם חיצוניים בפגישה מושבת', domain: 'teams', severity: 'medium', category: 'Teams Meetings' },
  'CIS-8.5.9': { title: 'Meeting Recording Off by Default', title_he: 'הקלטת פגישות מושבתת כברירת מחדל', domain: 'teams', severity: 'medium', category: 'Teams Meetings' },
  'CIS-8.6.1': { title: 'Users Can Report Security Concerns in Teams', title_he: 'משתמשים יכולים לדווח על חששות אבטחה', domain: 'teams', severity: 'medium', category: 'Teams Messaging' },
  // --- Power BI / Fabric ---
  'CIS-9.1.1': { title: 'Fabric Guest Access Restricted', title_he: 'גישת אורחים ב-Fabric מוגבלת', domain: 'power_bi', severity: 'high', category: 'Power BI / Fabric' },
  'CIS-9.1.2': { title: 'Fabric External User Invitations Restricted', title_he: 'הזמנות חיצוניות ב-Fabric מוגבלות', domain: 'power_bi', severity: 'high', category: 'Power BI / Fabric' },
  'CIS-9.1.3': { title: 'Fabric Guest Content Access Restricted', title_he: 'גישת אורחים לתוכן Fabric מוגבלת', domain: 'power_bi', severity: 'high', category: 'Power BI / Fabric' },
  'CIS-9.1.4': { title: 'Fabric Publish to Web Restricted', title_he: 'Publish to Web ב-Fabric מוגבל', domain: 'power_bi', severity: 'critical', category: 'Power BI / Fabric' },
  'CIS-9.1.5': { title: 'R and Python Visuals Sharing Disabled', title_he: 'שיתוף ויזואליזציות R ו-Python מושבת', domain: 'power_bi', severity: 'medium', category: 'Power BI / Fabric' },
  'CIS-9.1.6': { title: 'Sensitivity Labels for Fabric Content', title_he: 'תוויות רגישות לתוכן Fabric', domain: 'power_bi', severity: 'high', category: 'Power BI / Fabric' },
  'CIS-9.1.7': { title: 'Fabric Shareable Links Restricted', title_he: 'קישורים לשיתוף ב-Fabric מוגבלים', domain: 'power_bi', severity: 'high', category: 'Power BI / Fabric' },
  'CIS-9.1.8': { title: 'Fabric External Data Sharing Restricted', title_he: 'שיתוף נתונים חיצוני ב-Fabric מוגבל', domain: 'power_bi', severity: 'high', category: 'Power BI / Fabric' },
  'CIS-9.1.9': { title: 'Fabric ResourceKey Auth Blocked', title_he: 'ResourceKey Auth ב-Fabric חסום', domain: 'power_bi', severity: 'high', category: 'Power BI / Fabric' },
  'CIS-9.1.10': { title: 'Fabric API Access by SP Restricted', title_he: 'גישת Service Principals ל-APIs מוגבלת', domain: 'power_bi', severity: 'high', category: 'Power BI / Fabric' },
  'CIS-9.1.11': { title: 'SP Cannot Create Fabric Profiles', title_he: 'Service Principals לא יוצרים פרופילים ב-Fabric', domain: 'power_bi', severity: 'medium', category: 'Power BI / Fabric' },
  'CIS-9.1.12': { title: 'SP Workspaces and Pipelines Restricted', title_he: 'יצירת Workspaces ו-Pipelines על ידי SP מוגבלת', domain: 'power_bi', severity: 'medium', category: 'Power BI / Fabric' },
};

const ALL_CHECKS = Object.keys(CHECK_META);

Deno.serve(async (req) => {
  _secureScoreCache = null;
  _exToken = null;
  _spoSettingsCache = null;
  _pbiToken = null;
  _pbiSettingsCache = null;

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { scan_job_id, tenant_record_id, customer_tenant_id, workspace_id, user_email } = await req.json();
  const resultOwner = user_email || user.email;
  if (!scan_job_id || !customer_tenant_id) {
    return Response.json({ error: 'scan_job_id and customer_tenant_id are required' }, { status: 400 });
  }

  await base44.asServiceRole.entities.ScanJob.update(scan_job_id, {
    status: 'running',
    started_at: new Date().toISOString(),
    total_checks: ALL_CHECKS.length,
    completed_checks: 0,
    progress: 0,
  });

  let token;
  try {
    token = await getAccessToken(customer_tenant_id);

      // Auto-assign Exchange Administrator role to our service principal in the customer tenant
    // This is required for Exchange.ManageAsApp to work
    try {
      const CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
      const EXCHANGE_ADMIN_ROLE_TEMPLATE_ID = '29232cdf-9323-42fd-ade2-1d097af3e4de';

      // Find our service principal in the customer tenant
      const spRes = await fetch(`https://graph.microsoft.com/v1.0/servicePrincipals?$filter=appId eq '${CLIENT_ID}'&$select=id`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const spData = await spRes.json();
      const spId = spData.value?.[0]?.id;

      if (spId) {
        // Get or activate Exchange Admin role
        let roleRes = await fetch(`https://graph.microsoft.com/v1.0/directoryRoles?$filter=roleTemplateId eq '${EXCHANGE_ADMIN_ROLE_TEMPLATE_ID}'`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        let roleData = await roleRes.json();
        let role = roleData.value?.[0];

        if (!role) {
          const activateRes = await fetch('https://graph.microsoft.com/v1.0/directoryRoles', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ roleTemplateId: EXCHANGE_ADMIN_ROLE_TEMPLATE_ID }),
          });
          role = await activateRes.json();
        }

        if (role?.id) {
          // Check if SP is already a member before trying to add
          const memberCheckRes = await fetch(`https://graph.microsoft.com/v1.0/directoryRoles/${role.id}/members?$filter=id eq '${spId}'&$select=id`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const memberCheckData = await memberCheckRes.json();
          const alreadyMember = (memberCheckData.value || []).length > 0;
          if (!alreadyMember) {
            await fetch(`https://graph.microsoft.com/v1.0/directoryRoles/${role.id}/members/$ref`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${spId}` }),
            });
            // Small delay to let the role propagate
            await new Promise(r => setTimeout(r, 3000));
          }
        }
      }
    } catch (_) { /* non-fatal */ }

    // Get tenant's initial domain for X-AnchorMailbox header (required by Exchange v2.0 API)
    try {
      const domainsRes = await graphGet(token, '/domains?$filter=isInitial eq true&$select=id');
      _tenantDomain = domainsRes?.value?.[0]?.id || null;
      console.log('Tenant domain for Exchange API:', _tenantDomain);
    } catch (_) { /* non-fatal */ }

    // Try Exchange token (non-fatal)
    _exToken = await getExchangeToken(customer_tenant_id).catch((e) => { console.error('Exchange token error:', e.message); return null; });
    // Try Power BI token (non-fatal)
    _pbiToken = await getPowerBiToken(customer_tenant_id).catch(() => null);
  } catch (err) {
    await base44.asServiceRole.entities.ScanJob.update(scan_job_id, {
      status: 'failed',
      error_message: `Authentication failed: ${err.message}`,
      completed_at: new Date().toISOString(),
    });
    return Response.json({ error: err.message }, { status: 400 });
  }

  const summary = { passed: 0, failed: 0, warning: 0, manual: 0, not_applicable: 0, error: 0 };
  const checkResultBatch = [];

  for (let i = 0; i < ALL_CHECKS.length; i++) {
    const checkId = ALL_CHECKS[i];
    let result;
    try {
      result = await runCheck(token, checkId);
    } catch (err) {
      result = { status: 'error', actual_value: err.message, expected_value: 'N/A', evidence: { error: err.message } };
    }
    const meta = CHECK_META[checkId];
    summary[result.status] = (summary[result.status] || 0) + 1;

    checkResultBatch.push({
      workspace_id: workspace_id || 'default',
      scan_job_id,
      tenant_id: tenant_record_id,
      check_id: checkId,
      check_title: meta.title,
      domain: meta.domain,
      category: meta.category,
      severity: meta.severity,
      status: result.status,
      actual_value: result.actual_value,
      expected_value: result.expected_value,
      evidence: JSON.stringify(result.evidence || {}),
      error_message: result.error_message,
      created_by: resultOwner,
    });

    // Update progress every 10 checks to avoid rate limiting
    if ((i + 1) % 10 === 0 || i === ALL_CHECKS.length - 1) {
      await base44.asServiceRole.entities.ScanJob.update(scan_job_id, {
        completed_checks: i + 1,
        progress: Math.round(((i + 1) / ALL_CHECKS.length) * 100),
      });
    }
  }

  // Bulk create all check results in batches of 25
  const BATCH_SIZE = 25;
  for (let i = 0; i < checkResultBatch.length; i += BATCH_SIZE) {
    await base44.asServiceRole.entities.CheckResult.bulkCreate(checkResultBatch.slice(i, i + BATCH_SIZE));
  }

  const totalScored = summary.passed + summary.failed + summary.warning;
  const score = totalScored > 0 ? Math.round((summary.passed / totalScored) * 100) : 0;

  await base44.asServiceRole.entities.ScanJob.update(scan_job_id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    progress: 100,
    overall_score: score,
    summary,
    domains_scanned: [...new Set(Object.values(CHECK_META).map(c => c.domain))],
  });

  if (tenant_record_id) {
    const existing = await base44.asServiceRole.entities.ConnectedTenant.filter({ id: tenant_record_id });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.ConnectedTenant.update(tenant_record_id, {
        last_scan_date: new Date().toISOString(),
        last_scan_score: score,
        total_scans: (existing[0].total_scans || 0) + 1,
        connection_status: 'connected',
      });
    }
  }

  return Response.json({ success: true, score, summary, total_checks: ALL_CHECKS.length });
});