import { registerCheck } from '../checkRegistry';

// CIS Microsoft 365 Foundations Benchmark v6.0.1 - Section 6: Exchange Admin Center

// ─── 6.1 Audit ───

registerCheck({
  id: 'CIS-6.1.1',
  title: "Ensure 'AuditDisabled' organizationally is set to 'False'",
  titleHe: "ודא ש-AuditDisabled מוגדר ל-False ברמה הארגונית",
  descriptionHe: "Microsoft 365 מאפשר לכבות ביקורת תיבות דואר ברמה ארגונית. יש לוודא שהגדרה זו מופעלת כדי שכל פעולה בתיבות יתועד.",
  category: 'Exchange / Audit', domain: 'exchange_online', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 6.1.1', framework: 'cis_m365',
  expectedState: 'AuditDisabled = False (audit enabled organization-wide)',
  remediationHe: 'Exchange Online PowerShell: Set-OrganizationConfig -AuditDisabled $false\n\nאו: Exchange admin center (admin.exchange.microsoft.com) → Settings → Org settings → Auditing → ודא שביקורת מופעלת.',
  whyItMattersHe: 'ביקורת תיבות דואר מאפשרת זיהוי גישה לא מורשית, קריאת מיילים על ידי צד שלישי, ותחקור אירועי אבטחה בדיעבד.',
  graphApiEndpoint: '/admin/serviceAnnouncement/healthOverviews',
  requiredPermissions: ['ServiceHealth.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-6.1.2',
  title: 'Ensure mailbox audit actions are configured',
  titleHe: 'ודא שפעולות ביקורת תיבת דואר מוגדרות',
  descriptionHe: 'יש להגדיר שמגוון רחב של פעולות יתועד: קריאת הודעות, שליחה מטעם אחרים, מחיקה, כניסת delegate ועוד — עבור כל סוגי המשתמשים.',
  category: 'Exchange / Audit', domain: 'exchange_online', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 6.1.2', framework: 'cis_m365',
  expectedState: 'Mailbox audit actions include: MailItemsAccessed, Send, SendAs, SendOnBehalf, SoftDelete, HardDelete for all user types',
  remediationHe: 'Exchange Online PowerShell:\nSet-OrganizationConfig -AuditDisabled $false\nGet-Mailbox -ResultSize Unlimited | Set-Mailbox -AuditEnabled $true -AuditAdmin MailItemsAccessed,Send,SendAs,SendOnBehalf,SoftDelete,HardDelete -AuditDelegate MailItemsAccessed,Send,SendAs,SendOnBehalf,SoftDelete,HardDelete -AuditOwner MailItemsAccessed,Send,SoftDelete,HardDelete',
  whyItMattersHe: 'ללא רישום של MailItemsAccessed, אי אפשר לדעת אם תוקף קרא את הדואר. זהו ממצא קריטי בתחקור פריצות BEC.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-6.1.3',
  title: "Ensure 'AuditBypassEnabled' is not enabled on mailboxes",
  titleHe: "ודא ש-AuditBypassEnabled אינו מופעל על תיבות דואר",
  descriptionHe: "AuditBypassEnabled מאפשר לחשבון מסוים לבצע פעולות בתיבות דואר ללא תיעוד. אף חשבון לא אמור להיות פטור מביקורת.",
  category: 'Exchange / Audit', domain: 'exchange_online', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 6.1.3', framework: 'cis_m365',
  expectedState: 'No mailboxes or users have AuditBypassEnabled = True',
  remediationHe: 'Exchange Online PowerShell:\nGet-MailboxAuditBypassAssociation -ResultSize Unlimited | Where-Object {$_.AuditBypassEnabled -eq $true} | Set-MailboxAuditBypassAssociation -AuditBypassEnabled $false',
  whyItMattersHe: 'חשבון עם AuditBypassEnabled יכול לגשת לכל תיבת דואר ולבצע פעולות כלשהן ללא שום עקבות — מה שהופך אותו לכלי אידיאלי לתוקף.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

// ─── 6.2 Mail Flow ───

registerCheck({
  id: 'CIS-6.2.1',
  title: 'Ensure all forms of mail forwarding are blocked and/or disabled',
  titleHe: 'ודא שכל צורות העברת דואר אוטומטית חסומות',
  descriptionHe: 'Forward אוטומטי של דואר לכתובות חיצוניות מאפשר לתוקף לקבל עותק מכל ההתכתבות. יש לחסום זאת ב-Transport Rules ובהגדרות תיבה.',
  category: 'Exchange / Mail Flow', domain: 'exchange_online', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 6.2.1', framework: 'cis_m365',
  expectedState: 'Remote domains: AutoForwardEnabled = False; Outbound spam policy: AutoForwardingMode = Off',
  remediationHe: 'Exchange admin center → Mail flow → Remote domains → Default → עדכן "Automatic forwarding": Off.\n\nDefender portal → Anti-spam outbound policy → Automatic forwarding rules: Off.\n\nExchange PowerShell: Set-RemoteDomain Default -AutoForwardEnabled $false',
  whyItMattersHe: 'BEC (Business Email Compromise) לרוב כולל Forward rule שנוצרת על ידי התוקף. חסימה מקדימה מונעת זליגת מידע גם לאחר פריצה.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-6.2.2',
  title: 'Ensure mail transport rules do not whitelist specific domains',
  titleHe: 'ודא שחוקי Mail Transport לא כוללים whitelist של דומיינים',
  descriptionHe: 'Transport Rules שמסמנות הודעות מדומיינים מסוימים כ-SCL -1 (bypass spam) מסוכנות — אותם דומיינים עלולים להיפרץ.',
  category: 'Exchange / Mail Flow', domain: 'exchange_online', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 6.2.2', framework: 'cis_m365',
  expectedState: 'No transport rules set SCL to -1 based on sender domain',
  remediationHe: 'Exchange admin center → Mail flow → Rules → בדוק כל rule → חפש rules שמגדירות "Set the spam confidence level (SCL) to -1" בהתבסס על sender domain → הסר או שנה אותן. השתמש ב-Enhanced Filtering במקום.',
  whyItMattersHe: 'דומיין partner שנפרץ ייפיק הודעות phishing שיגיעו ישירות לתיבת הדואר ללא בדיקת spam — בגלל ה-whitelist.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-6.2.3',
  title: 'Ensure email from external senders is identified',
  titleHe: 'ודא שדואר ממשלחים חיצוניים מזוהה',
  descriptionHe: 'הוספת תגית [EXTERNAL] לשורת הנושא של הודעות ממשלחים חיצוניים עוזרת למשתמשים לזהות הודעות חשודות לפני שיפתחו קישורים.',
  category: 'Exchange / Mail Flow', domain: 'exchange_online', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 6.2.3', framework: 'cis_m365',
  expectedState: 'External email tagging enabled or Transport Rule prepends [EXTERNAL] to subject',
  remediationHe: 'Exchange admin center → Settings → Mail flow → External sender identification: הפעל "Show a warning tip for external senders" ו-"Show a warning tip when the user receives email from unverified senders".\n\nאו: צור Transport Rule: IF sender is outside the organization → Prepend subject with "[EXTERNAL]".',
  whyItMattersHe: 'רוב מתקפות phishing מגיעות מחוץ לארגון. זיהוי ויזואלי מפחית משמעותית את שיעור הלחיצה על קישורים זדוניים.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

// ─── 6.3 Roles ───

registerCheck({
  id: 'CIS-6.3.1',
  title: 'Ensure users installing Outlook add-ins is not allowed',
  titleHe: 'ודא שמשתמשים לא יכולים להתקין תוספות Outlook בעצמם',
  descriptionHe: 'תוספות Outlook (Add-ins) של צד שלישי יכולות לקרוא את תוכן הדואר ולשלוח נתונים החוצה. הרשאת התקנה צריכה להיות של מנהלים בלבד.',
  category: 'Exchange / Roles', domain: 'exchange_online', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 6.3.1', framework: 'cis_m365',
  expectedState: 'My Marketplace Apps and My Custom Apps roles removed from Default Role Assignment Policy',
  remediationHe: 'Exchange admin center → Roles → User roles → Default Role Assignment Policy → ערוך → הסר: "My Marketplace Apps", "My Custom Apps", "My ReadWriteMailbox Apps" → Save.',
  whyItMattersHe: 'Add-in זדוני שמשתמש מתקין מה-Store יכול לקרוא כל דואר, לשלוח בשמו, ולגנוב credentials — הכל מבלי שום אינדיקציה חיצונית.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

// ─── 6.5 Settings ───

registerCheck({
  id: 'CIS-6.5.2',
  title: 'Ensure MailTips are enabled for end users',
  titleHe: 'ודא ש-MailTips מופעל למשתמשים',
  descriptionHe: 'MailTips מציג אזהרות בזמן כתיבת דואר: "הנמען חיצוני", "הרשימה גדולה", "הנמען אינו מקבל דואר". זה מונע שליחת מידע רגיש בטעות.',
  category: 'Exchange / Settings', domain: 'exchange_online', severity: 'low',
  benchmarkRef: 'CIS M365 v6.0.1 - 6.5.2', framework: 'cis_m365',
  expectedState: 'MailTipsAllTipsEnabled = True; MailTipsExternalRecipientsTipsEnabled = True',
  remediationHe: 'Exchange Online PowerShell:\nSet-OrganizationConfig -MailTipsAllTipsEnabled $true -MailTipsExternalRecipientsTipsEnabled $true -MailTipsGroupMetricsEnabled $true -MailTipsLargeAudienceThreshold 25',
  whyItMattersHe: 'MailTip "Recipient is outside your organization" מזכיר למשתמש שהוא שולח לחוץ לפני לחיצה על Send — מונע דליפת מידע בשגגה.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-6.5.3',
  title: 'Ensure additional storage providers are restricted in Outlook on the web',
  titleHe: 'ודא שספקי אחסון נוספים מוגבלים ב-Outlook on the web',
  descriptionHe: 'Outlook on the web מאפשר חיבור לשירותי ענן חיצוניים (Dropbox, Google Drive, Box). יש לחסום אפשרות זו.',
  category: 'Exchange / Settings', domain: 'exchange_online', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 6.5.3', framework: 'cis_m365',
  expectedState: 'OWA Mailbox Policy: AdditionalStorageProvidersAvailable = False',
  remediationHe: 'Exchange Online PowerShell:\nGet-OwaMailboxPolicy | Set-OwaMailboxPolicy -AdditionalStorageProvidersAvailable $false\n\nאו: Exchange admin center → Settings → Outlook on the web mailbox policies → ערוך Default policy → Communication management: כבה "Third-party storage".',
  whyItMattersHe: 'משתמש יכול להעלות קבצים ארגוניים ישירות ל-Google Drive האישי שלו מתוך Outlook. חסימת ספקים חיצוניים מונעת זאת.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-6.5.4',
  title: 'Ensure SMTP AUTH is disabled',
  titleHe: 'ודא ש-SMTP AUTH מושבת',
  descriptionHe: 'SMTP AUTH מאפשר אפליקציות לשלוח דואר עם username/password פשוט. רוב הארגונים לא צריכים זאת ויש להשבית אלא אם קיים צורך ספציפי.',
  category: 'Exchange / Settings', domain: 'exchange_online', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 6.5.4', framework: 'cis_m365',
  expectedState: 'SmtpClientAuthenticationDisabled = True at organization level; enabled only per-mailbox where needed',
  remediationHe: 'Exchange Online PowerShell:\nSet-TransportConfig -SmtpClientAuthenticationDisabled $true\n\nלמדפסות/אפליקציות לגיטימיות: אפשר per-mailbox:\nSet-CASMailbox -Identity printer@company.com -SmtpClientAuthenticationDisabled $false',
  whyItMattersHe: 'SMTP AUTH לא תומך ב-MFA ומשמש לעתים קרובות ב-credential stuffing attacks. השבתה ארגונית מגינה על כל המשתמשים.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-6.5.5',
  title: 'Ensure Direct Send submissions are rejected',
  titleHe: 'ודא ש-Direct Send נדחה',
  descriptionHe: "Direct Send מאפשר לשרתים/אפליקציות לשלוח דואר ישירות ל-Exchange Online ללא אימות. ניתן לזייף כתובות שולח בדרך זו.",
  category: 'Exchange / Settings', domain: 'exchange_online', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 6.5.5', framework: 'cis_m365',
  expectedState: 'Transport Rule rejects or blocks unauthenticated Direct Send from internal IPs',
  remediationHe: 'Exchange admin center → Mail flow → Rules → New rule → Apply rule if: Sender is located "Outside the organization" AND Sender domain includes [your-domain.com] → Do the following: Reject the message with explanation "Direct Send is not permitted" → Save.\n\nהשתמש ב-SMTP Relay עם Connector מאומת במקום Direct Send.',
  whyItMattersHe: 'Direct Send מאפשר זיוף כתובת שולח פנימית — כלי phishing אידיאלי ל-spear phishing פנימי שמגיע "ממנהל" ארגוני.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});