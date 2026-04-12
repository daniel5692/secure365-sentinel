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