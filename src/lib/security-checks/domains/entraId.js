import { registerCheck } from '../checkRegistry';

// CIS Microsoft 365 Foundations Benchmark v6.0.1 - Section 1: Entra ID

registerCheck({
  id: 'CIS-1.1.1',
  title: 'Ensure Security Defaults is disabled',
  titleHe: 'ודא שהגדרות ברירת מחדל לאבטחה מושבתות',
  descriptionHe: 'ארגונים שמשתמשים ב-Conditional Access צריכים להשבית Security Defaults כדי לאפשר שליטה מדויקת יותר.',
  category: 'Entra ID', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.1.1', framework: 'cis_m365',
  expectedState: 'Security Defaults = Disabled',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Overview → Properties (בצד ימין) → לחץ "Manage security defaults" → הגדר ל-Disabled → שמור. חשוב: ודא שיש CA policies פעילות לפני השבתה.',
  //
  whyItMattersHe: 'Security Defaults לא מאפשר גמישות. עם CA ניתן לשלוט במדויק מי ניגש למה ובאיזה תנאים.',
  graphApiEndpoint: '/policies/identitySecurityDefaultsEnforcementPolicy',
  requiredPermissions: ['Policy.Read.All'], isAutomated: true,
});

registerCheck({
  id: 'CIS-1.1.2',
  title: 'Ensure Password Hash Sync is enabled for hybrid environments',
  titleHe: 'ודא שסנכרון גיבוב סיסמאות מופעל בסביבה היברידית',
  descriptionHe: 'Password Hash Sync מאפשר ל-Entra ID Protection לזהות סיסמאות שנפרצו ולהגן על המשתמשים.',
  category: 'Entra ID', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.1.2', framework: 'cis_m365',
  expectedState: 'Password Hash Sync = Enabled',
  remediationHe: 'על שרת ה-Azure AD Connect / Entra Connect Sync: פתח את אפליקציית Microsoft Entra Connect → Configure → Customize synchronization options → סמן "Password hash synchronization" → Next → Configure. אמת ב-Entra admin center: Health → Azure AD Connect → Password Hash Sync = Enabled.',
  //
  whyItMattersHe: 'בלי PHS, Entra ID Protection לא יכולה לזהות סיסמאות שדלפו ב-breached credentials.',
  graphApiEndpoint: '/organization', requiredPermissions: ['Directory.Read.All'], isAutomated: false,
});

registerCheck({
  id: 'CIS-1.2.1',
  title: 'Ensure MFA is enforced for all privileged users',
  titleHe: 'ודא שMFA מופעל לכל בעלי ההרשאות המוגברות',
  descriptionHe: 'כל חשבון עם תפקיד מנהלתי חייב לאמת בשני גורמים ללא יוצא מן הכלל.',
  category: 'Entra ID', domain: 'entra_id', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.2.1', framework: 'cis_m365',
  expectedState: 'CA policy requiring MFA for all directory roles',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Protection → Conditional Access → Policies → New policy → Name: "MFA for Admins" → Users: Directory roles → בחר כל תפקידי admin → Cloud apps: All → Grant: Require multifactor authentication → State: On → Create.',
  //
  whyItMattersHe: 'חשבון מנהל שנפרץ ללא MFA מאפשר השתלטות מלאה על הסביבה.',
  graphApiEndpoint: '/identity/conditionalAccess/policies', requiredPermissions: ['Policy.Read.All'], isAutomated: true,
});

registerCheck({
  id: 'CIS-1.2.2',
  title: 'Ensure MFA is enforced for all users',
  titleHe: 'ודא שMFA מופעל לכל המשתמשים',
  descriptionHe: 'כל משתמש, לא רק מנהלים, חייב להשתמש ב-MFA לכניסה לשירותי Microsoft 365.',
  category: 'Entra ID', domain: 'entra_id', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.2.2', framework: 'cis_m365',
  expectedState: 'CA policy requiring MFA for All users on All cloud apps',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Protection → Conditional Access → Policies → New policy → Name: "MFA for All Users" → Users: All users (הוסף exclusion לחשבון break-glass) → Cloud apps: All cloud apps → Grant: Require multifactor authentication → State: On → Create.',
  //
  whyItMattersHe: 'MFA חוסם 99.9% מהתקפות credential stuffing ו-password spray.',
  graphApiEndpoint: '/identity/conditionalAccess/policies', requiredPermissions: ['Policy.Read.All'], isAutomated: true,
});

registerCheck({
  id: 'CIS-1.3.1',
  title: 'Ensure password expiration policy is set to never expire (cloud-only)',
  titleHe: 'ודא שמדיניות פקיעת סיסמה מוגדרת ל"לעולם לא תפוג" לחשבונות ענן',
  descriptionHe: 'NIST ו-Microsoft ממליצים לא לדרוש שינוי סיסמה תקופתי כשיש MFA ומעקב אחר סיכונים.',
  category: 'Entra ID', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.3.1', framework: 'cis_m365',
  expectedState: 'Password never expires for cloud-only accounts',
  remediationHe: 'Microsoft 365 Admin Center (admin.microsoft.com) → Settings → Org settings → Security & privacy → Password expiration policy → סמן "Set passwords to never expire" → Save. לחלופין PowerShell: Set-MsolPasswordPolicy -ValidityPeriod 2147483647 -DomainName [domain].',
  //
  whyItMattersHe: 'לחץ לשינוי סיסמה גורם למשתמשים לבחור סיסמאות חלשות וצפויות. MFA מפצה על כך.',
  graphApiEndpoint: '/domains', requiredPermissions: ['Directory.Read.All'], isAutomated: false,
});

registerCheck({
  id: 'CIS-1.3.3',
  title: 'Ensure SSPR is enabled and requires 2 authentication methods',
  titleHe: 'ודא שאיפוס סיסמה עצמאי מופעל ודורש 2 שיטות אימות',
  descriptionHe: 'SSPR עם 2 שיטות מאמת מזהה בוודאות שמשתמש חוקי מאפס את הסיסמה שלו.',
  category: 'Entra ID', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.3.3', framework: 'cis_m365',
  expectedState: 'SSPR enabled for All users, 2 methods required',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Protection → Password reset → Properties → Self service password reset: All → Save. לאחר מכן: Authentication methods → Number of methods required to reset: 2 → בחר שיטות (Mobile app code, Email, Phone) → Save.',
  //
  whyItMattersHe: 'דרישת שיטה אחת בלבד לאיפוס סיסמה חושפת לתקיפת account takeover דרך מספר טלפון גנוב.',
  graphApiEndpoint: '/policies/authenticationMethodsPolicy', requiredPermissions: ['Policy.Read.All'], isAutomated: false,
});

registerCheck({
  id: 'CIS-1.4.1',
  title: 'Ensure between 2 and 4 Global Admins are designated',
  titleHe: 'ודא שבין 2 ל-4 מנהלי Global Admin מוגדרים',
  descriptionHe: 'מספר זה מאזן בין זמינות (לפחות 2) לצמצום משטח תקיפה (לא יותר מ-4).',
  category: 'Entra ID', domain: 'entra_id', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.4.1', framework: 'cis_m365',
  expectedState: '2 to 4 Global Administrator accounts',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Roles & admins → All roles → חפש "Global Administrator" → לחץ על התפקיד → Assignments → סקור את הרשימה. הסר משתמשים לא נחוצים. אם יש פחות מ-2: Add assignments → בחר משתמש.',
  //
  whyItMattersHe: 'יותר מ-4 מנהלים מגדיל משטח תקיפה; פחות מ-2 יוצר single point of failure.',
  graphApiEndpoint: '/directoryRoles', requiredPermissions: ['Directory.Read.All', 'RoleManagement.Read.Directory'], isAutomated: true,
});

registerCheck({
  id: 'CIS-1.4.2',
  title: 'Ensure admin accounts are cloud-only (not synced)',
  titleHe: 'ודא שחשבונות מנהל הם ענן-בלבד ולא מסונכרנים מ-AD מקומי',
  descriptionHe: 'חשבונות ניהול מסונכרנים חושפים את הענן לפגיעויות ב-Active Directory המקומי.',
  category: 'Entra ID', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.4.2', framework: 'cis_m365',
  expectedState: 'All admin accounts are cloud-only (onPremisesSyncEnabled = false)',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Users → New user → צור משתמש חדש עם UPN [name]@[tenant].onmicrosoft.com → הוסף לתפקיד Global Administrator. לאחר מכן הסר מהתפקיד את החשבונות המסונכרנים. כל מנהל יקבל 2 חשבונות: עבודה שוטפת (מסונכרן) + ניהול (ענן).',
  //
  whyItMattersHe: 'תוקף שפורץ ל-AD המקומי יכול להשתלט על חשבונות מנהל מסונכרנים ומשם על הענן.',
  graphApiEndpoint: '/directoryRoles', requiredPermissions: ['Directory.Read.All'], isAutomated: true,
});

registerCheck({
  id: 'CIS-1.5.1',
  title: 'Ensure Legacy Authentication protocols are blocked',
  titleHe: 'ודא שפרוטוקולי אימות Legacy חסומים',
  descriptionHe: 'פרוטוקולים ישנים כמו BasicAuth, IMAP, POP3 לא תומכים ב-MFA ומאפשרים עקיפת מדיניות CA.',
  category: 'Conditional Access', domain: 'conditional_access', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.5.1', framework: 'cis_m365',
  expectedState: 'CA policy blocking Exchange ActiveSync and Other legacy clients',
  remediationHe: 'צור מדיניות CA: Client apps = Exchange ActiveSync + Other, Grant = Block',
  whyItMattersHe: 'בין 70-90% מהתקפות credential stuffing משתמשות בפרוטוקולי legacy שלא נחסמים על ידי MFA.',
  graphApiEndpoint: '/identity/conditionalAccess/policies', requiredPermissions: ['Policy.Read.All'], isAutomated: true,
});

registerCheck({
  id: 'CIS-1.6.1',
  title: 'Ensure Sign-in Risk policy blocks high/medium risk logins',
  titleHe: 'ודא שמדיניות סיכון כניסה חוסמת סיכון גבוה ובינוני',
  descriptionHe: 'Entra ID Protection מזהה כניסות חשודות. מדיניות CA צריכה לחסום או לדרוש MFA בסיכון גבוה/בינוני.',
  category: 'Conditional Access', domain: 'conditional_access', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.6.1', framework: 'cis_m365',
  expectedState: 'CA policy: signInRiskLevels = high, medium → Block or MFA',
  remediationHe: 'CA > New policy > Conditions: Sign-in risk = High, Medium > Grant: Block or MFA',
  whyItMattersHe: 'כניסות מסיכון גבוה הן לרוב תוקפים שגנבו סיסמאות. חסימה אוטומטית מונעת נזק בזמן אמת.',
  graphApiEndpoint: '/identity/conditionalAccess/policies', requiredPermissions: ['Policy.Read.All'], isAutomated: true,
});

registerCheck({
  id: 'CIS-1.6.2',
  title: 'Ensure User Risk policy forces password change on high risk',
  titleHe: 'ודא שמדיניות סיכון משתמש מחייבת שינוי סיסמה בסיכון גבוה',
  descriptionHe: 'כשמשתמש מסומן כסיכון גבוה (למשל אישורים שדלפו), יש לחייבו לשנות סיסמה.',
  category: 'Conditional Access', domain: 'conditional_access', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.6.2', framework: 'cis_m365',
  expectedState: 'CA policy: userRiskLevels = high → Block or password change',
  remediationHe: 'CA > New policy > Conditions: User risk = High > Grant: Block or Require password change',
  whyItMattersHe: 'משתמשים בסיכון גבוה לרוב נפגעו מ-credential breach. חידוש מוסמך של הסיסמה מגן על החשבון.',
  graphApiEndpoint: '/identity/conditionalAccess/policies', requiredPermissions: ['Policy.Read.All'], isAutomated: true,
});

registerCheck({
  id: 'CIS-1.7.1',
  title: 'Ensure guest users are not assigned to admin roles',
  titleHe: 'ודא שמשתמשי אורח אינם מוקצים לתפקידי מנהל',
  descriptionHe: 'משתמשי אורח מגיעים מארגונים חיצוניים ואין לאפשר להם הרשאות ניהולתיות.',
  category: 'Entra ID', domain: 'entra_id', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.7.1', framework: 'cis_m365',
  expectedState: 'No guest users with any directory role',
  remediationHe: 'Entra > Roles & admins > סקור כל תפקיד — הסר משתמשי אורח מכל תפקיד ניהולי',
  whyItMattersHe: 'אורח עם הרשאות מנהל שחשבונו נפרץ בארגון המקורי מאפשר לתוקף גישה מנהלתית לסביבתך.',
  graphApiEndpoint: '/users', requiredPermissions: ['Directory.Read.All', 'RoleManagement.Read.Directory'], isAutomated: true,
});