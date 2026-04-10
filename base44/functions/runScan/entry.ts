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

// =============================================
// CIS Microsoft 365 Foundations Benchmark v6.0.1
// =============================================

async function runCheck(token, checkId) {
  try {
    switch (checkId) {

      // --- SECTION 1: Microsoft Entra ID ---

      case 'CIS-1.1.1': {
        // Security Defaults disabled (assume org uses CA)
        const data = await graphGet(token, '/policies/identitySecurityDefaultsEnforcementPolicy');
        const enabled = data.isEnabled;
        return { status: enabled ? 'failed' : 'passed', actual_value: `Security Defaults: ${enabled ? 'מופעל' : 'מכובה'}`, evidence: JSON.stringify({ isEnabled: enabled }) };
      }

      case 'CIS-1.1.2': {
        // Password hash sync - check via organization settings
        const data = await graphGet(token, '/organization');
        const org = data.value?.[0];
        return { status: 'manual', actual_value: `ארגון: ${org?.displayName}`, evidence: JSON.stringify({ note: 'בדוק ב-Entra Connect שסנכרון גיבוב סיסמאות מופעל' }) };
      }

      case 'CIS-1.2.1': {
        // MFA for all privileged users via CA
        const data = await graphGet(token, '/identity/conditionalAccess/policies');
        const policies = data.value || [];
        const mfaAdminPolicies = policies.filter(p =>
          p.state === 'enabled' &&
          p.grantControls?.builtInControls?.includes('mfa') &&
          (p.conditions?.users?.includeRoles?.length > 0 || p.conditions?.users?.includeUsers === 'All')
        );
        const status = mfaAdminPolicies.length > 0 ? 'passed' : 'failed';
        return { status, actual_value: `${mfaAdminPolicies.length} מדיניות MFA לבעלי הרשאות`, evidence: JSON.stringify({ policies: mfaAdminPolicies.map(p => p.displayName) }) };
      }

      case 'CIS-1.2.2': {
        // MFA for all users
        const data = await graphGet(token, '/identity/conditionalAccess/policies');
        const policies = data.value || [];
        const mfaAll = policies.filter(p =>
          p.state === 'enabled' &&
          p.grantControls?.builtInControls?.includes('mfa') &&
          (p.conditions?.users?.includeUsers === 'All' || p.conditions?.users?.includeGroups?.length > 0)
        );
        const status = mfaAll.length > 0 ? 'passed' : 'failed';
        return { status, actual_value: `${mfaAll.length} מדיניות MFA לכלל המשתמשים`, evidence: JSON.stringify({ policies: mfaAll.map(p => p.displayName) }) };
      }

      case 'CIS-1.3.1': {
        // Password never expires policy
        const data = await graphGet(token, '/domains');
        const domains = data.value || [];
        const passwordNeverExpires = domains.filter(d => d.passwordNotificationWindowInDays !== null);
        return { status: 'manual', actual_value: `${domains.length} דומיינים`, evidence: JSON.stringify({ domains: domains.map(d => d.id), note: 'בדוק ב-Microsoft 365 Admin Center > Settings > Org settings > Password expiration' }) };
      }

      case 'CIS-1.3.3': {
        // SSPR - 2 methods required
        const data = await graphGet(token, '/policies/authenticationMethodsPolicy');
        const registrationRequirement = data.registrationEnforcement;
        return { status: data ? 'manual' : 'failed', actual_value: 'בדיקה ידנית נדרשת', evidence: JSON.stringify({ note: 'ודא שנדרשות 2 שיטות לאיפוס סיסמה ב-Entra > Protection > Password reset' }) };
      }

      case 'CIS-1.4.1': {
        // Global admin count 2-4
        const roles = await graphGet(token, '/directoryRoles?$filter=roleTemplateId eq \'62e90394-69f5-4237-9190-012177145e10\'');
        let count = 0;
        if (roles.value?.length > 0) {
          const members = await graphGet(token, `/directoryRoles/${roles.value[0].id}/members`);
          count = (members.value || []).length;
        }
        const status = count >= 2 && count <= 4 ? 'passed' : 'failed';
        return { status, actual_value: `${count} מנהלי Global Admin`, evidence: JSON.stringify({ count }) };
      }

      case 'CIS-1.4.2': {
        // Privileged accounts should be cloud-only (check for synced users in admin roles)
        const roles = await graphGet(token, '/directoryRoles?$filter=roleTemplateId eq \'62e90394-69f5-4237-9190-012177145e10\'');
        if (!roles.value?.length) return { status: 'passed', actual_value: 'לא נמצאו מנהלים', evidence: '{}' };
        const members = await graphGet(token, `/directoryRoles/${roles.value[0].id}/members?$select=displayName,userPrincipalName,onPremisesSyncEnabled`);
        const syncedAdmins = (members.value || []).filter(u => u.onPremisesSyncEnabled === true);
        const status = syncedAdmins.length === 0 ? 'passed' : 'failed';
        return { status, actual_value: `${syncedAdmins.length} מנהלים מסונכרנים מ-AD מקומי`, evidence: JSON.stringify({ synced_admins: syncedAdmins.map(u => u.userPrincipalName) }) };
      }

      case 'CIS-1.5.1': {
        // Block legacy authentication via CA
        const data = await graphGet(token, '/identity/conditionalAccess/policies');
        const policies = data.value || [];
        const blockLegacy = policies.filter(p =>
          p.state === 'enabled' &&
          p.grantControls?.builtInControls?.includes('block') &&
          p.conditions?.clientAppTypes?.some(t => ['exchangeActiveSync', 'other'].includes(t))
        );
        const status = blockLegacy.length > 0 ? 'passed' : 'failed';
        return { status, actual_value: `${blockLegacy.length} מדיניות חוסמות Legacy Auth`, evidence: JSON.stringify({ policies: blockLegacy.map(p => p.displayName) }) };
      }

      case 'CIS-1.6.1': {
        // Sign-in risk policy (high risk → block or MFA)
        const data = await graphGet(token, '/identity/conditionalAccess/policies');
        const policies = data.value || [];
        const riskPolicy = policies.filter(p =>
          p.state === 'enabled' &&
          p.conditions?.signInRiskLevels?.some(r => ['high', 'medium'].includes(r)) &&
          (p.grantControls?.builtInControls?.includes('block') || p.grantControls?.builtInControls?.includes('mfa'))
        );
        const status = riskPolicy.length > 0 ? 'passed' : 'failed';
        return { status, actual_value: `${riskPolicy.length} מדיניות סיכון כניסה`, evidence: JSON.stringify({ policies: riskPolicy.map(p => p.displayName) }) };
      }

      case 'CIS-1.6.2': {
        // User risk policy (high risk → block or require password change)
        const data = await graphGet(token, '/identity/conditionalAccess/policies');
        const policies = data.value || [];
        const riskPolicy = policies.filter(p =>
          p.state === 'enabled' &&
          p.conditions?.userRiskLevels?.some(r => ['high', 'medium'].includes(r)) &&
          (p.grantControls?.builtInControls?.includes('block') || p.grantControls?.builtInControls?.includes('passwordChange'))
        );
        const status = riskPolicy.length > 0 ? 'passed' : 'failed';
        return { status, actual_value: `${riskPolicy.length} מדיניות סיכון משתמש`, evidence: JSON.stringify({ policies: riskPolicy.map(p => p.displayName) }) };
      }

      case 'CIS-1.7.1': {
        // No guest users with admin roles
        const guestUsers = await graphGet(token, '/users?$filter=userType eq \'Guest\'&$select=displayName,userPrincipalName,id&$top=100');
        // Check if any guest has directory roles
        let guestAdmins = [];
        for (const guest of (guestUsers.value || []).slice(0, 20)) {
          const memberOf = await graphGet(token, `/users/${guest.id}/memberOf/microsoft.graph.directoryRole`).catch(() => ({ value: [] }));
          if ((memberOf.value || []).length > 0) guestAdmins.push(guest.userPrincipalName);
        }
        const status = guestAdmins.length === 0 ? 'passed' : 'failed';
        return { status, actual_value: `${guestAdmins.length} אורחים עם תפקידי ניהול`, evidence: JSON.stringify({ guest_admins: guestAdmins }) };
      }

      // --- SECTION 2: Conditional Access ---

      case 'CIS-2.1.1': {
        // All cloud apps covered by CA policy
        const data = await graphGet(token, '/identity/conditionalAccess/policies');
        const policies = data.value || [];
        const allAppsPolicies = policies.filter(p =>
          p.state === 'enabled' &&
          (p.conditions?.applications?.includeApplications?.includes('All') || p.conditions?.applications?.includeApplications?.includes('all'))
        );
        const status = allAppsPolicies.length > 0 ? 'passed' : 'failed';
        return { status, actual_value: `${allAppsPolicies.length} מדיניות מכסות כל האפליקציות`, evidence: JSON.stringify({ policies: allAppsPolicies.map(p => p.displayName) }) };
      }

      case 'CIS-2.1.2': {
        // Device compliance required
        const data = await graphGet(token, '/identity/conditionalAccess/policies');
        const policies = data.value || [];
        const compliantDevice = policies.filter(p =>
          p.state === 'enabled' &&
          p.grantControls?.builtInControls?.includes('compliantDevice')
        );
        const status = compliantDevice.length > 0 ? 'passed' : 'failed';
        return { status, actual_value: `${compliantDevice.length} מדיניות דורשות התקן תואם`, evidence: JSON.stringify({ policies: compliantDevice.map(p => p.displayName) }) };
      }

      case 'CIS-2.1.3': {
        // Session controls - sign-in frequency or persistent browser session
        const data = await graphGet(token, '/identity/conditionalAccess/policies');
        const policies = data.value || [];
        const sessionPolicies = policies.filter(p =>
          p.state === 'enabled' &&
          (p.sessionControls?.signInFrequency || p.sessionControls?.persistentBrowser)
        );
        const status = sessionPolicies.length > 0 ? 'passed' : 'warning';
        return { status, actual_value: `${sessionPolicies.length} מדיניות עם בקרות session`, evidence: JSON.stringify({ policies: sessionPolicies.map(p => p.displayName) }) };
      }

      // --- SECTION 3: Exchange Online ---

      case 'CIS-3.1.1': {
        // Modern authentication for Exchange Online
        return { status: 'manual', actual_value: 'בדיקה ידנית', evidence: JSON.stringify({ note: 'הפעל: Connect-ExchangeOnline ואז Get-OrganizationConfig | Select-Object OAuth2ClientProfileEnabled' }) };
      }

      case 'CIS-3.2.1': {
        // Auto-forwarding to external domains disabled
        return { status: 'manual', actual_value: 'בדיקה ידנית', evidence: JSON.stringify({ note: 'בדוק ב-Exchange Admin Center > Mail flow > Remote domains > Default > Allow automatic forwarding = No' }) };
      }

      case 'CIS-3.3.1': {
        // SPF records for all domains
        const domains = await graphGet(token, '/domains?$filter=isVerified eq true');
        const customDomains = (domains.value || []).filter(d => !d.id.endsWith('.onmicrosoft.com'));
        return {
          status: customDomains.length > 0 ? 'manual' : 'not_applicable',
          actual_value: `${customDomains.length} דומיינים מותאמים אישית`,
          evidence: JSON.stringify({ domains: customDomains.map(d => d.id), note: 'ודא שרשומת SPF קיימת לכל דומיין: v=spf1 include:spf.protection.outlook.com -all' })
        };
      }

      case 'CIS-3.3.2': {
        // DKIM enabled for all custom domains
        const domains = await graphGet(token, '/domains?$filter=isVerified eq true');
        const customDomains = (domains.value || []).filter(d => !d.id.endsWith('.onmicrosoft.com'));
        return {
          status: customDomains.length > 0 ? 'manual' : 'not_applicable',
          actual_value: `${customDomains.length} דומיינים לבדיקה`,
          evidence: JSON.stringify({ domains: customDomains.map(d => d.id), note: 'ודא DKIM מופעל ב-Exchange Admin Center > Mail flow > DKIM' })
        };
      }

      case 'CIS-3.3.3': {
        // DMARC policy
        const domains = await graphGet(token, '/domains?$filter=isVerified eq true');
        const customDomains = (domains.value || []).filter(d => !d.id.endsWith('.onmicrosoft.com'));
        return {
          status: customDomains.length > 0 ? 'manual' : 'not_applicable',
          actual_value: `${customDomains.length} דומיינים לבדיקה`,
          evidence: JSON.stringify({ domains: customDomains.map(d => d.id), note: 'ודא רשומת DMARC עם p=reject או p=quarantine: _dmarc.yourdomain.com' })
        };
      }

      case 'CIS-3.4.1': {
        // Mailbox audit logging enabled globally
        return { status: 'manual', actual_value: 'בדיקה ידנית', evidence: JSON.stringify({ note: 'Get-OrganizationConfig | Select AuditDisabled - צריך להיות False' }) };
      }

      // --- SECTION 4: Microsoft Defender for Office 365 ---

      case 'CIS-4.1.1': {
        // Safe Attachments policy exists and enabled
        const score = await graphGet(token, '/security/secureScores?$top=1', 'v1.0');
        const latest = score.value?.[0];
        const ctrl = latest?.controlScores?.find(c => c.controlName === 'SafeAttachments');
        const status = ctrl ? (ctrl.score > 0 ? 'passed' : 'failed') : 'manual';
        return { status, actual_value: ctrl ? `ציון: ${ctrl.score}/${ctrl.maxScore}` : 'בדיקה ידנית', evidence: JSON.stringify(ctrl || { note: 'בדוק ב-Microsoft Defender > Email & Collaboration > Policies > Safe Attachments' }) };
      }

      case 'CIS-4.1.2': {
        // Safe Links policy exists and enabled
        const score = await graphGet(token, '/security/secureScores?$top=1', 'v1.0');
        const latest = score.value?.[0];
        const ctrl = latest?.controlScores?.find(c => c.controlName === 'SafeLinks');
        const status = ctrl ? (ctrl.score > 0 ? 'passed' : 'failed') : 'manual';
        return { status, actual_value: ctrl ? `ציון: ${ctrl.score}/${ctrl.maxScore}` : 'בדיקה ידנית', evidence: JSON.stringify(ctrl || { note: 'בדוק ב-Microsoft Defender > Email & Collaboration > Policies > Safe Links' }) };
      }

      case 'CIS-4.2.1': {
        // Anti-phishing policy
        const score = await graphGet(token, '/security/secureScores?$top=1', 'v1.0');
        const latest = score.value?.[0];
        const ctrl = latest?.controlScores?.find(c => c.controlName === 'AntiphishPolicy' || c.controlName?.includes('phish'));
        const status = ctrl ? (ctrl.score > 0 ? 'passed' : 'failed') : 'manual';
        return { status, actual_value: ctrl ? `ציון: ${ctrl.score}/${ctrl.maxScore}` : 'בדיקה ידנית', evidence: JSON.stringify(ctrl || { note: 'בדוק ב-Microsoft Defender > Anti-phishing policies' }) };
      }

      case 'CIS-4.3.1': {
        // Microsoft Secure Score - retrieve overall
        const score = await graphGet(token, '/security/secureScores?$top=1', 'v1.0');
        const latest = score.value?.[0];
        const pct = latest ? Math.round((latest.currentScore / latest.maxScore) * 100) : null;
        const status = pct === null ? 'manual' : pct >= 60 ? 'passed' : pct >= 40 ? 'warning' : 'failed';
        return { status, actual_value: latest ? `${latest.currentScore}/${latest.maxScore} (${pct}%)` : 'לא זמין', evidence: JSON.stringify({ currentScore: latest?.currentScore, maxScore: latest?.maxScore }) };
      }

      case 'CIS-4.4.1': {
        // Customer Lockbox enabled
        return { status: 'manual', actual_value: 'בדיקה ידנית', evidence: JSON.stringify({ note: 'בדוק ב-Microsoft 365 Admin Center > Settings > Org Settings > Security & Privacy > Customer Lockbox' }) };
      }

      // --- SECTION 5: SharePoint Online ---

      case 'CIS-5.1.1': {
        // SharePoint external sharing not set to "Anyone"
        return { status: 'manual', actual_value: 'בדיקה ידנית', evidence: JSON.stringify({ note: 'בדוק ב-SharePoint Admin Center > Policies > Sharing > External sharing = New and existing guests or Only people in your org' }) };
      }

      case 'CIS-5.1.2': {
        // OneDrive external sharing
        return { status: 'manual', actual_value: 'בדיקה ידנית', evidence: JSON.stringify({ note: 'בדוק ב-SharePoint Admin Center > OneDrive > Sharing - לא צריך להיות "Anyone with the link"' }) };
      }

      case 'CIS-5.2.1': {
        // SharePoint legacy auth disabled
        return { status: 'manual', actual_value: 'בדיקה ידנית', evidence: JSON.stringify({ note: 'Get-SPOTenant | Select-Object LegacyAuthProtocolsEnabled - צריך להיות False' }) };
      }

      case 'CIS-5.3.1': {
        // Sync only to domain-joined devices
        return { status: 'manual', actual_value: 'בדיקה ידנית', evidence: JSON.stringify({ note: 'בדוק ב-SharePoint Admin Center > Settings > OneDrive sync - הגבל לדומיין ספציפי' }) };
      }

      // --- SECTION 6: Microsoft Teams ---

      case 'CIS-6.1.1': {
        // External access in Teams - restrict unknown domains
        return { status: 'manual', actual_value: 'בדיקה ידנית', evidence: JSON.stringify({ note: 'בדוק ב-Teams Admin Center > Users > External access - הגבל לדומיינים ידועים בלבד' }) };
      }

      case 'CIS-6.1.2': {
        // Guest access in Teams - reviewed and controlled
        return { status: 'manual', actual_value: 'בדיקה ידנית', evidence: JSON.stringify({ note: 'בדוק ב-Teams Admin Center > Users > Guest access - ודא שהגדרות ברמה נמוכה (ללא שיחות פרטיות, ללא קבלות הודעה)' }) };
      }

      case 'CIS-6.2.1': {
        // Anonymous users cannot start meetings
        return { status: 'manual', actual_value: 'בדיקה ידנית', evidence: JSON.stringify({ note: 'Teams Admin Center > Meetings > Meeting policies > Allow anonymous users to start a meeting = Off' }) };
      }

      case 'CIS-6.3.1': {
        // Meeting recordings stored in OneDrive/SharePoint only
        return { status: 'manual', actual_value: 'בדיקה ידנית', evidence: JSON.stringify({ note: 'Teams Admin Center > Meetings > Meeting policies > Meeting recording storage location = OneDrive' }) };
      }

      // --- SECTION 7: Microsoft Purview ---

      case 'CIS-7.1.1': {
        // Audit log search enabled
        const score = await graphGet(token, '/security/secureScores?$top=1', 'v1.0');
        const latest = score.value?.[0];
        const ctrl = latest?.controlScores?.find(c => c.controlName === 'AuditLogSearch' || c.controlName?.toLowerCase().includes('audit'));
        const status = ctrl ? (ctrl.score > 0 ? 'passed' : 'failed') : 'manual';
        return { status, actual_value: ctrl ? `ציון: ${ctrl.score}/${ctrl.maxScore}` : 'בדיקה ידנית', evidence: JSON.stringify(ctrl || { note: 'ודא ב-Purview > Audit שחיפוש יומן ביקורת מופעל' }) };
      }

      case 'CIS-7.2.1': {
        // DLP policy exists
        return { status: 'manual', actual_value: 'בדיקה ידנית', evidence: JSON.stringify({ note: 'ודא שקיימת לפחות מדיניות DLP אחת פעילה ב-Microsoft Purview > Data loss prevention' }) };
      }

      case 'CIS-7.3.1': {
        // Sensitivity labels enabled
        return { status: 'manual', actual_value: 'בדיקה ידנית', evidence: JSON.stringify({ note: 'בדוק ב-Microsoft Purview > Information protection > Labels - ודא שתוויות רגישות מוגדרות ומפורסמות' }) };
      }

      default:
        return { status: 'manual', actual_value: 'בדיקה לא ממופה', evidence: '' };
    }
  } catch (err) {
    return { status: 'error', error_message: err.message, actual_value: null, evidence: null };
  }
}

// CIS M365 v6.0.1 - Full check metadata
const CHECK_META = {
  // Section 1 - Entra ID
  'CIS-1.1.1': { title: 'Security Defaults Disabled', title_he: 'הגדרות ברירת מחדל לאבטחה מכובות', domain: 'entra_id', severity: 'high', category: 'Entra ID' },
  'CIS-1.1.2': { title: 'Password Hash Sync Enabled', title_he: 'סנכרון גיבוב סיסמאות מופעל', domain: 'entra_id', severity: 'medium', category: 'Entra ID' },
  'CIS-1.2.1': { title: 'MFA for Privileged Users', title_he: 'MFA לבעלי הרשאות מוגברות', domain: 'entra_id', severity: 'critical', category: 'Entra ID' },
  'CIS-1.2.2': { title: 'MFA for All Users', title_he: 'MFA לכלל המשתמשים', domain: 'entra_id', severity: 'critical', category: 'Entra ID' },
  'CIS-1.3.1': { title: 'Password Never Expires', title_he: 'סיסמאות ענן לא פגות', domain: 'entra_id', severity: 'medium', category: 'Entra ID' },
  'CIS-1.3.3': { title: 'SSPR Requires 2 Methods', title_he: 'איפוס סיסמה עצמאי דורש 2 שיטות', domain: 'entra_id', severity: 'medium', category: 'Entra ID' },
  'CIS-1.4.1': { title: 'Global Admin Count 2-4', title_he: 'מספר מנהלי Global Admin: בין 2 ל-4', domain: 'entra_id', severity: 'critical', category: 'Entra ID' },
  'CIS-1.4.2': { title: 'Cloud-Only Admin Accounts', title_he: 'חשבונות מנהל ייעודיים בענן בלבד', domain: 'entra_id', severity: 'high', category: 'Entra ID' },
  'CIS-1.5.1': { title: 'Block Legacy Authentication', title_he: 'חסימת אימות Legacy', domain: 'conditional_access', severity: 'critical', category: 'Conditional Access' },
  'CIS-1.6.1': { title: 'Sign-in Risk Policy (High/Medium → Block)', title_he: 'מדיניות סיכון כניסה: חסימה בסיכון גבוה/בינוני', domain: 'conditional_access', severity: 'critical', category: 'Conditional Access' },
  'CIS-1.6.2': { title: 'User Risk Policy (High → Block/Password Change)', title_he: 'מדיניות סיכון משתמש: חסימה/שינוי סיסמה בסיכון גבוה', domain: 'conditional_access', severity: 'critical', category: 'Conditional Access' },
  'CIS-1.7.1': { title: 'No Guest Users with Admin Roles', title_he: 'אין משתמשי אורח עם תפקידי מנהל', domain: 'entra_id', severity: 'critical', category: 'Entra ID' },

  // Section 2 - Conditional Access
  'CIS-2.1.1': { title: 'CA Covers All Cloud Apps', title_he: 'גישה מותנית מכסה את כל אפליקציות הענן', domain: 'conditional_access', severity: 'high', category: 'Conditional Access' },
  'CIS-2.1.2': { title: 'Compliant Device Required', title_he: 'נדרש התקן תואם מדיניות', domain: 'conditional_access', severity: 'high', category: 'Conditional Access' },
  'CIS-2.1.3': { title: 'Session Sign-in Frequency Configured', title_he: 'תדירות כניסה מחדש מוגדרת', domain: 'conditional_access', severity: 'medium', category: 'Conditional Access' },

  // Section 3 - Exchange Online
  'CIS-3.1.1': { title: 'Modern Authentication Enabled', title_he: 'אימות מודרני מופעל ב-Exchange Online', domain: 'exchange_online', severity: 'high', category: 'Exchange Online' },
  'CIS-3.2.1': { title: 'Auto-Forward to External Disabled', title_he: 'העברה אוטומטית לחוץ מושבתת', domain: 'exchange_online', severity: 'critical', category: 'Exchange Online' },
  'CIS-3.3.1': { title: 'SPF Record Configured', title_he: 'רשומת SPF מוגדרת לכל הדומיינים', domain: 'mail_flow', severity: 'high', category: 'Mail Flow' },
  'CIS-3.3.2': { title: 'DKIM Enabled', title_he: 'DKIM מופעל לכל הדומיינים', domain: 'mail_flow', severity: 'high', category: 'Mail Flow' },
  'CIS-3.3.3': { title: 'DMARC Policy Configured', title_he: 'מדיניות DMARC מוגדרת', domain: 'mail_flow', severity: 'high', category: 'Mail Flow' },
  'CIS-3.4.1': { title: 'Mailbox Audit Logging Enabled', title_he: 'תיעוד ביקורת תיבות דואר מופעל', domain: 'exchange_online', severity: 'high', category: 'Exchange Online' },

  // Section 4 - Defender
  'CIS-4.1.1': { title: 'Safe Attachments Policy Enabled', title_he: 'מדיניות Safe Attachments פעילה', domain: 'defender', severity: 'high', category: 'Defender for Office 365' },
  'CIS-4.1.2': { title: 'Safe Links Policy Enabled', title_he: 'מדיניות Safe Links פעילה', domain: 'defender', severity: 'high', category: 'Defender for Office 365' },
  'CIS-4.2.1': { title: 'Anti-Phishing Policy Configured', title_he: 'מדיניות אנטי-פישינג מוגדרת', domain: 'defender', severity: 'critical', category: 'Defender for Office 365' },
  'CIS-4.3.1': { title: 'Secure Score ≥ 60%', title_he: 'ציון אבטחה מינימלי 60%', domain: 'defender', severity: 'high', category: 'Secure Score' },
  'CIS-4.4.1': { title: 'Customer Lockbox Enabled', title_he: 'Customer Lockbox מופעל', domain: 'defender', severity: 'medium', category: 'Defender for Office 365' },

  // Section 5 - SharePoint
  'CIS-5.1.1': { title: 'SharePoint External Sharing Restricted', title_he: 'שיתוף חיצוני ב-SharePoint מוגבל', domain: 'sharepoint', severity: 'high', category: 'SharePoint Online' },
  'CIS-5.1.2': { title: 'OneDrive External Sharing Restricted', title_he: 'שיתוף חיצוני ב-OneDrive מוגבל', domain: 'sharepoint', severity: 'high', category: 'SharePoint Online' },
  'CIS-5.2.1': { title: 'SharePoint Legacy Auth Disabled', title_he: 'Legacy Auth ב-SharePoint מכובה', domain: 'sharepoint', severity: 'high', category: 'SharePoint Online' },
  'CIS-5.3.1': { title: 'OneDrive Sync Restricted to Domain Devices', title_he: 'OneDrive Sync מוגבל להתקני הדומיין', domain: 'sharepoint', severity: 'medium', category: 'SharePoint Online' },

  // Section 6 - Teams
  'CIS-6.1.1': { title: 'Teams External Access Restricted', title_he: 'גישה חיצונית ב-Teams מוגבלת', domain: 'teams', severity: 'high', category: 'Microsoft Teams' },
  'CIS-6.1.2': { title: 'Teams Guest Access Controlled', title_he: 'גישת אורחים ב-Teams נשלטת', domain: 'teams', severity: 'medium', category: 'Microsoft Teams' },
  'CIS-6.2.1': { title: 'Anonymous Users Cannot Start Meetings', title_he: 'משתמשים אנונימיים לא יכולים להתחיל פגישות', domain: 'teams', severity: 'high', category: 'Microsoft Teams' },
  'CIS-6.3.1': { title: 'Meeting Recordings Stored Securely', title_he: 'הקלטות ישיבות מאוחסנות ב-OneDrive/SharePoint', domain: 'teams', severity: 'low', category: 'Microsoft Teams' },

  // Section 7 - Purview
  'CIS-7.1.1': { title: 'Audit Log Search Enabled', title_he: 'חיפוש יומן ביקורת מופעל', domain: 'purview', severity: 'critical', category: 'Purview / Compliance' },
  'CIS-7.2.1': { title: 'DLP Policy Exists', title_he: 'קיימת מדיניות DLP פעילה', domain: 'purview', severity: 'high', category: 'Purview / Compliance' },
  'CIS-7.3.1': { title: 'Sensitivity Labels Configured', title_he: 'תוויות רגישות מוגדרות', domain: 'purview', severity: 'medium', category: 'Purview / Compliance' },
};

const ALL_CHECKS = Object.keys(CHECK_META);

Deno.serve(async (req) => {
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
    const result = await runCheck(token, checkId);
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
      evidence: result.evidence,
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