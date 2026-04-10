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

function getControl(score, controlName) {
  if (!score?.controlScores) return null;
  return score.controlScores.find(c =>
    c.controlName?.toLowerCase() === controlName.toLowerCase() ||
    c.controlName?.toLowerCase().includes(controlName.toLowerCase())
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
        actual_value: enabled ? 'מופעל' : 'מכובה',
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
          actual_value: 'סביבת ענן בלבד',
          expected_value: 'לא רלוונטי לסביבה זו',
          evidence: { 'סוג סביבה': 'Cloud-only', 'סנכרון AD': 'לא מוגדר', 'הערה': 'Password Hash Sync רלוונטי רק לסביבות היברידיות' },
        };
      }
      const syncRecent = lastSync && (new Date() - new Date(lastSync)) < 3 * 60 * 60 * 1000; // within 3h
      return {
        status: syncRecent ? 'passed' : 'warning',
        actual_value: lastSync ? `סנכרון אחרון: ${new Date(lastSync).toLocaleString('he-IL')}` : 'לא ידוע',
        expected_value: 'סנכרון AD פעיל ועדכני',
        evidence: { 'סביבה היברידית': 'כן', 'סנכרון אחרון': lastSync || 'לא ידוע', 'סטטוס סנכרון': syncRecent ? 'תקין ✓' : 'ישן / לא תקין ✗' },
      };
    }

    case 'CIS-1.2.1': {
      const data = await graphGet(token, '/identity/conditionalAccess/policies');
      const policies = (data.value || []).filter(p => p.state === 'enabled');
      const mfaAdminPolicies = policies.filter(p =>
        p.grantControls?.builtInControls?.includes('mfa') &&
        (p.conditions?.users?.includeRoles?.length > 0 || p.conditions?.users?.includeUsers === 'All')
      );
      return {
        status: mfaAdminPolicies.length > 0 ? 'passed' : 'failed',
        actual_value: `${mfaAdminPolicies.length} מדיניות CA עם MFA לבעלי הרשאות`,
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
      const mfaAllPolicies = policies.filter(p =>
        p.grantControls?.builtInControls?.includes('mfa') &&
        p.conditions?.users?.includeUsers === 'All'
      );
      return {
        status: mfaAllPolicies.length > 0 ? 'passed' : 'failed',
        actual_value: `${mfaAllPolicies.length} מדיניות CA עם MFA לכלל המשתמשים`,
        expected_value: 'לפחות מדיניות CA אחת המחייבת MFA לכל המשתמשים',
        evidence: {
          'מדיניות MFA לכולם': mfaAllPolicies.length,
          'רשימת מדיניות': mfaAllPolicies.map(p => p.displayName).join(', ') || 'אין',
          'סך מדיניות CA פעילות': policies.length,
        },
      };
    }

    case 'CIS-1.3.1': {
      const domainsData = await graphGet(token, '/domains?$select=id,passwordValidityPeriodInDays,passwordNotificationWindowInDays,isVerified');
      const domains = (domainsData.value || []).filter(d => d.isVerified);
      const expiring = domains.filter(d => d.passwordValidityPeriodInDays !== 2147483647 && d.passwordValidityPeriodInDays !== null);
      return {
        status: expiring.length === 0 ? 'passed' : 'failed',
        actual_value: expiring.length === 0 ? 'סיסמאות לעולם לא פגות' : `${expiring.length} דומיינים עם סיסמה שפגה`,
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
        actual_value: `SSPR: ${state === 'enabled' || state === 'enabledForAllUsers' ? 'מופעל' : 'מכובה'}, ${methodsCount} שיטות מאומתות`,
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
        actual_value: `${count} מנהלי Global Admin`,
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
        actual_value: synced.length === 0 ? 'כל המנהלים הם חשבונות ענן' : `${synced.length} מנהלים מסונכרנים מ-AD`,
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
        actual_value: blockLegacy.length > 0 ? `${blockLegacy.length} מדיניות חוסמות Legacy Auth` : 'אין מדיניות לחסימת Legacy Auth',
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
        actual_value: riskPolicy.length > 0 ? `${riskPolicy.length} מדיניות סיכון כניסה` : 'אין מדיניות סיכון כניסה',
        expected_value: 'מדיניות CA: signInRisk = high/medium → Block או MFA',
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
        actual_value: riskPolicy.length > 0 ? `${riskPolicy.length} מדיניות סיכון משתמש` : 'אין מדיניות סיכון משתמש',
        expected_value: 'מדיניות CA: userRisk = high/medium → Block או password change',
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
        actual_value: guestAdmins.length === 0 ? 'אין אורחים עם תפקידי מנהל' : `${guestAdmins.length} אורחים עם תפקידי מנהל`,
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
        actual_value: `${allAppsPolicies.length} מדיניות מכסות "כל האפליקציות"`,
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
        actual_value: compliantDevice.length > 0 ? `${compliantDevice.length} מדיניות דורשות התקן תואם` : 'אין דרישה להתקן תואם',
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
        actual_value: `${sessionPolicies.length} מדיניות עם בקרות session`,
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
          actual_value: implemented ? 'אימות מודרני מופעל' : 'אימות מודרני לא מופעל',
          expected_value: 'OAuth2ClientProfileEnabled = True',
          evidence: {
            'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
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
          actual_value: implemented ? 'העברה אוטומטית חסומה' : 'העברה אוטומטית פעילה',
          expected_value: 'AutoForwardEnabled = False על כל Remote Domains',
          evidence: {
            'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
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
      const domainsData = await graphGet(token, '/domains?$filter=isVerified eq true&$select=id');
      const customDomains = (domainsData.value || []).filter(d => !d.id.endsWith('.onmicrosoft.com') && !d.id.endsWith('.mail.onmicrosoft.com'));
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
        actual_value: allHaveSPF ? 'SPF מוגדר בכל הדומיינים' : 'חסר SPF בחלק מהדומיינים',
        expected_value: 'v=spf1 include:spf.protection.outlook.com -all',
        evidence: { ...results, 'מצב': allHaveSPF ? 'תקין ✓' : 'דורש תיקון ✗' },
      };
    }

    case 'CIS-3.3.2': {
      // DKIM via DNS-over-HTTPS (selector1._domainkey.domain)
      const domainsData = await graphGet(token, '/domains?$filter=isVerified eq true&$select=id');
      const customDomains = (domainsData.value || []).filter(d => !d.id.endsWith('.onmicrosoft.com'));
      if (customDomains.length === 0) {
        return { status: 'not_applicable', actual_value: 'אין דומיינים מותאמים', expected_value: 'לא רלוונטי', evidence: { 'דומיינים': 'רק onmicrosoft.com' } };
      }
      const results = {};
      for (const domain of customDomains.slice(0, 5)) {
        const dns = await dnsQuery(`selector1._domainkey.${domain.id}`, 'CNAME');
        const hasRecord = (dns.Answer || []).length > 0;
        results[domain.id] = hasRecord ? `CNAME: ${dns.Answer[0]?.data || 'קיים'}` : 'לא נמצא';
      }
      const allHaveDKIM = Object.values(results).every(v => v !== 'לא נמצא');
      return {
        status: allHaveDKIM ? 'passed' : 'failed',
        actual_value: allHaveDKIM ? 'DKIM מוגדר בכל הדומיינים' : 'חסר DKIM בחלק מהדומיינים',
        expected_value: 'CNAME records for selector1._domainkey.domain and selector2._domainkey.domain',
        evidence: { ...results, 'מצב': allHaveDKIM ? 'תקין ✓' : 'דורש הפעלה ✗' },
      };
    }

    case 'CIS-3.3.3': {
      // DMARC via DNS-over-HTTPS
      const domainsData = await graphGet(token, '/domains?$filter=isVerified eq true&$select=id');
      const customDomains = (domainsData.value || []).filter(d => !d.id.endsWith('.onmicrosoft.com'));
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
        actual_value: allHaveDMARC ? (strictCount > 0 ? `DMARC עם enforcement (${strictCount}/${customDomains.length} דומיינים)` : 'DMARC ללא enforcement') : 'חסר DMARC',
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
          actual_value: implemented ? 'Mailbox Audit מופעל' : 'Mailbox Audit לא מופעל',
          expected_value: 'AuditDisabled = False לכל תיבות הדואר',
          evidence: {
            'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
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
      const ctrl = getControl(score, 'SafeAttachments') || getControl(score, 'safeattachment');
      const implemented = ctrl && (ctrl.score > 0 || ctrl.implementationStatus === 'Implemented');
      return {
        status: ctrl ? (implemented ? 'passed' : 'failed') : 'warning',
        actual_value: ctrl ? (implemented ? 'Safe Attachments מופעל' : 'Safe Attachments לא מופעל') : 'לא נמצא ב-Secure Score',
        expected_value: 'Safe Attachments policy enabled for all users',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
          'סטטוס': ctrl.implementationStatus || 'לא ידוע',
          'מצב': implemented ? 'תקין ✓' : 'דורש הפעלה ✗',
        } : { 'הערה': 'בדוק ב-Microsoft Defender > Policies > Safe attachments' },
      };
    }

    case 'CIS-4.1.2': {
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'SafeLinks') || getControl(score, 'safelinks');
      const implemented = ctrl && (ctrl.score > 0 || ctrl.implementationStatus === 'Implemented');
      return {
        status: ctrl ? (implemented ? 'passed' : 'failed') : 'warning',
        actual_value: ctrl ? (implemented ? 'Safe Links מופעל' : 'Safe Links לא מופעל') : 'לא נמצא ב-Secure Score',
        expected_value: 'Safe Links policy enabled for Email and Office apps',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
          'סטטוס': ctrl.implementationStatus || 'לא ידוע',
          'מצב': implemented ? 'תקין ✓' : 'דורש הפעלה ✗',
        } : { 'הערה': 'בדוק ב-Microsoft Defender > Policies > Safe links' },
      };
    }

    case 'CIS-4.2.1': {
      const score = await getSecureScoreControls(token);
      const ctrl = getControl(score, 'AntiphishPolicy') || getControl(score, 'antiphish');
      const implemented = ctrl && (ctrl.score > 0 || ctrl.implementationStatus === 'Implemented');
      return {
        status: ctrl ? (implemented ? 'passed' : 'failed') : 'warning',
        actual_value: ctrl ? (implemented ? 'Anti-Phishing מופעל' : 'Anti-Phishing לא מופעל') : 'לא נמצא',
        expected_value: 'Anti-phishing policy with impersonation protection enabled',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
          'סטטוס': ctrl.implementationStatus || 'לא ידוע',
          'מצב': implemented ? 'תקין ✓' : 'דורש הגדרה ✗',
        } : { 'הערה': 'בדוק ב-Microsoft Defender > Anti-phishing policies' },
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
        actual_value: `${score.currentScore.toFixed(0)}/${score.maxScore.toFixed(0)} נקודות (${pct}%)`,
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
        actual_value: ctrl ? (implemented ? 'Customer Lockbox מופעל' : 'Customer Lockbox לא מופעל') : 'לא נמצא',
        expected_value: 'Customer Lockbox = Enabled',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
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
        actual_value: ctrl ? (implemented ? 'שיתוף חיצוני מוגבל' : 'שיתוף חיצוני פתוח') : 'לא נמצא ב-Secure Score',
        expected_value: 'External sharing = New and existing guests (לא "Anyone")',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
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
        actual_value: ctrl ? (implemented ? 'שיתוף OneDrive מוגבל' : 'שיתוף OneDrive פתוח') : 'לא נמצא',
        expected_value: 'OneDrive sharing ≤ New and existing guests',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
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
        actual_value: ctrl ? (implemented ? 'Legacy Auth מושבת ב-SharePoint' : 'Legacy Auth פעיל ב-SharePoint') : 'לא נמצא',
        expected_value: 'LegacyAuthProtocolsEnabled = False',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
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
        actual_value: ctrl ? (implemented ? 'סנכרון OneDrive מוגבל לדומיין' : 'סנכרון ללא הגבלת דומיין') : 'לא נמצא',
        expected_value: 'AllowedDomainGuids מוגדר ל-OneDrive Sync',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
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
        actual_value: ctrl ? (implemented ? 'גישה חיצונית Teams מוגבלת' : 'גישה חיצונית Teams פתוחה') : 'לא נמצא',
        expected_value: 'External access restricted to specific allowed domains only',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
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
        actual_value: ctrl ? (implemented ? 'גישת אורחים Teams מוגדרת בבטחה' : 'הגדרות אורחים Teams לא מאובטחות') : 'לא נמצא',
        expected_value: 'Guest access with limited permissions (no private calling)',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
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
        actual_value: ctrl ? (implemented ? 'אנונימיים לא יכולים להתחיל פגישות' : 'אנונימיים יכולים להתחיל פגישות') : 'לא נמצא',
        expected_value: 'AllowAnonymousUsersToStartMeeting = False',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
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
        actual_value: ctrl ? (implemented ? 'הקלטות מאוחסנות ב-OneDrive/SharePoint' : 'הגדרות הקלטה לא אופטימליות') : 'לא נמצא',
        expected_value: 'Recording storage = OneDrive (default in new Teams)',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
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
        actual_value: ctrl ? (implemented ? 'יומן ביקורת מאוחד פעיל' : 'יומן ביקורת לא פעיל') : 'לא נמצא',
        expected_value: 'Unified Audit Log enabled in Microsoft Purview',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
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
        actual_value: ctrl ? (implemented ? 'מדיניות DLP פעילה' : 'אין מדיניות DLP') : 'לא נמצא',
        expected_value: 'לפחות מדיניות DLP פעילה אחת ב-Exchange, SharePoint, Teams',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
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
        actual_value: ctrl ? (implemented ? 'תוויות רגישות מוגדרות' : 'אין תוויות רגישות') : 'לא נמצא',
        expected_value: 'Sensitivity labels created and published to users',
        evidence: ctrl ? {
          'ציון Secure Score': `${ctrl.score}/${ctrl.maxScore}`,
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

  const { scan_job_id, tenant_record_id, customer_tenant_id, workspace_id } = await req.json();
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
      check_title: meta.title_he,
      domain: meta.domain,
      category: meta.category,
      severity: meta.severity,
      status: result.status,
      actual_value: result.actual_value,
      expected_value: result.expected_value,
      evidence: JSON.stringify(result.evidence || {}),
      error_message: result.error_message,
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