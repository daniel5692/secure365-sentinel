import { registerCheck } from '../checkRegistry';

// CIS Microsoft 365 Foundations Benchmark v6.0.1 - Section 7: SharePoint Admin Center

// ─── 7.2 Policies ───

registerCheck({
  id: 'CIS-7.2.1',
  title: 'Ensure modern authentication for SharePoint applications is required',
  titleHe: 'ודא שאימות מודרני נדרש עבור אפליקציות SharePoint',
  descriptionHe: 'SharePoint Online חייב לדרוש Modern Authentication ולמנוע גישה דרך Legacy Auth protocols שאינם תומכים ב-MFA.',
  category: 'SharePoint / Policies', domain: 'sharepoint', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 7.2.1', framework: 'cis_m365',
  expectedState: 'SharePoint and OneDrive legacy authentication blocked; LegacyAuthProtocolsEnabled = False',
  remediationHe: 'SharePoint admin center (admin.microsoft.com/sharepoint) → Policies → Access control → Apps that do not use modern authentication: Block access → Save.',
  whyItMattersHe: 'Legacy Auth ל-SharePoint עוקפת MFA ומאפשרת גישה עם username/password בלבד — וקטור מרכזי בגניבת קבצים ארגוניים.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-7.2.2',
  title: 'Ensure SharePoint and OneDrive integration with Azure AD B2B is enabled',
  titleHe: 'ודא ש-SharePoint ו-OneDrive משולבים עם Azure AD B2B',
  descriptionHe: 'שיתוף דרך Azure AD B2B מחייב את האורחים להיכנס עם זהות מאומתת, ומאפשר אכיפת Conditional Access ומדיניות גישה על אורחים.',
  category: 'SharePoint / Policies', domain: 'sharepoint', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 7.2.2', framework: 'cis_m365',
  expectedState: 'SharePoint B2B integration enabled; guests invited via Azure AD B2B flow',
  remediationHe: 'SharePoint admin center → Policies → Sharing → External sharing → בקטע "More external sharing settings": סמן "Integrate SharePoint and OneDrive with Azure AD B2B" → Save.',
  whyItMattersHe: 'ללא B2B, אורחים יכולים לגשת לקבצים עם חשבון Microsoft שאינו ניתן לניהול — ללא MFA, ללא Conditional Access, ללא audit identity.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-7.2.5',
  title: 'Ensure that SharePoint guest users cannot share items they do not own',
  titleHe: 'ודא שמשתמשי אורח ב-SharePoint לא יכולים לשתף פריטים שאינם שלהם',
  descriptionHe: 'אורח שקיבל גישה לתיקיה לא צריך להיות מסוגל לשתף אותה הלאה עם גורמים נוספים ללא ידיעת הבעלים.',
  category: 'SharePoint / Policies', domain: 'sharepoint', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 7.2.5', framework: 'cis_m365',
  expectedState: 'PreventExternalUsersFromResharing = True',
  remediationHe: 'SharePoint admin center → Policies → Sharing → External sharing → בקטע "More external sharing settings": סמן "Prevent guests from sharing items they do not own" → Save.',
  whyItMattersHe: 'Re-sharing על ידי אורחים מאפשר הפצה ויראלית של קבצים רגישים מחוץ לשליטת הארגון — ללא ידיעת הבעלים.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-7.2.6',
  title: 'Ensure SharePoint external sharing is restricted',
  titleHe: 'ודא ששיתוף חיצוני ב-SharePoint מוגבל',
  descriptionHe: 'רמת השיתוף החיצוני של SharePoint צריכה להיות לכל היותר "New and existing guests" — לא "Anyone" (קישורים אנונימיים).',
  category: 'SharePoint / Policies', domain: 'sharepoint', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 7.2.6', framework: 'cis_m365',
  expectedState: 'SharePoint external sharing level = New and existing guests (not Anyone)',
  remediationHe: 'SharePoint admin center → Policies → Sharing → External sharing → SharePoint: הגדר ל-"New and existing guests" או "Only people in your organization" → Save.',
  whyItMattersHe: 'קישור "Anyone" אינו דורש כניסה ואינו ניתן לביטול בצורה אמינה — כל מי שיש לו את הקישור יכול לגשת ללא הגבלה.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-7.2.7',
  title: 'Ensure link sharing is restricted in SharePoint and OneDrive',
  titleHe: 'ודא ששיתוף קישורים מוגבל ב-SharePoint ו-OneDrive',
  descriptionHe: 'ברירת המחדל לסוג הקישור בעת שיתוף צריכה להיות "Specific people" ולא "Anyone" או "People in your organization".',
  category: 'SharePoint / Policies', domain: 'sharepoint', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 7.2.7', framework: 'cis_m365',
  expectedState: 'Default sharing link type = Specific people (not Anyone or Organization)',
  remediationHe: 'SharePoint admin center → Policies → Sharing → Default sharing link type: בחר "Specific people (only the people the user specifies)" → Default link permission: View → Save.',
  whyItMattersHe: 'כאשר ברירת המחדל היא "Anyone in organization", משתמשים מחלקים בלחיצה אחת קישורים שגישה אליהם כוללת את כל הארגון.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-7.2.8',
  title: 'Ensure external sharing is restricted by security group',
  titleHe: 'ודא ששיתוף חיצוני מוגבל לקבוצת אבטחה ספציפית',
  descriptionHe: 'רק חברי קבוצת אבטחה ייעודית צריכים להיות מורשים לשתף תוכן עם גורמים חיצוניים.',
  category: 'SharePoint / Policies', domain: 'sharepoint', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 7.2.8', framework: 'cis_m365',
  expectedState: 'External sharing limited to designated security group members',
  remediationHe: 'SharePoint admin center → Policies → Sharing → בקטע "More external sharing settings": סמן "Limit external sharing by domain" ו-"Allow sharing only with people in specific security groups" → הגדר את קבוצת האבטחה המורשית → Save.',
  whyItMattersHe: 'הגבלת שיתוף לקבוצה מנוהלת מבטיחה שרק עובדים מאושרים (בד"כ מנהלי פרויקטים) יכולים לשתף מחוץ לארגון.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: false,
});

registerCheck({
  id: 'CIS-7.2.9',
  title: 'Ensure guest access to a site or OneDrive will expire automatically',
  titleHe: 'ודא שגישת אורח לאתר או OneDrive פוקעת אוטומטית',
  descriptionHe: 'יש להגדיר תפוגה אוטומטית לגישת אורחים כדי להבטיח שגישה זמנית לא הופכת לגישה קבועה.',
  category: 'SharePoint / Policies', domain: 'sharepoint', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 7.2.9', framework: 'cis_m365',
  expectedState: 'Guest access expiration enabled; expiration ≤ 30 days',
  remediationHe: 'SharePoint admin center → Policies → Sharing → בקטע "More external sharing settings": סמן "Guest access to a site or OneDrive will expire automatically after this many days" → הגדר 30 ימים → Save.',
  whyItMattersHe: 'שיתוף לאורח "לפרויקט" שנגמר לפני שנה עדיין פעיל ברוב הארגונים. תפוגה אוטומטית מבטיחה cleanup ומצמצמת exposure.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-7.2.10',
  title: 'Ensure reauthentication with verification code is restricted',
  titleHe: 'ודא שאימות מחדש עם קוד אימות מוגבל',
  descriptionHe: 'כאשר אורח משתמש בקוד אימות חד פעמי (email OTP), יש להגביל את תקופת הגישה ולדרוש אימות מחדש לאחר ימים ספורים.',
  category: 'SharePoint / Policies', domain: 'sharepoint', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 7.2.10', framework: 'cis_m365',
  expectedState: 'People who use a verification code must reauthenticate after ≤ 15 days',
  remediationHe: 'SharePoint admin center → Policies → Sharing → בקטע "More external sharing settings": "People who use a verification code must reauthenticate after this many days": הגדר 15 ימים → Save.',
  whyItMattersHe: 'ללא reauthentication, דפדפן שנגנב (עם cookies) מאפשר גישה בלתי מוגבלת לקבצים לאורך זמן.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-7.2.11',
  title: 'Ensure the SharePoint default sharing link permission is set',
  titleHe: 'ודא שהרשאת קישור שיתוף ברירת המחדל ב-SharePoint מוגדרת',
  descriptionHe: 'ברירת המחדל להרשאת קישור שיתוף צריכה להיות View בלבד — לא Edit — כדי למנוע עריכה לא מכוונת.',
  category: 'SharePoint / Policies', domain: 'sharepoint', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 7.2.11', framework: 'cis_m365',
  expectedState: 'Default link permission = View (not Edit)',
  remediationHe: 'SharePoint admin center → Policies → Sharing → Default link permission: בחר "View" → Save.',
  whyItMattersHe: 'כאשר ברירת המחדל היא Edit, משתמשים שמשתפים "לצפייה" מקבלים ללא כוונה הרשאות עריכה. View כברירת מחדל מחייב בחירה מודעת.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

// ─── 7.3 Settings ───

registerCheck({
  id: 'CIS-7.3.1',
  title: 'Ensure Office 365 SharePoint infected files are disallowed for download',
  titleHe: 'ודא שקבצים נגועים ב-SharePoint לא ניתנים להורדה',
  descriptionHe: 'כאשר Defender מזהה קובץ נגוע ב-SharePoint, יש למנוע הורדתו — גם למנהלים.',
  category: 'SharePoint / Settings', domain: 'sharepoint', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 7.3.1', framework: 'cis_m365',
  expectedState: 'DisallowInfectedFileDownload = True',
  remediationHe: 'SharePoint Online PowerShell:\nSet-SPOTenant -DisallowInfectedFileDownload $true\n\nאו: SharePoint admin center → Settings → חפש "Infected files" → Enable "Don\'t allow users to download malicious files identified by Defender".',
  whyItMattersHe: 'קובץ שזוהה כנגוע אך עדיין ניתן להורדה הוא סכנה ממשית. Defender מסמן אך לא חוסם ללא הגדרה זו.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-7.3.2',
  title: 'Ensure OneDrive sync is restricted for unmanaged devices',
  titleHe: 'ודא שסנכרון OneDrive מוגבל למכשירים מנוהלים בלבד',
  descriptionHe: 'סנכרון OneDrive צריך להיות מוגבל למכשירים שמצורפים לדומיין הארגוני — ולא למכשירים אישיים.',
  category: 'SharePoint / Settings', domain: 'sharepoint', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 7.3.2', framework: 'cis_m365',
  expectedState: 'OneDrive sync allowed only from domain-joined devices (TenantRestrictionEnabled)',
  remediationHe: 'SharePoint admin center → Settings → OneDrive → Sync → "Allow syncing only on computers joined to specific domains" → הוסף את ה-Domain GUID(s) שלך → Save.\n\nאו ב-PowerShell: Set-SPOTenant -AllowedDomainListForSyncClient @("GUID1","GUID2")',
  whyItMattersHe: 'עובד שמסנכרן OneDrive למחשב אישי מעתיק את כל הנתונים הארגוניים למחוץ לשליטת הארגון — ללא Intune, ללא Remote Wipe.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});