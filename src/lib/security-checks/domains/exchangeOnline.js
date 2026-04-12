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
  remediationHe: 'PowerShell: Install-Module ExchangeOnlineManagement → Connect-ExchangeOnline -UserPrincipalName [admin@domain] → Set-OrganizationConfig -OAuth2ClientProfileEnabled $true → אמת: Get-OrganizationConfig | Select OAuth2ClientProfileEnabled (ציפייה: True).',
  //
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
  remediationHe: 'Exchange Admin Center (admin.exchange.microsoft.com) → Mail flow → Remote domains → לחץ על "Default" → Edit → Automatic forwarding → בחר "Off" (Blocking) → Save. בדוק גם: Mail flow → Rules — ודא שאין Transport Rule שמאפשר forward חיצוני.',
  //
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
  remediationHe: 'ב-DNS provider שלך (למשל Cloudflare, GoDaddy, Route53) → הוסף/ערוך רשומת TXT לדומיין הראשי: Name: @ | Type: TXT | Value: v=spf1 include:spf.protection.outlook.com -all → המתן 24-48 שעות לרענון DNS. אמת ב: https://mxtoolbox.com/spf.aspx',
  //
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
  remediationHe: 'Exchange Admin Center (admin.exchange.microsoft.com) → Settings → Email authentication → DKIM → בחר דומיין → Enable. DKIM ייצור אוטומטית CNAME records שיש להוסיף ב-DNS: selector1._domainkey → [selector1CNAME] ו-selector2._domainkey → [selector2CNAME]. לאחר הוספה ב-DNS המתן שעה ואז Enable שוב.',
  //
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
  remediationHe: 'ב-DNS provider: הוסף רשומת TXT: Name: _dmarc | Value: v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@[domain]; pct=100 → המתן 24-48 שעות. לאחר מעקב על דוחות והבטחת תקינות SPF/DKIM, שנה ל-p=reject. אמת ב: https://mxtoolbox.com/dmarc.aspx',
  //
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
  remediationHe: 'PowerShell: Connect-ExchangeOnline -UserPrincipalName [admin@domain] → Set-OrganizationConfig -AuditDisabled $false → אמת: Get-OrganizationConfig | Select AuditDisabled (ציפייה: False). הגדרת ברירת מחדל ב-M365 היא מופעלת; השבתה ידנית היא סיכון. בדוק גם: Exchange Admin Center → Settings → Mailbox → Auditing.',
  //
  whyItMattersHe: 'ללא audit log של תיבות דואר, חקירת דליפת מידע דרך דואר בלתי אפשרית.',
  graphApiEndpoint: null, requiredPermissions: [], isAutomated: false,
});