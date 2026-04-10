import { registerCheck } from '../checkRegistry';

// ==========================================
// Purview / Compliance / Mail Flow Security Checks
// ==========================================

registerCheck({
  id: 'CIS-7.1.1',
  title: 'Ensure DLP policies are enabled for Microsoft 365 services',
  titleHe: 'ודא שמדיניות DLP מופעלת לשירותי Microsoft 365',
  descriptionHe: 'מדיניות DLP (Data Loss Prevention) מגינה על מידע רגיש מפני דליפה באמצעות זיהוי ומניעה אוטומטית.',
  category: 'Purview / Compliance',
  domain: 'purview',
  severity: 'high',
  benchmarkRef: 'CIS 7.1.1',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'DLP policies active for Exchange, SharePoint, OneDrive, and Teams',
  validationMethodHe: 'בדיקת מדיניות DLP פעילה ב-Microsoft Purview compliance portal',
  remediationHe: `1. היכנס ל-Microsoft Purview compliance portal
2. נווט אל Data loss prevention > Policies
3. צור מדיניות DLP חדשה
4. בחר תבניות לסוגי מידע רגיש (מספרי כרטיסי אשראי, ת.ז. וכו')
5. הפעל לכל שירותי Microsoft 365
6. הגדר פעולות: התראה, חסימה, או דיווח`,
  whyItMattersHe: 'ללא מדיניות DLP, מידע רגיש כמו נתונים פיננסיים, מידע אישי ומסמכים סודיים עלולים להישלח או להיות משותפים ללא בקרה.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/compliance/dlp/policies',
  requiredPermissions: ['InformationProtectionPolicy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-7.2.1',
  title: 'Ensure audit log search is enabled',
  titleHe: 'ודא שחיפוש יומן ביקורת מופעל',
  descriptionHe: 'יומן הביקורת (Audit Log) מתעד פעולות משתמשים ומנהלים ומהווה כלי חיוני לחקירות אבטחה.',
  category: 'Purview / Compliance',
  domain: 'purview',
  severity: 'critical',
  benchmarkRef: 'CIS 7.2.1',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'Unified audit logging enabled',
  validationMethodHe: 'בדיקה שיומן ביקורת מאוחד (Unified Audit Log) מופעל',
  remediationHe: `1. היכנס ל-Microsoft Purview compliance portal
2. נווט אל Audit
3. אם מופיעה הודעה להפעלה, לחץ "Start recording"
4. ודא שההקלטה פעילה
5. שקול הפעלת Advanced Audit לשמירה ממושכת`,
  whyItMattersHe: 'ללא יומן ביקורת, אין אפשרות לזהות חדירות, לחקור אירועי אבטחה או לעמוד בדרישות רגולציה. זהו כלי בסיסי וחיוני.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/admin/reportSettings/unified-audit-log-ingestion-enabled',
  requiredPermissions: ['AuditLog.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.1.1',
  title: 'Ensure SPF records are published for all Exchange Online domains',
  titleHe: 'ודא שרשומות SPF מוגדרות לכל דומייני Exchange Online',
  descriptionHe: 'SPF (Sender Policy Framework) מגדיר אילו שרתים מורשים לשלוח דואר בשם הדומיין.',
  category: 'Mail Flow Protection',
  domain: 'mail_flow',
  severity: 'medium',
  benchmarkRef: 'CIS 8.1.1',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'SPF record configured for all domains with -all or ~all',
  validationMethodHe: 'בדיקת רשומות DNS של SPF לכל דומיין',
  remediationHe: `1. היכנס למערכת ניהול ה-DNS של הדומיין
2. הוסף רשומת TXT: "v=spf1 include:spf.protection.outlook.com -all"
3. ודא שאין רשומת SPF כפולה
4. בדוק עם כלי SPF validator`,
  whyItMattersHe: 'ללא SPF, תוקפים יכולים לזייף דואר שנראה כנשלח מהדומיין הארגוני, מה שמאפשר התקפות פישינג מתקדמות.',
  manualVerificationNoteHe: 'בדיקה זו דורשת גישה לרשומות DNS ואינה ניתנת לאוטומציה מלאה דרך Graph API בלבד.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: false,
});