import { registerCheck } from '../checkRegistry';

// CIS Microsoft 365 Foundations Benchmark v6.0.1 - Section 2: Microsoft 365 Defender

// 2.1.1 (L2) - Safe Links for Office Applications
registerCheck({
  id: 'CIS-2.1.1',
  title: 'Ensure Safe Links for Office Applications is enabled',
  titleHe: 'ודא ש-Safe Links מופעל עבור אפליקציות Office',
  descriptionHe: 'Safe Links חייב להיות מופעל גם עבור אפליקציות Office (Word, Excel, PowerPoint, Teams) ולא רק עבור דואר אלקטרוני. קישורים בקבצי Office יבדקו בזמן לחיצה.',
  category: 'Defender for Office 365', domain: 'defender', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 2.1.1', framework: 'cis_m365',
  expectedState: 'Safe Links policy with Office 365 apps protection enabled (EnableForOfficeApps = true)',
  remediationHe: 'Microsoft Defender portal (security.microsoft.com) → Email & collaboration → Policies & rules → Threat policies → Safe Links → ערוך policy קיימת או צור חדשה → בקטע "Office 365 apps": סמן "Enable Safe Links in Office 365 apps" → סמן "Do not let users click through Safe Links to original URL" → Save.',
  whyItMattersHe: 'קישורים זדוניים בקבצי Office לא מטופלים על ידי Safe Links לדואר. תוקפים שולחים קבצי Word עם hyperlinks שעוקפים את הגנת הדואר.',
  graphApiEndpoint: '/security/secureScores',
  requiredPermissions: ['SecurityEvents.Read.All'],
  isAutomated: true,
});

// 2.1.2 (L1) - Common Attachment Types Filter
registerCheck({
  id: 'CIS-2.1.2',
  title: 'Ensure the Common Attachment Types Filter is enabled',
  titleHe: 'ודא שמסנן סוגי קבצים מצורפים נפוצים מופעל',
  descriptionHe: 'Common Attachment Types Filter חוסם אוטומטית סוגי קבצים מסוכנים (.exe, .vbs, .js, .bat וכדומה) בלא צורך בבדיקת תוכן.',
  category: 'Defender for Office 365', domain: 'defender', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 2.1.2', framework: 'cis_m365',
  expectedState: 'Anti-malware policy with common attachment filter enabled',
  remediationHe: 'Microsoft Defender portal (security.microsoft.com) → Email & collaboration → Policies & rules → Threat policies → Anti-malware → ערוך "Default (Default)" policy → בקטע "Protection settings": הפעל "Enable the common attachments filter" → הוסף סוגי קבצים לפי הצורך → Notify: "Notify internal senders" → Save.',
  whyItMattersHe: 'קבצי הפעלה (.exe, .com) וסקריפטים (.js, .vbs) לא אמורים להישלח בדואר ארגוני. חסימה אוטומטית מונעת אינספור וקטורי תקיפה.',
  graphApiEndpoint: '/security/secureScores',
  requiredPermissions: ['SecurityEvents.Read.All'],
  isAutomated: true,
});

// 2.1.3 (L1) - Notifications for internal users sending malware
registerCheck({
  id: 'CIS-2.1.3',
  title: 'Ensure notifications for internal users sending malware is enabled',
  titleHe: 'ודא שהתראות למשתמשים פנימיים ששולחים תוכנות זדוניות מופעלות',
  descriptionHe: 'כאשר חשבון פנימי שולח malware, חשוב שיקבל התראה — ייתכן שחשבונו נפרץ או שנשלח תוכן זדוני בטעות.',
  category: 'Defender for Office 365', domain: 'defender', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 2.1.3', framework: 'cis_m365',
  expectedState: 'Anti-malware policy notifies sender when malware is detected in outbound email',
  remediationHe: 'Microsoft Defender portal (security.microsoft.com) → Email & collaboration → Policies & rules → Threat policies → Anti-malware → ערוך "Default" policy → בקטע "Notification": הפעל "Notify an admin about undelivered messages from internal senders" → הזן כתובת מנהל → Save.',
  whyItMattersHe: 'חשבון פנימי ששולח malware הוא סימן לפריצה. התראה מיידית מאפשרת תגובה מהירה לפני שהנזק מתפשט.',
  graphApiEndpoint: '/security/secureScores',
  requiredPermissions: ['SecurityEvents.Read.All'],
  isAutomated: true,
});

// 2.1.5 (L2) - Safe Attachments for SharePoint, OneDrive, Teams
registerCheck({
  id: 'CIS-2.1.5',
  title: 'Ensure Safe Attachments for SharePoint, OneDrive, and Microsoft Teams is enabled',
  titleHe: 'ודא ש-Safe Attachments מופעל עבור SharePoint, OneDrive ו-Teams',
  descriptionHe: 'Safe Attachments יכול לבדוק קבצים שנשמרים ב-SharePoint ו-OneDrive, לא רק קבצים מצורפים לדואר. הגדרה זו מגינה על כל שיתוף קבצים בענן.',
  category: 'Defender for Office 365', domain: 'defender', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 2.1.5', framework: 'cis_m365',
  expectedState: 'Safe Attachments enabled for SharePoint/OneDrive/Teams (AllowSafeDocsOpen = false)',
  remediationHe: 'Microsoft Defender portal (security.microsoft.com) → Email & collaboration → Policies & rules → Threat policies → Safe Attachments → Global settings → הפעל "Turn on Defender for Office 365 for SharePoint, OneDrive, and Microsoft Teams" → הפעל "Turn on Safe Documents for Office clients" → כבה "Allow people to click through Protected View even if Safe Documents identified the file as malicious" → Save.',
  whyItMattersHe: 'קבצים זדוניים יכולים להיכנס לארגון דרך OneDrive/Teams ישירות, תוך עקיפת הגנת הדואר. Safe Attachments לענן מכסה וקטור תקיפה זה.',
  graphApiEndpoint: '/security/secureScores',
  requiredPermissions: ['SecurityEvents.Read.All'],
  isAutomated: true,
});

// 2.1.6 (L1) - Exchange Online Spam Policies notify administrators
registerCheck({
  id: 'CIS-2.1.6',
  title: 'Ensure Exchange Online Spam Policies are set to notify administrators',
  titleHe: 'ודא שמדיניות ספאם ב-Exchange Online מוגדרת לשלוח התראות למנהלים',
  descriptionHe: 'מנהלים צריכים לקבל התראה כאשר הודעות יוצאות נחסמות בגלל ספאם — זה סימן שחשבון עשוי להיות מסוכן.',
  category: 'Defender for Office 365', domain: 'defender', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 2.1.6', framework: 'cis_m365',
  expectedState: 'Outbound spam policy notifies admins; BccSuspiciousOutboundMail = true',
  remediationHe: 'Microsoft Defender portal (security.microsoft.com) → Email & collaboration → Policies & rules → Threat policies → Anti-spam → ערוך "Anti-spam outbound policy (Default)" → Automatic forwarding: Off → Notifications: הפעל "Send a copy of suspicious outbound email to these email addresses" ו-"Notify these users and groups if a sender is blocked" → הזן כתובת מנהל → Save.',
  whyItMattersHe: 'חשבון שנפרץ ומשמש לשליחת ספאם יוביל לחסימת הדומיין כולו ב-blacklists. התראה מהירה מאפשרת בלימה לפני נזק מוניטין.',
  graphApiEndpoint: '/security/secureScores',
  requiredPermissions: ['SecurityEvents.Read.All'],
  isAutomated: true,
});

// 2.1.11 (L2) - Comprehensive attachment filtering
registerCheck({
  id: 'CIS-2.1.11',
  title: 'Ensure comprehensive attachment filtering is applied',
  titleHe: 'ודא שסינון קבצים מצורפים מקיף מוגדר',
  descriptionHe: 'מעבר לרשימת ברירת המחדל, יש להרחיב את מסנן סוגי הקבצים לכלול סוגים מסוכנים נוספים כגון .iso, .img, .lnk, .cab, .ps1 ועוד.',
  category: 'Defender for Office 365', domain: 'defender', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 2.1.11', framework: 'cis_m365',
  expectedState: 'Anti-malware policy blocks extended list including: iso, img, lnk, cab, ps1, vhd, xll',
  remediationHe: 'Microsoft Defender portal (security.microsoft.com) → Email & collaboration → Policies & rules → Threat policies → Anti-malware → Default policy → Edit → Common attachment filter → "+ Add file types" → הוסף: iso, img, lnk, cab, ps1, vhd, xll, wsf, hta, pif → Save.',
  whyItMattersHe: 'תוקפים משתמשים בסוגי קבצים פחות מוכרים כמו .iso (קבצי דיסק) ו-.lnk (קיצורי דרך) להפעלת malware שעוקף מסנני ברירת מחדל.',
  graphApiEndpoint: '/security/secureScores',
  requiredPermissions: ['SecurityEvents.Read.All'],
  isAutomated: true,
});

// 2.1.12 (L1) - Connection filter IP allow list not used
registerCheck({
  id: 'CIS-2.1.12',
  title: 'Ensure the connection filter IP allow list is not used',
  titleHe: 'ודא שרשימת ה-IP המותרים במסנן חיבורים אינה בשימוש',
  descriptionHe: 'כתובות IP ברשימת ה-Allow עוקפות את כל בדיקות Anti-spam ו-Anti-malware. שימוש בה מסוכן ויש להשתמש ב-Enhanced Filtering במקום.',
  category: 'Defender for Office 365', domain: 'defender', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 2.1.12', framework: 'cis_m365',
  expectedState: 'Connection filter policy IPAllowList is empty',
  remediationHe: 'Microsoft Defender portal (security.microsoft.com) → Email & collaboration → Policies & rules → Threat policies → Anti-spam → Connection filter policy (Default) → Edit → IP Allow List: הסר את כל הכתובות → Save. אם נדרש whitelist של שולח ספציפי, השתמש ב-Advanced Delivery (Connectors) ולא ב-IP Allow List.',
  whyItMattersHe: 'כתובת IP ב-allow list מאפשרת לתוקף לשלוח malware, phishing וספאם ללא כל בדיקה — עוקפת Safe Attachments, Safe Links ו-Anti-spam.',
  graphApiEndpoint: '/security/secureScores',
  requiredPermissions: ['SecurityEvents.Read.All'],
  isAutomated: true,
});

// 2.1.13 (L1) - Connection filter safe list is off
registerCheck({
  id: 'CIS-2.1.13',
  title: 'Ensure the connection filter safe list is off',
  titleHe: 'ודא שה-Safe list במסנן חיבורים מושבת',
  descriptionHe: 'ה-Safe List הוא רשימה שמתעדכנת אוטומטית על ידי Microsoft עם כתובות שנחשבות "בטוחות". הפעלתה מעוקפת לכל בדיקות הסינון.',
  category: 'Defender for Office 365', domain: 'defender', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 2.1.13', framework: 'cis_m365',
  expectedState: 'Connection filter policy EnableSafeList = false',
  remediationHe: 'Microsoft Defender portal (security.microsoft.com) → Email & collaboration → Policies & rules → Threat policies → Anti-spam → Connection filter policy (Default) → Edit → כבה "Turn on safe list" → Save.',
  whyItMattersHe: 'ה-Safe list מבוססת על מוניטין ועשויה לכלול שרתי דואר לגיטימיים שנפרצו. כיבויה מבטיח שכל הודעה נבדקת.',
  graphApiEndpoint: '/security/secureScores',
  requiredPermissions: ['SecurityEvents.Read.All'],
  isAutomated: true,
});

// 2.1.14 (L1) - Inbound anti-spam no allowed domains
registerCheck({
  id: 'CIS-2.1.14',
  title: 'Ensure inbound anti-spam policies do not contain allowed domains',
  titleHe: 'ודא שמדיניות אנטי-ספאם נכנסת לא כוללת דומיינים מותרים',
  descriptionHe: 'הוספת דומיין לרשימת ה-Allowed Domains גורמת לכך שכל הודעה ממנו עוקפת בדיקות spam ו-phishing — כולל malware.',
  category: 'Defender for Office 365', domain: 'defender', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 2.1.14', framework: 'cis_m365',
  expectedState: 'All anti-spam policies have empty AllowedSenderDomains list',
  remediationHe: 'Microsoft Defender portal (security.microsoft.com) → Email & collaboration → Policies & rules → Threat policies → Anti-spam → בדוק כל policy → Edit → בקטע "Allowed and blocked senders and domains": הסר את כל הדומיינים מ-"Allowed domains" → Save. אם צריך whitelist לשולח ספציפי, השתמש ב-Advanced Delivery.',
  whyItMattersHe: 'דומיין שנפרץ ברשימת ה-Allow הפך לוקטור תקיפה ישיר. תוקף שיפרוץ ל-partner.com יוכל לשלוח phishing ללא כל בדיקה.',
  graphApiEndpoint: '/security/secureScores',
  requiredPermissions: ['SecurityEvents.Read.All'],
  isAutomated: true,
});

// 2.1.15 (L1) - Outbound anti-spam message limits
registerCheck({
  id: 'CIS-2.1.15',
  title: 'Ensure outbound anti-spam message limits are in place',
  titleHe: 'ודא שמגבלות על הודעות יוצאות מוגדרות במדיניות אנטי-ספאם',
  descriptionHe: 'הגדרת מגבלות שעתיות ויומיות על מספר הודעות שמשתמש יכול לשלוח מגבילה נזק כאשר חשבון נפרץ ומשמש לשליחת ספאם בכמות גדולה.',
  category: 'Defender for Office 365', domain: 'defender', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 2.1.15', framework: 'cis_m365',
  expectedState: 'Outbound spam policy: RecipientLimitExternalPerHour ≤ 500, ActionWhenThresholdReached = BlockUser',
  remediationHe: 'Microsoft Defender portal (security.microsoft.com) → Email & collaboration → Policies & rules → Threat policies → Anti-spam → Anti-spam outbound policy (Default) → Edit → Message limits: External hourly limit: 500, Daily limit: 1000, Internal hourly limit: 1000 → Action when limit is reached: "Restrict the user from sending mail" → Save.',
  whyItMattersHe: 'חשבון שנפרץ ומשמש לספאם יכול לשלוח מאות אלפי הודעות ביום, מה שמוביל לחסימת הדומיין ב-blacklists גלובליים.',
  graphApiEndpoint: '/security/secureScores',
  requiredPermissions: ['SecurityEvents.Read.All'],
  isAutomated: true,
});

// 2.4.1 (L1) - Priority account protection enabled
registerCheck({
  id: 'CIS-2.4.1',
  title: 'Ensure Priority account protection is enabled and configured',
  titleHe: 'ודא שהגנת חשבונות בעדיפות גבוהה מופעלת ומוגדרת',
  descriptionHe: 'Microsoft Defender מאפשר לסמן חשבונות VIP (מנהלים, כירים) כ-Priority Accounts שמקבלים ניתוח איומים מוגבר ודוחות ייעודיים.',
  category: 'Defender for Office 365', domain: 'defender', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 2.4.1', framework: 'cis_m365',
  expectedState: 'Priority accounts configured with key executives and admins tagged',
  remediationHe: 'Microsoft Defender portal (security.microsoft.com) → Settings → Email & collaboration → User tags → Priority account → Edit → הוסף את כל המנהלים הבכירים, בעלי הרשאות גלובליות, וחשבונות קריטיים → Save. לאחר מכן ודא שה-Threat protection status report מציג את ה-Priority accounts.',
  whyItMattersHe: 'חשבונות בכירים (CEO, CFO, IT Admin) הם המטרות הנפוצות ביותר להתקפות BEC ו-spear phishing. ניטור מוגבר מאפשר זיהוי מוקדם.',
  graphApiEndpoint: '/security/secureScores',
  requiredPermissions: ['SecurityEvents.Read.All'],
  isAutomated: true,
});

// 2.4.2 (L1) - Priority accounts have Strict protection presets
registerCheck({
  id: 'CIS-2.4.2',
  title: "Ensure Priority accounts have 'Strict protection' presets applied",
  titleHe: 'ודא שחשבונות בעדיפות גבוהה משתמשים בהגדרות ה-Strict protection',
  descriptionHe: 'Microsoft Defender מספק שתי רמות preset policy: Standard ו-Strict. חשבונות Priority צריכים להיות תחת Strict שמספקת הגנה מקסימלית.',
  category: 'Defender for Office 365', domain: 'defender', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 2.4.2', framework: 'cis_m365',
  expectedState: 'Priority accounts covered by Strict preset security policies',
  remediationHe: 'Microsoft Defender portal (security.microsoft.com) → Email & collaboration → Policies & rules → Preset security policies → Strict protection → Edit → בקטע "Apply Exchange Online Protection": הוסף את קבוצת ה-Priority accounts → בקטע "Apply Defender for Office 365 protection": הוסף אותם שוב → Review and confirm → Save.',
  whyItMattersHe: 'Strict preset כולל בדיקות נוספות ומחמירות שאינן חלק מ-Standard: הסגר (quarantine) עם אישור מנהל, הגנת impersonation מלאה, ו-ZAP תוקפני יותר.',
  graphApiEndpoint: '/security/secureScores',
  requiredPermissions: ['SecurityEvents.Read.All'],
  isAutomated: true,
});

// 2.4.4 (L1) - Zero-hour auto purge for Teams
registerCheck({
  id: 'CIS-2.4.4',
  title: 'Ensure Zero-hour auto purge for Microsoft Teams is on',
  titleHe: 'ודא ש-Zero-hour auto purge (ZAP) עבור Microsoft Teams מופעל',
  descriptionHe: 'ZAP ל-Teams מנקה אוטומטית הודעות זדוניות שהתגלו לאחר מסירה מתוך שיחות Teams — בדומה ל-ZAP לדואר.',
  category: 'Defender for Office 365', domain: 'defender', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 2.4.4', framework: 'cis_m365',
  expectedState: 'Zero-hour auto purge enabled for Microsoft Teams messages',
  remediationHe: 'Microsoft Defender portal (security.microsoft.com) → Email & collaboration → Policies & rules → Threat policies → Safe Attachments → Global settings → הפעל "Enable ZAP for Teams messages" → Save. שים לב: דורש Defender for Office 365 Plan 2.',
  whyItMattersHe: 'לאחר שהודעה נמסרה ב-Teams, ייתכן שהתגלה שהיא זדונית. ZAP מסיר אותה רטרואקטיבית ומונע פתיחה מאוחרת על ידי משתמשים.',
  graphApiEndpoint: '/security/secureScores',
  requiredPermissions: ['SecurityEvents.Read.All'],
  isAutomated: true,
});