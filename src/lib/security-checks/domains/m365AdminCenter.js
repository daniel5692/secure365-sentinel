import { registerCheck } from '../checkRegistry';

// CIS Microsoft 365 Foundations Benchmark v6.0.1 - Section 1: Microsoft 365 Admin Center

// 1.1.1 - Admin accounts cloud-only — already exists as CIS-1.4.2 in entraId.js

// 1.1.3 - Between 2-4 Global Admins — already exists as CIS-1.4.1 in entraId.js

// 1.1.4 (L1) - Admin accounts use licenses with reduced application footprint
registerCheck({
  id: 'CIS-M365-1.1.4',
  title: 'Ensure administrative accounts use licenses with a reduced application footprint',
  titleHe: 'ודא שחשבונות מנהל משתמשים ברישיונות עם נגיעה מינימלית באפליקציות',
  descriptionHe: 'חשבונות ניהול לא צריכים לשאת רישיונות M365/E3/E5 המכילים Exchange, Teams ואפליקציות נוספות. רישיון הניהול צריך להיות מינימלי (כגון Entra ID P2 בלבד) כדי לצמצם משטח תקיפה.',
  category: 'Microsoft 365 Admin Center', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.1.4', framework: 'cis_m365',
  expectedState: 'Admin accounts assigned minimal licenses (no Exchange/Teams/Office apps)',
  remediationHe: 'Microsoft 365 Admin Center (admin.microsoft.com) → Users → Active users → בחר חשבון מנהל → Licenses → הסר רישיונות M365/E3/E5 שמכילים אפליקציות מיותרות → השאר רק Entra ID P1/P2 או Microsoft 365 F1 → Save. חשוב: אל תסיר רישיונות מחשבון העבודה השוטפת, רק מחשבון הניהול הייעודי.',
  whyItMattersHe: 'חשבון מנהל עם Exchange/Teams יכול לשמש לקריאת דואר, שליחת הודעות ושיתוף קבצים — מה שמגדיל את הסיכון אם החשבון ייפרץ.',
  graphApiEndpoint: '/users',
  requiredPermissions: ['Directory.Read.All', 'User.Read.All'],
  isAutomated: true,
});

// 1.2.1 (L2) - Only organizationally managed/approved public groups exist
registerCheck({
  id: 'CIS-M365-1.2.1',
  title: 'Ensure that only organizationally managed/approved public groups exist',
  titleHe: 'ודא שרק קבוצות ציבוריות מנוהלות ומאושרות קיימות בארגון',
  descriptionHe: 'קבוצות ציבוריות (Public Groups/Teams) בלא בעלות ומאשרת ארגונית עלולות להכיל מידע רגיש שנגיש לכל אחד בארגון.',
  category: 'Microsoft 365 Admin Center', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.2.1', framework: 'cis_m365',
  expectedState: 'No unmanaged public Microsoft 365 Groups; group creation restricted to admins',
  remediationHe: 'Microsoft 365 Admin Center (admin.microsoft.com) → Teams & groups → Active teams & groups → סנן לפי Type: Public → בחן כל קבוצה ציבורית: האם יש לה בעלים? האם היא נחוצה? שנה ל-Private אם לא מוצדקת. לחץ על הקבוצה → Settings → Privacy → Private. כדי לא לאפשר ליצור קבוצות: Entra admin center → Groups → Settings → ″Restrict users from creating groups″.',
  whyItMattersHe: 'קבוצות ציבוריות חושפות קבצים, שיחות ועדכונים לכל עובד בארגון — כולל קבלנים ואורחים עם הרשאה.',
  graphApiEndpoint: '/groups',
  requiredPermissions: ['Group.Read.All'],
  isAutomated: true,
});

// 1.2.2 (L1) - Sign-in to shared mailboxes is blocked
registerCheck({
  id: 'CIS-M365-1.2.2',
  title: 'Ensure sign-in to shared mailboxes is blocked',
  titleHe: 'ודא שהתחברות ישירה לתיבות דואר משותפות חסומה',
  descriptionHe: 'תיבות דואר משותפות לא אמורות לאפשר כניסה ישירה — שימוש בהן צריך להיות רק דרך הרשאת SendAs/FullAccess מחשבון אחר.',
  category: 'Microsoft 365 Admin Center', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.2.2', framework: 'cis_m365',
  expectedState: 'All shared mailboxes have AccountEnabled = false (sign-in blocked)',
  remediationHe: 'PowerShell: Connect-MgGraph -Scopes "User.ReadWrite.All" → Get-MgUser -Filter "assignedLicenses/\$count eq 0 and userType eq \'Member\'" | כדי לסנן shared mailboxes השתמש ב-Exchange: Get-Mailbox -RecipientTypeDetails SharedMailbox | ForEach { Update-MgUser -UserId $_.ExternalDirectoryObjectId -AccountEnabled $false }. לחלופין: Entra admin center → Users → בחן כל shared mailbox ידנית → Block sign-in.',
  whyItMattersHe: 'תיבות דואר משותפות לעתים קרובות אין להן מדיניות MFA וסיסמתן לא מתחדשת. גישה ישירה להן מאפשרת עקיפת כל בקרת האבטחה.',
  graphApiEndpoint: '/users',
  requiredPermissions: ['User.Read.All', 'Mail.Read'],
  isAutomated: true,
});

// 1.3.2 (L2) - Idle session timeout for unmanaged devices ≤ 3 hours
registerCheck({
  id: 'CIS-M365-1.3.2',
  title: "Ensure 'Idle session timeout' is set to 3 hours or less for unmanaged devices",
  titleHe: 'ודא שזמן סיום סשן בטלה מוגדר ל-3 שעות לכל היותר להתקנים לא מנוהלים',
  descriptionHe: 'משתמשים שמשתמשים ב-Microsoft 365 מדפדפן בהתקן לא מנוהל (ביתי/ציבורי) עלולים לשכוח להתנתק. תפוגה אוטומטית מגנה.',
  category: 'Microsoft 365 Admin Center', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.3.2', framework: 'cis_m365',
  expectedState: 'Idle session timeout ≤ 3 hours for unmanaged devices',
  remediationHe: 'Microsoft 365 Admin Center (admin.microsoft.com) → Security → Idle session timeout → Turn on → Set to 3 hours (or 1 hour for higher security) → Apply to "Unmanaged devices only" → Save. הגדרה זו חלה על Office web apps (Outlook, SharePoint, etc.).',
  whyItMattersHe: 'סשן פתוח על מחשב ציבורי מאפשר לכל מי שמגיע למחשב לגשת לנתוני הארגון.',
  graphApiEndpoint: '/policies/activityBasedTimeoutPolicies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

// 1.3.3 (L2) - External sharing of calendars is not available
registerCheck({
  id: 'CIS-M365-1.3.3',
  title: "Ensure 'External sharing' of calendars is not available",
  titleHe: 'ודא שאי אפשר לשתף לוחות שנה עם גורמים חיצוניים',
  descriptionHe: 'שיתוף לוחות שנה עם משתמשים חיצוניים חושף מידע ארגוני כמו פגישות, מיקומים ומשתתפים.',
  category: 'Microsoft 365 Admin Center', domain: 'exchange_online', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.3.3', framework: 'cis_m365',
  expectedState: 'Calendar sharing to external users disabled (no free/busy details)',
  remediationHe: 'Exchange Admin Center (admin.exchange.microsoft.com) → Organization → Sharing → External sharing policies → Default sharing policy → Edit → הסר את כל הפעולות שמאפשרות שיתוף עם "Internet (anonymous)" ו-"All domains" → Save. לחלופין: Microsoft 365 Admin Center → Org settings → Calendar → כבה "Let users share their calendars with people outside of your organization".',
  whyItMattersHe: 'מידע לוח שנה חושף פגישות עסקיות, שמות לקוחות ומיקומים לתוקף שמנהל מודיעין (OSINT).',
  graphApiEndpoint: '/admin/sharepoint/settings',
  requiredPermissions: ['SharePointTenantSettings.Read.All'],
  isAutomated: false,
});

// 1.3.4 (L1) - User owned apps and services are restricted
registerCheck({
  id: 'CIS-M365-1.3.4',
  title: "Ensure 'User owned apps and services' is restricted",
  titleHe: 'ודא שאפליקציות ושירותים בבעלות משתמשים מוגבלים',
  descriptionHe: 'מניעת הורדה והתקנת אפליקציות Microsoft 365 על ידי משתמשים בלא אישור IT מפחיתה סיכוני Shadow IT.',
  category: 'Microsoft 365 Admin Center', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.3.4', framework: 'cis_m365',
  expectedState: 'Users cannot install Microsoft 365 apps without admin approval',
  remediationHe: 'Microsoft 365 Admin Center (admin.microsoft.com) → Settings → Org settings → Microsoft 365 installation options → כבה "Let users install Microsoft 365 apps on up to 5 PCs or Macs" → כבה גם "Let users start trials on behalf of your organization" → Save.',
  whyItMattersHe: 'אפליקציות לא מנוהלות עלולות לאחסן נתונים ארגוניים מחוץ לשליטת IT, לשמש כ-shadow storage ולגרום לדליפות.',
  graphApiEndpoint: '/settings',
  requiredPermissions: ['Directory.Read.All'],
  isAutomated: true,
});

// 1.3.5 (L1) - Internal phishing protection for Microsoft Forms is enabled
registerCheck({
  id: 'CIS-M365-1.3.5',
  title: 'Ensure internal phishing protection for Forms is enabled',
  titleHe: 'ודא שהגנת פישינג פנימי ב-Microsoft Forms מופעלת',
  descriptionHe: 'Microsoft Forms יכול לשמש לאיסוף אישורים (credentials) מעובדים על ידי שליחת טפסים פנימיים מזויפים.',
  category: 'Microsoft 365 Admin Center', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.3.5', framework: 'cis_m365',
  expectedState: 'Forms phishing protection enabled; suspicious forms flagged and blocked',
  remediationHe: 'Microsoft 365 Admin Center (admin.microsoft.com) → Settings → Org settings → Microsoft Forms → סמן "Add internal phishing protection" → Save. הגדרה זו גורמת ל-Microsoft לסרוק טפסים אוטומטית ולחסום אלה שנראים כמו phishing.',
  whyItMattersHe: 'תוקפים פנימיים יכולים ליצור Forms זדוניים שמחקים עמודי login ומגנבים סיסמאות מעמיתים.',
  graphApiEndpoint: '/settings',
  requiredPermissions: ['Directory.Read.All'],
  isAutomated: true,
});

// 1.3.6 - Customer Lockbox — already exists as CIS-4.4.1 in defender.js

// 1.3.7 (L2) - Third-party storage restricted in Microsoft 365 on the web
registerCheck({
  id: 'CIS-M365-1.3.7',
  title: "Ensure 'third-party storage services' are restricted in 'Microsoft 365 on the web'",
  titleHe: 'ודא שאחסון ענן של צד שלישי מוגבל ב-Microsoft 365 באינטרנט',
  descriptionHe: 'Microsoft 365 מאפשר ברירת מחדל לפתוח ולשמור קבצים ישירות ל-Google Drive, Box, Dropbox וכדומה.',
  category: 'Microsoft 365 Admin Center', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.3.7', framework: 'cis_m365',
  expectedState: 'Third-party cloud storage disabled in Microsoft 365 web apps',
  remediationHe: 'Microsoft 365 Admin Center (admin.microsoft.com) → Settings → Org settings → Microsoft 365 on the web → כבה "Let users open files stored in third-party storage services in Microsoft 365 on the web" → Save.',
  whyItMattersHe: 'שמירת קבצי Office ל-Google Drive/Dropbox פירושה שנתונים ארגוניים עוברים מחוץ לסביבה המנוהלת וה-DLP policies לא חלות עליהם.',
  graphApiEndpoint: '/settings',
  requiredPermissions: ['Directory.Read.All'],
  isAutomated: true,
});

// 1.3.9 (L1) - Shared bookings pages restricted to select users
registerCheck({
  id: 'CIS-M365-1.3.9',
  title: 'Ensure shared bookings pages are restricted to select users',
  titleHe: 'ודא שדפי הזמנות משותפים (Bookings) מוגבלים למשתמשים נבחרים',
  descriptionHe: 'Microsoft Bookings מאפשר לאנשי חוץ לראות זמינות עובדים ולקבוע פגישות. ללא הגבלה, כל עובד יכול ליצור דף Bookings ציבורי.',
  category: 'Microsoft 365 Admin Center', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 1.3.9', framework: 'cis_m365',
  expectedState: 'Bookings creation restricted to admins or specific security group',
  remediationHe: 'Microsoft 365 Admin Center (admin.microsoft.com) → Settings → Org settings → Bookings → כבה "Allow your organization to use Bookings" לחלוטין, או הגבל: סמן "Allow only selected users to create Bookings calendars" → בחר security group → Save.',
  whyItMattersHe: 'דף Bookings פומבי חושף את זמינות העובד לכל אחד באינטרנט וניתן לנצל לאיסוף מידע עסקי (לאיזה פגישות פנוי? עם מי?).',
  graphApiEndpoint: '/settings',
  requiredPermissions: ['Directory.Read.All'],
  isAutomated: true,
});