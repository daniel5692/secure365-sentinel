import { registerCheck } from '../checkRegistry';

// CIS Microsoft 365 Foundations Benchmark v6.0.1 - Section 3: Exchange Online

registerCheck({
  id: 'CIS-3.1.1',
  title: 'Ensure modern authentication is enabled for Exchange Online',
  titleHe: 'ודא שאימות מודרני מופעל ב-Exchange Online',
  descriptionHe: 'OAuth 2.0 (אימות מודרני) נדרש לתמיכה ב-MFA ו-Conditional Access עבור לקוחות דואר.',
  category: 'Exchange Online', domain: 'exchange_online', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 3.1.1', framework: 'cis_m365',
  expectedState: 'OAuth2ClientProfileEnabled = True',
  remediationHe: 'Connect-ExchangeOnline; Set-OrganizationConfig -OAuth2ClientProfileEnabled $true',
  whyItMattersHe: 'ללא אימות מודרני, לקוחות Outlook ישנים עוקפים MFA ו-Conditional Access.',
  graphApiEndpoint: null, requiredPermissions: [], isAutomated: false,
});

registerCheck({
  id: 'CIS-3.2.1',
  title: 'Ensure email auto-forwarding to external domains is disabled',
  titleHe: 'ודא שהעברה אוטומטית של דואר לדומיינים חיצוניים מושבתת',
  descriptionHe: 'תוקפים שמשיגים גישה לתיבת דואר מגדירים העברה אוטומטית לאיסוף מידע. יש לחסום זאת ברמת הארגון.',
  category: 'Exchange Online', domain: 'exchange_online', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 3.2.1', framework: 'cis_m365',
  expectedState: 'AutoForwardEnabled = False on all Remote Domains',
  remediationHe: 'Exchange Admin Center > Mail flow > Remote domains > Default > Allow automatic forwarding = Off',
  whyItMattersHe: 'BEC (Business Email Compromise) תוקפים מגדירים auto-forward לאיסוף שקט של כל הדואר העסקי.',
  graphApiEndpoint: null, requiredPermissions: [], isAutomated: false,
});

registerCheck({
  id: 'CIS-3.3.1',
  title: 'Ensure SPF records are configured for all custom domains',
  titleHe: 'ודא שרשומות SPF מוגדרות לכל הדומיינים המותאמים',
  descriptionHe: 'SPF מגדיר אילו שרתים מורשים לשלוח דואר בשם הדומיין שלך ומונע spoofing.',
  category: 'Mail Flow', domain: 'mail_flow', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 3.3.1', framework: 'cis_m365',
  expectedState: 'TXT record: v=spf1 include:spf.protection.outlook.com -all',
  remediationHe: 'הוסף רשומת TXT ב-DNS: v=spf1 include:spf.protection.outlook.com -all',
  whyItMattersHe: 'ללא SPF, כל אחד יכול לשלוח דואר שנראה כאילו הגיע מהדומיין שלך לצורך פישינג.',
  graphApiEndpoint: '/domains', requiredPermissions: ['Directory.Read.All'], isAutomated: false,
});

registerCheck({
  id: 'CIS-3.3.2',
  title: 'Ensure DKIM signing is enabled for all custom domains',
  titleHe: 'ודא שחתימת DKIM מופעלת לכל הדומיינים המותאמים',
  descriptionHe: 'DKIM חותם דיגיטלית על כל הודעה יוצאת, מה שמונע שינוי תוכן בדרך ומוכיח אמינות השולח.',
  category: 'Mail Flow', domain: 'mail_flow', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 3.3.2', framework: 'cis_m365',
  expectedState: 'DKIM enabled and publishing CNAME records for all custom domains',
  remediationHe: 'Exchange Admin Center > Email authentication > DKIM > Enable for each domain',
  whyItMattersHe: 'DKIM מונע "email tampering" — שינוי תוכן הדואר בזמן המעבר.',
  graphApiEndpoint: '/domains', requiredPermissions: ['Directory.Read.All'], isAutomated: false,
});

registerCheck({
  id: 'CIS-3.3.3',
  title: 'Ensure DMARC Records exist with a policy of "reject" or "quarantine"',
  titleHe: 'ודא שמדיניות DMARC מוגדרת עם "reject" או "quarantine"',
  descriptionHe: 'DMARC מחבר SPF ו-DKIM ומגדיר מה לעשות עם הודעות שנכשלות באימות — reject או quarantine.',
  category: 'Mail Flow', domain: 'mail_flow', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 3.3.3', framework: 'cis_m365',
  expectedState: 'DMARC TXT record: p=reject or p=quarantine with rua reporting',
  remediationHe: 'הוסף רשומת TXT: _dmarc.yourdomain.com → v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com',
  whyItMattersHe: 'SPF ו-DKIM בלי DMARC לא מגינים — DMARC הוא השלב שמחליט על ה-enforcement.',
  graphApiEndpoint: '/domains', requiredPermissions: ['Directory.Read.All'], isAutomated: false,
});

registerCheck({
  id: 'CIS-3.4.1',
  title: 'Ensure mailbox auditing is enabled for all users',
  titleHe: 'ודא שתיעוד ביקורת תיבות דואר מופעל לכל המשתמשים',
  descriptionHe: 'Mailbox auditing מתעד פעולות כמו קריאת דואר, מחיקה, גישה לתיבת דואר של אחרים — הכרחי לחקירה.',
  category: 'Exchange Online', domain: 'exchange_online', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 3.4.1', framework: 'cis_m365',
  expectedState: 'AuditDisabled = False (organization-wide mailbox audit enabled)',
  remediationHe: 'Connect-ExchangeOnline; Set-OrganizationConfig -AuditDisabled $false',
  whyItMattersHe: 'ללא audit log של תיבות דואר, חקירת דליפת מידע דרך דואר בלתי אפשרית.',
  graphApiEndpoint: null, requiredPermissions: [], isAutomated: false,
});