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

    default:
      return { status: 'error', actual_value: 'בדיקה לא מוכרת', expected_value: 'N/A', evidence: { error: `Unknown check: ${checkId}` } };
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
  'CIS-4.3.1': { title: 'Secure Score ≥ 60%', title_he: 'ציון אבטחה מינימלי 60%', domain: 'defender', severity: 'high', category: 'Secure Score' },
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
};

const ALL_CHECKS = Object.keys(CHECK_META);

Deno.serve(async (req) => {
  _secureScoreCache = null; // reset cache for each scan
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
  } catch (err) {
    await base44.asServiceRole.entities.ScanJob.update(scan_job_id, {
      status: 'failed',
      error_message: `Authentication failed: ${err.message}`,
      completed_at: new Date().toISOString(),
    });
    return Response.json({ error: err.message }, { status: 400 });
  }

  const summary = { passed: 0, failed: 0, warning: 0, manual: 0, not_applicable: 0, error: 0 };

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

    await base44.asServiceRole.entities.CheckResult.create({
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

    await base44.asServiceRole.entities.ScanJob.update(scan_job_id, {
      completed_checks: i + 1,
      progress: Math.round(((i + 1) / ALL_CHECKS.length) * 100),
    });
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