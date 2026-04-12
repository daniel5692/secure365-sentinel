import { registerCheck } from '../checkRegistry';

// CIS Microsoft 365 Foundations Benchmark v6.0.1 - Section 7: Microsoft Purview

registerCheck({
  id: 'CIS-7.1.1',
  title: 'Ensure Audit Log Search is enabled',
  titleHe: 'ודא שחיפוש יומן ביקורת מופעל',
  descriptionHe: 'Unified Audit Log מתעד פעולות בכל שירותי Microsoft 365 ומשמש לחקירות ותגובה לאירועים.',
  category: 'Purview / Compliance', domain: 'purview', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 7.1.1', framework: 'cis_m365',
  expectedState: 'Audit log search enabled in Microsoft Purview',
  remediationHe: 'Microsoft Purview portal (purview.microsoft.com) → Solutions → Audit → אם מוצג banner "Start recording user and admin activity" — לחץ עליו. לחלופין: PowerShell: Set-AdminAuditLogConfig -UnifiedAuditLogIngestionEnabled $true. בדוק סטטוס עם: Get-AdminAuditLogConfig | Select UnifiedAuditLogIngestionEnabled.',
  //
  whyItMattersHe: 'ללא audit log לא ניתן לחקור אירועי אבטחה. זה הנכס הקריטי ביותר לזיהוי פריצות.',
  graphApiEndpoint: '/security/secureScores', requiredPermissions: ['SecurityEvents.Read.All'], isAutomated: true,
});

registerCheck({
  id: 'CIS-7.2.1',
  title: 'Ensure at least one DLP policy is active',
  titleHe: 'ודא שקיימת לפחות מדיניות DLP פעילה אחת',
  descriptionHe: 'Data Loss Prevention מונעת שיתוף לא מורשה של מידע רגיש כמו מספרי כרטיסי אשראי, ת.ז., נתוני בריאות.',
  category: 'Purview / Compliance', domain: 'purview', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 7.2.1', framework: 'cis_m365',
  expectedState: 'At least one active DLP policy covering Exchange, SharePoint, Teams',
  remediationHe: 'Microsoft Purview portal (purview.microsoft.com) → Solutions → Data loss prevention → Policies → Create policy → בחר תבנית (לדוג׳ "Financial data" או "Israel Personal Data") → Apply to: Exchange Email, SharePoint, OneDrive, Teams → Mode: Turn it on → Save.',
  //
  whyItMattersHe: 'ללא DLP, עובדים יכולים לשלוח בטעות (או בכוונה) מידע רגיש מחוץ לארגון.',
  graphApiEndpoint: null, requiredPermissions: [], isAutomated: false,
});

registerCheck({
  id: 'CIS-3.2.2',
  title: 'Ensure DLP policies are enabled for Microsoft Teams',
  titleHe: 'ודא שמדיניות DLP מופעלת עבור Microsoft Teams',
  descriptionHe: 'מדיניות DLP חייבת לכלול במפורש את Microsoft Teams כמיקום, כדי שתחול על הודעות צ\u05f3אט ועל הודעות בערוצים. DLP כללי ל-Exchange/SharePoint לא מכסה אוטומטית Teams.',
  category: 'Purview / Compliance', domain: 'purview', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 3.2.2', framework: 'cis_m365',
  expectedState: 'At least one active DLP policy with Microsoft Teams location enabled',
  remediationHe: 'Microsoft Purview portal (purview.microsoft.com) \u2192 Solutions \u2192 Data loss prevention \u2192 Policies \u2192 צור policy חדשה או ערוך קיימת \u2192 Locations \u2192 הפעל "Microsoft Teams chat and channel messages" \u2192 הגדר rules לגילוי מידע רגיש (PII, כרטיסי אשראי, נתוני בריאות) \u2192 Action: Block or Notify \u2192 Turn it on \u2192 Save.',
  whyItMattersHe: 'Teams הפך לאפיק תקשורת ראשי. ללא DLP ל-Teams, מידע רגיש כמו מספרי זהות ופרטי לקוחות יכול לזלוג בחופשיות בצ\u05f3אטים פנימיים וחיצוניים.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: false,
});

registerCheck({
  id: 'CIS-7.3.1',
  title: 'Ensure sensitivity labels are configured and published',
  titleHe: 'ודא שתוויות רגישות מוגדרות ומפורסמות',
  descriptionHe: 'Sensitivity Labels מאפשרות סיווג וסימון מסמכים ודואר, ומאפשרות הגנה אוטומטית בהתאם לסיווג.',
  category: 'Purview / Compliance', domain: 'purview', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 7.3.1', framework: 'cis_m365',
  expectedState: 'Sensitivity labels created and published to users',
  remediationHe: 'Microsoft Purview portal (purview.microsoft.com) → Solutions → Information protection → Labels → Create a label → הגדר name ו-color → Scope: Files & emails → Encryption: Optional → Create. לאחר מכן: Labels → Publish labels → בחר את התוויות → Apply to all users → Policy name → Publish.',
  //
  whyItMattersHe: 'בלי סיווג, עובדים לא יודעים אילו מסמכים הם רגישים. תוויות מאפשרות הגנה אוטומטית ועקבית.',
  graphApiEndpoint: null, requiredPermissions: [], isAutomated: false,
});