import { registerCheck } from '../checkRegistry';

// CIS Microsoft 365 Foundations Benchmark v6.0.1 - Section 5.3: ID Governance

registerCheck({
  id: 'CIS-5.3.1',
  title: "Ensure 'Privileged Identity Management' is used to manage roles",
  titleHe: 'ודא ש-Privileged Identity Management (PIM) משמש לניהול תפקידים',
  descriptionHe: 'PIM מאפשר הקצאת תפקידים מיוחסים Just-in-Time (JIT) — כלומר, מנהלים מקבלים הרשאות רק כשצריך ולפרק זמן מוגדר, לא לצמיתות.',
  category: 'ID Governance / PIM', domain: 'entra_id', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.3.1', framework: 'cis_m365',
  expectedState: 'All privileged roles managed via PIM (Eligible assignments, not Permanent Active)',
  remediationHe: 'Entra admin center → Identity governance → Privileged Identity Management → Entra roles → בדוק כל role קריטי (Global Admin, Security Admin, Exchange Admin) → ודא שכל ה-assignments הם "Eligible" ולא "Active Permanent" → הגדר Activation requirements: MFA + Justification + Max activation: 8h.',
  whyItMattersHe: 'חשבון מנהל פעיל לצמיתות הוא מטרה גדולה. PIM JIT מצמצם את חלון הזמן שהרשאות מיוחסות פעילות ל-0 כשלא בשימוש.',
  graphApiEndpoint: '/privilegedAccess/aadRoles/resources',
  requiredPermissions: ['PrivilegedAccess.Read.AzureAD'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.3.2',
  title: "Ensure 'Access reviews' for Guest Users are configured",
  titleHe: 'ודא ש-Access Reviews למשתמשי אורח מוגדרות',
  descriptionHe: 'Access Reviews תקופתיות (מומלץ: רבעוניות) למשתמשי אורח מבטיחות שאורחים שסיימו שיתוף פעולה לא ממשיכים לגשת למשאבים.',
  category: 'ID Governance / Access Reviews', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.3.2', framework: 'cis_m365',
  expectedState: 'Recurring access review configured for all Guest users; Frequency ≤ quarterly',
  remediationHe: 'Entra admin center → Identity governance → Access reviews → New review → בחר "Teams + Groups" → Scope: Guest users only → Reviewers: Group owners → Recurrence: Quarterly → Duration: 14 days → If no response: Remove access → Auto-apply results → Start.',
  whyItMattersHe: 'אורחים לשעבר שאין להם עסק עם הארגון ממשיכים לגשת לקבצים ו-Teams channels. Review תקופתי מבטיח ניקיון ומצמצם exposure.',
  graphApiEndpoint: '/identityGovernance/accessReviews/definitions',
  requiredPermissions: ['AccessReview.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.3.3',
  title: "Ensure 'Access reviews' for privileged roles are configured",
  titleHe: 'ודא ש-Access Reviews לתפקידים מיוחסים מוגדרות',
  descriptionHe: 'Access Reviews לתפקידי מנהל (חודשיות/רבעוניות) מבטיחות שרק מי שצריך מחזיק בהרשאות מיוחסות. תפקידים שלא בשימוש יוסרו.',
  category: 'ID Governance / Access Reviews', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.3.3', framework: 'cis_m365',
  expectedState: 'Recurring access review for privileged Entra roles; Monthly or quarterly',
  remediationHe: 'Entra admin center → Identity governance → Access reviews → New review → Scope: Entra roles → בחר: Global Administrator, Security Administrator, Exchange Administrator, SharePoint Administrator → Reviewers: Self-review + Manager → Recurrence: Monthly → Duration: 7 days → Auto-apply: Remove access → Start.',
  whyItMattersHe: 'עובדים שעזבו, שינו תפקיד, או קיבלו הרשאות זמניות ממשיכים לעתים לחזיק בתפקידי מנהל בגלל שכחה. Review מבטיח ניקיון.',
  graphApiEndpoint: '/identityGovernance/accessReviews/definitions',
  requiredPermissions: ['AccessReview.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.3.4',
  title: 'Ensure approval is required for Global Administrator role activation',
  titleHe: 'ודא שנדרש אישור להפעלת תפקיד Global Administrator',
  descriptionHe: 'ב-PIM, הפעלת תפקיד Global Administrator חייבת לדרוש אישור מנהל אחר — לא רק MFA ו-Justification.',
  category: 'ID Governance / PIM', domain: 'entra_id', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.3.4', framework: 'cis_m365',
  expectedState: 'PIM Global Administrator role: Require approval = Yes; Approvers configured',
  remediationHe: 'Entra admin center → Identity governance → PIM → Entra roles → Global Administrator → Settings → Require approval to activate: Enabled → הגדר Approvers (לפחות 2 מנהלים אחרים) → Save.',
  whyItMattersHe: 'הפעלת Global Admin צריכה להיות פעולה מבוקרת שמשאירה audit trail ומחייבת עין שנייה. זה מונע שימוש מופרז בהרשאה הגבוהה ביותר.',
  graphApiEndpoint: '/privilegedAccess/aadRoles/resources',
  requiredPermissions: ['PrivilegedAccess.Read.AzureAD'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.3.5',
  title: 'Ensure approval is required for Privileged Role Administrator activation',
  titleHe: 'ודא שנדרש אישור להפעלת תפקיד Privileged Role Administrator',
  descriptionHe: 'תפקיד Privileged Role Administrator מאפשר שינוי הרשאות PIM. הפעלתו חייבת לדרוש אישור כפי שנדרש ל-Global Admin.',
  category: 'ID Governance / PIM', domain: 'entra_id', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.3.5', framework: 'cis_m365',
  expectedState: 'PIM Privileged Role Administrator: Require approval = Yes; Approvers configured',
  remediationHe: 'Entra admin center → Identity governance → PIM → Entra roles → Privileged Role Administrator → Settings → Require approval to activate: Enabled → הגדר Approvers (Global Admins) → Max activation duration: 8h → Require MFA + Justification + Ticket info → Save.',
  whyItMattersHe: 'מי שמחזיק ב-Privileged Role Administrator יכול להעניק לעצמו Global Admin. זהו תפקיד רגיש במיוחד שמצריך בקרה כפולה.',
  graphApiEndpoint: '/privilegedAccess/aadRoles/resources',
  requiredPermissions: ['PrivilegedAccess.Read.AzureAD'],
  isAutomated: true,
});