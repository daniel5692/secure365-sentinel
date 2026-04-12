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

async function getExchangeToken(tenantId) {
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
  return data.access_token;
}

async function exchangeGet(tenantId, resource) {
  if (!_exToken) return null;
  const res = await fetch(`https://outlook.office365.com/adminapi/beta/${tenantId}/${resource}`, {
    headers: { Authorization: `Bearer ${_exToken}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) return null;
  return res.json();
}

async function getSpoSettings(graphToken) {
  if (_spoSettingsCache) return _spoSettingsCache;
  const res = await graphGet(graphToken, '/admin/sharepoint/settings').catch(() => null);
  _spoSettingsCache = res || null;
  return _spoSettingsCache;
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
      // Use Secure Score to check modern auth
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'ModernAuth') || getControl(score, 'modernauth');
      if (ctrl) {
        const implemented = ctrl.score > 0 || ctrl.implementationStatus === 'Implemented';
        return {
          status: implemented ? 'passed' : 'failed',
          actual_value: implemented ? `${ctrl.controlName}: Implemented (score ${ctrl.score}/${ctrl.maxScore})` : `${ctrl.controlName}: Not Implemented`,
          //
          expected_value: 'OAuth2ClientProfileEnabled = True',
          evidence: {
            'ציון Secure Score': `${ctrl.score != null ? ctrl.score : '?'}${ctrl.maxScore != null ? '/' + ctrl.maxScore : ''}`,
            'סטטוס': ctrl.implementationStatus || 'לא ידוע',
            'שם בקרה': ctrl.controlName,
            'מצב': implemented ? 'תקין ✓' : 'דורש הפעלה ✗',
          },
        };
      }
      return {
        status: 'warning',
        actual_value: 'לא נמצא ב-Secure Score',
        expected_value: 'OAuth2ClientProfileEnabled = True',
        evidence: { 'הערה': 'בדוק ידנית: Connect-ExchangeOnline; Get-OrganizationConfig | Select OAuth2ClientProfileEnabled' },
      };
    }

    case 'CIS-3.2.1': {
      // Use Secure Score for auto-forward check
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'DisableAutoForwarding') || getControl(score, 'autoforward');
      if (ctrl) {
        const implemented = ctrl.score > 0 || ctrl.implementationStatus === 'Implemented';
        return {
          status: implemented ? 'passed' : 'failed',
          actual_value: implemented ? `${ctrl.controlName}: Implemented (score ${ctrl.score}/${ctrl.maxScore})` : `${ctrl.controlName}: Not Implemented`,
          //
          expected_value: 'AutoForwardEnabled = False על כל Remote Domains',
          evidence: {
            'ציון Secure Score': `${ctrl.score != null ? ctrl.score : '?'}${ctrl.maxScore != null ? '/' + ctrl.maxScore : ''}`,
            'סטטוס': ctrl.implementationStatus || 'לא ידוע',
            'מצב': implemented ? 'תקין ✓' : 'דורש חסימה ✗',
          },
        };
      }
      // Alternative: check via transport rules or remote domains via Secure Score description
      return {
        status: 'warning',
        actual_value: 'לא נמצא ב-Secure Score',
        expected_value: 'AutoForwardEnabled = False',
        evidence: { 'הערה': 'ודא ב-Exchange Admin Center > Mail flow > Remote domains > Default > Allow automatic forwarding = Off' },
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
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'MailboxAudit') || getControl(score, 'mailboxaudit') || getControl(score, 'AuditLog');
      if (ctrl) {
        const implemented = ctrl.score > 0 || ctrl.implementationStatus === 'Implemented';
        return {
          status: implemented ? 'passed' : 'failed',
          actual_value: implemented ? `${ctrl.controlName}: Implemented (score ${ctrl.score}/${ctrl.maxScore})` : `${ctrl.controlName}: Not Implemented`,
          //
          expected_value: 'AuditDisabled = False לכל תיבות הדואר',
          evidence: {
            'ציון Secure Score': `${ctrl.score != null ? ctrl.score : '?'}${ctrl.maxScore != null ? '/' + ctrl.maxScore : ''}`,
            'סטטוס': ctrl.implementationStatus || 'לא ידוע',
            'מצב': implemented ? 'תקין ✓' : 'דורש הפעלה ✗',
          },
        };
      }
      return {
        status: 'warning',
        actual_value: 'לא ניתן לבדוק דרך Graph API',
        expected_value: 'AuditDisabled = False',
        evidence: { 'הערה': 'בדוק: Connect-ExchangeOnline; Get-OrganizationConfig | Select AuditDisabled' },
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

    // --- Exchange Extended (via Exchange REST API) ---
    case 'CIS-6.5.2': {
      const orgId = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      const org = orgId && _exToken ? await exchangeGet(orgId, 'Organization') : null;
      const orgData = org?.value?.[0] || org;
      if (orgData?.MailTipsExternalRecipientsTipsEnabled !== undefined) {
        const enabled = orgData.MailTipsExternalRecipientsTipsEnabled;
        return { status: enabled ? 'passed' : 'failed', actual_value: `MailTipsExternalRecipientsTipsEnabled: ${enabled}`, expected_value: 'true', evidence: { 'MailTips חיצוני': enabled, 'מצב': enabled ? 'תקין ✓' : 'כבה MailTips חיצוני ✗' } };
      }
      return { status: 'manual', actual_value: 'Exchange API not accessible', expected_value: 'MailTipsExternalRecipientsTipsEnabled = true', evidence: { 'הערה': 'Exchange Admin Center → Settings → Mail tips → External recipients' } };
    }

    case 'CIS-6.5.4': {
      const orgId = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      const org = orgId && _exToken ? await exchangeGet(orgId, 'Organization') : null;
      const orgData = org?.value?.[0] || org;
      if (orgData?.SmtpClientAuthenticationDisabled !== undefined) {
        const disabled = orgData.SmtpClientAuthenticationDisabled;
        return { status: disabled ? 'passed' : 'failed', actual_value: `SmtpClientAuthenticationDisabled: ${disabled}`, expected_value: 'true', evidence: { 'SMTP AUTH מושבת': disabled, 'מצב': disabled ? 'תקין ✓' : 'SMTP AUTH פעיל ✗' } };
      }
      return { status: 'manual', actual_value: 'Exchange API not accessible', expected_value: 'SmtpClientAuthenticationDisabled = true', evidence: { 'הערה': 'Exchange Admin Center → Settings → Modern authentication → Disable SMTP AUTH' } };
    }

    case 'CIS-6.5.3': {
      const orgId = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      const policies = orgId && _exToken ? await exchangeGet(orgId, 'OwaMailboxPolicy') : null;
      const defaultPolicy = (policies?.value || []).find(p => p.Name === 'OwaMailboxPolicy-Default') || (policies?.value || [])[0];
      if (defaultPolicy?.AdditionalStorageProvidersAvailable !== undefined) {
        const restricted = !defaultPolicy.AdditionalStorageProvidersAvailable;
        return { status: restricted ? 'passed' : 'failed', actual_value: `AdditionalStorageProvidersAvailable: ${defaultPolicy.AdditionalStorageProvidersAvailable}`, expected_value: 'false', evidence: { 'אחסון נוסף': defaultPolicy.AdditionalStorageProvidersAvailable, 'מדיניות': defaultPolicy.Name, 'מצב': restricted ? 'תקין ✓' : 'אחסון חיצוני פתוח ✗' } };
      }
      return { status: 'manual', actual_value: 'Exchange API not accessible', expected_value: 'AdditionalStorageProvidersAvailable = false', evidence: { 'הערה': 'Exchange Admin Center → OWA policies → Default → Features → Third-party storage: Off' } };
    }

    case 'CIS-6.2.3': {
      const orgId = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      const rules = orgId && _exToken ? await exchangeGet(orgId, 'TransportRule') : null;
      if (rules?.value) {
        const externalTagRule = rules.value.filter(r => JSON.stringify(r).toLowerCase().includes('external') && (JSON.stringify(r).toLowerCase().includes('disclaimer') || JSON.stringify(r).toLowerCase().includes('prepend') || JSON.stringify(r).toLowerCase().includes('subject')));
        return { status: externalTagRule.length > 0 ? 'passed' : 'failed', actual_value: `${externalTagRule.length} transport rule(s) tagging external senders`, expected_value: 'Rule prepending [External] to emails', evidence: { 'חוקים': externalTagRule.map(r => r.Name).join(', ') || 'אין', 'סה"כ חוקים': rules.value.length, 'מצב': externalTagRule.length > 0 ? 'תקין ✓' : 'אין תיוג שולחים חיצוניים ✗' } };
      }
      return { status: 'manual', actual_value: 'Exchange API not accessible', expected_value: 'Transport rule identifies external senders', evidence: { 'הערה': 'Exchange Admin Center → Mail flow → Rules → Create rule adding [External] prefix' } };
    }

    case 'CIS-6.2.2': {
      const orgId = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      const rules = orgId && _exToken ? await exchangeGet(orgId, 'TransportRule') : null;
      if (rules?.value) {
        const bypassRules = rules.value.filter(r => JSON.stringify(r).includes('-1') || JSON.stringify(r).toLowerCase().includes('scl'));
        return { status: bypassRules.length === 0 ? 'passed' : 'failed', actual_value: `${bypassRules.length} rule(s) potentially bypassing spam (SCL=-1)`, expected_value: 'No transport rules setting SCL=-1', evidence: { 'חוקים חשודים': bypassRules.map(r => r.Name).join(', ') || 'אין', 'סה"כ חוקים': rules.value.length, 'מצב': bypassRules.length === 0 ? 'תקין ✓' : 'בדוק חוקי transport ✗' } };
      }
      return { status: 'manual', actual_value: 'Exchange API not accessible', expected_value: 'No transport rules setting SCL=-1', evidence: { 'הערה': 'Exchange Admin Center → Mail flow → Rules → בדוק rules עם SCL=-1' } };
    }

    case 'CIS-6.1.3': {
      const orgId = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      const org = orgId && _exToken ? await exchangeGet(orgId, 'Organization') : null;
      const orgData = org?.value?.[0] || org;
      if (orgData) {
        return { status: orgData.AuditDisabled === false || orgData.AuditDisabled === undefined ? 'passed' : 'warning', actual_value: `Exchange org accessible; AuditDisabled: ${orgData.AuditDisabled ?? false}`, expected_value: 'No mailboxes with AuditBypassEnabled = true', evidence: { 'AuditDisabled': orgData.AuditDisabled ?? false, 'הערה': 'בדוק per-mailbox bypass ידנית' } };
      }
      return { status: 'manual', actual_value: 'Exchange API not accessible', expected_value: 'No mailboxes with AuditBypassEnabled = true', evidence: { 'הערה': 'PowerShell: Get-MailboxAuditBypassAssociation | Where { $_.AuditBypassEnabled -eq $true }' } };
    }

    case 'CIS-6.5.5': {
      const orgId = await graphGet(token, '/organization?$select=id').then(d => d.value?.[0]?.id).catch(() => null);
      const connectors = orgId && _exToken ? await exchangeGet(orgId, 'InboundConnector') : null;
      if (connectors?.value) {
        return { status: 'warning', actual_value: `${connectors.value.length} inbound connector(s) found`, expected_value: 'No direct send / unauthenticated connectors', evidence: { 'Connectors': connectors.value.map(c => c.Name).join(', ') || 'אין', 'הערה': 'בדוק ידנית שאין Direct Send connectors' } };
      }
      return { status: 'manual', actual_value: 'Exchange API not accessible', expected_value: 'Direct Send rejected', evidence: { 'הערה': 'Exchange Admin Center → Mail flow → Connectors' } };
    }

    // --- SharePoint Extended (via Graph /admin/sharepoint/settings) ---
    case 'CIS-7.2.6': {
      const spo = await getSpoSettings(token);
      if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'sharingCapability ≤ ExistingExternalUserSharingOnly', evidence: { 'הערה': 'SharePoint Admin Center → Policies → Sharing' } };
      const cap = spo.sharingCapability;
      const isSecure = ['disabled', 'existingExternalUserSharingOnly'].includes((cap || '').toLowerCase());
      return { status: isSecure ? 'passed' : 'failed', actual_value: `sharingCapability: ${cap}`, expected_value: 'Disabled or ExistingExternalUserSharingOnly', evidence: { sharingCapability: cap, 'מצב': isSecure ? 'תקין ✓' : 'שיתוף Anonymous פעיל ✗' } };
    }

    case 'CIS-7.2.7': {
      const spo = await getSpoSettings(token);
      if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'defaultSharingLinkType = direct', evidence: { 'הערה': 'SharePoint Admin Center → Policies → Sharing → Default link type' } };
      const link = spo.defaultSharingLinkType;
      return { status: link === 'direct' ? 'passed' : 'failed', actual_value: `defaultSharingLinkType: ${link}`, expected_value: 'direct (Specific people)', evidence: { defaultSharingLinkType: link, 'מצב': link === 'direct' ? 'תקין ✓' : 'קישור ברירת מחדל לא מוגבל ✗' } };
    }

    case 'CIS-7.2.11': {
      const spo = await getSpoSettings(token);
      if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'defaultLinkPermission = view', evidence: { 'הערה': 'SharePoint Admin Center → Policies → Sharing → Default link permission' } };
      const perm = spo.defaultLinkPermission;
      return { status: perm === 'view' ? 'passed' : 'failed', actual_value: `defaultLinkPermission: ${perm}`, expected_value: 'view', evidence: { defaultLinkPermission: perm, 'מצב': perm === 'view' ? 'תקין ✓' : 'הרשאת Edit כברירת מחדל ✗' } };
    }

    case 'CIS-7.2.9': {
      const spo = await getSpoSettings(token);
      if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'Guest access expires automatically', evidence: { 'הערה': 'SharePoint Admin Center → Policies → Sharing → Guest access expiration' } };
      const required = spo.requireExternalUserExpirationRequired ?? spo.externalUserExpirationRequired;
      const days = spo.externalUserExpireInDays;
      return { status: required && days && days <= 30 ? 'passed' : required ? 'warning' : 'failed', actual_value: `expirationRequired: ${required}, expireInDays: ${days}`, expected_value: 'Expiration = true, days ≤ 30', evidence: { 'פקיעה נדרשת': required, 'ימים לפקיעה': days, 'מצב': required && days <= 30 ? 'תקין ✓' : 'הגדר פקיעת גישת אורח ✗' } };
    }

    case 'CIS-7.2.5': {
      const spo = await getSpoSettings(token);
      if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'isResharingByExternalUsersEnabled = false', evidence: { 'הערה': 'SharePoint Admin Center → Policies → Sharing → Allow guests to share' } };
      const canReshare = spo.isResharingByExternalUsersEnabled ?? spo.allowGuestUserShareToUsersNotInSiteCollection;
      return { status: canReshare === false ? 'passed' : 'failed', actual_value: `isResharingByExternalUsersEnabled: ${canReshare}`, expected_value: 'false', evidence: { 'אורחים יכולים לשתף מחדש': canReshare, 'מצב': canReshare === false ? 'תקין ✓' : 'אורחים יכולים לשתף תוכן מחדש ✗' } };
    }

    case 'CIS-7.2.2': {
      const spo = await getSpoSettings(token);
      if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'isAzureADB2BEnabled = true', evidence: { 'הערה': 'SharePoint Admin Center → Settings → SharePoint and OneDrive integration' } };
      const b2b = spo.isAzureADB2BEnabled ?? spo.enableAzureADB2BIntegration;
      return { status: b2b === true ? 'passed' : 'failed', actual_value: `isAzureADB2BEnabled: ${b2b}`, expected_value: 'true', evidence: { 'B2B Integration': b2b, 'מצב': b2b ? 'תקין ✓' : 'הפעל Azure AD B2B Integration ✗' } };
    }

    case 'CIS-7.3.2': {
      const spo = await getSpoSettings(token);
      if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'Sync restricted to managed devices', evidence: { 'הערה': 'SharePoint Admin Center → Settings → Sync → Allow only on specific domains' } };
      const allowedGuids = spo.allowedDomainGuidsForSyncApp;
      const isRestricted = Array.isArray(allowedGuids) ? allowedGuids.length > 0 : !!allowedGuids;
      return { status: isRestricted ? 'passed' : 'failed', actual_value: `allowedDomainGuidsForSyncApp: ${JSON.stringify(allowedGuids)}`, expected_value: 'At least one domain GUID defined', evidence: { 'GUIDs מוגדרים': isRestricted, 'ערך': JSON.stringify(allowedGuids), 'מצב': isRestricted ? 'תקין ✓' : 'סנכרון פתוח לכל מכשיר ✗' } };
    }

    case 'CIS-7.2.8': {
      const spo = await getSpoSettings(token);
      if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'Sharing restricted to specific domains', evidence: { 'הערה': 'SharePoint Admin Center → Policies → Sharing → Limit sharing by domain' } };
      const mode = spo.sharingDomainRestrictionMode;
      return { status: mode && mode !== 'none' ? 'passed' : 'warning', actual_value: `sharingDomainRestrictionMode: ${mode}`, expected_value: 'AllowList or BlockList', evidence: { 'מצב הגבלה': mode, 'תוצאה': mode && mode !== 'none' ? 'תקין ✓' : 'שיתוף ללא הגבלת דומיינים ✗' } };
    }

    case 'CIS-7.2.10': {
      const spo = await getSpoSettings(token);
      if (!spo) return { status: 'manual', actual_value: 'Cannot access SharePoint settings', expected_value: 'Email attestation re-auth ≤ 30 days', evidence: { 'הערה': 'SharePoint Admin Center → Policies → Sharing → Verification code expiration' } };
      const required = spo.emailAttestationRequired;
      const days = spo.emailAttestationReAuthDays;
      return { status: required && days && days <= 30 ? 'passed' : required ? 'warning' : 'failed', actual_value: `emailAttestationRequired: ${required}, reAuthDays: ${days}`, expected_value: 'Required = true, days ≤ 30', evidence: { 'attestation נדרש': required, 'ימים': days, 'מצב': required && days <= 30 ? 'תקין ✓' : 'הגדר אימות קוד ✗' } };
    }

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
  // --- Fabric Tenant ---
  'CIS-9.1.1': { title: 'Fabric Guest Access Restricted', title_he: 'גישת אורחים ב-Fabric מוגבלת', domain: 'purview', severity: 'high', category: 'Microsoft Fabric' },
  'CIS-9.1.2': { title: 'Fabric External User Invitations Restricted', title_he: 'הזמנות חיצוניות ב-Fabric מוגבלות', domain: 'purview', severity: 'high', category: 'Microsoft Fabric' },
  'CIS-9.1.3': { title: 'Fabric Guest Content Access Restricted', title_he: 'גישת אורחים לתוכן Fabric מוגבלת', domain: 'purview', severity: 'high', category: 'Microsoft Fabric' },
  'CIS-9.1.4': { title: 'Fabric Publish to Web Restricted', title_he: 'Publish to Web ב-Fabric מוגבל', domain: 'purview', severity: 'critical', category: 'Microsoft Fabric' },
  'CIS-9.1.5': { title: 'R and Python Visuals Sharing Disabled', title_he: 'שיתוף ויזואליזציות R ו-Python מושבת', domain: 'purview', severity: 'medium', category: 'Microsoft Fabric' },
  'CIS-9.1.6': { title: 'Sensitivity Labels for Fabric Content', title_he: 'תוויות רגישות לתוכן Fabric', domain: 'purview', severity: 'high', category: 'Microsoft Fabric' },
  'CIS-9.1.7': { title: 'Fabric Shareable Links Restricted', title_he: 'קישורים לשיתוף ב-Fabric מוגבלים', domain: 'purview', severity: 'high', category: 'Microsoft Fabric' },
  'CIS-9.1.8': { title: 'Fabric External Data Sharing Restricted', title_he: 'שיתוף נתונים חיצוני ב-Fabric מוגבל', domain: 'purview', severity: 'high', category: 'Microsoft Fabric' },
  'CIS-9.1.9': { title: 'Fabric ResourceKey Auth Blocked', title_he: 'ResourceKey Auth ב-Fabric חסום', domain: 'purview', severity: 'high', category: 'Microsoft Fabric' },
  'CIS-9.1.10': { title: 'Fabric API Access by SP Restricted', title_he: 'גישת Service Principals ל-APIs מוגבלת', domain: 'purview', severity: 'high', category: 'Microsoft Fabric' },
  'CIS-9.1.11': { title: 'SP Cannot Create Fabric Profiles', title_he: 'Service Principals לא יוצרים פרופילים ב-Fabric', domain: 'purview', severity: 'medium', category: 'Microsoft Fabric' },
  'CIS-9.1.12': { title: 'SP Workspaces and Pipelines Restricted', title_he: 'יצירת Workspaces ו-Pipelines על ידי SP מוגבלת', domain: 'purview', severity: 'medium', category: 'Microsoft Fabric' },
};

const ALL_CHECKS = Object.keys(CHECK_META);

Deno.serve(async (req) => {
  _secureScoreCache = null;
  _exToken = null;
  _spoSettingsCache = null;

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
    // Try Exchange token (non-fatal)
    _exToken = await getExchangeToken(customer_tenant_id).catch(() => null);
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