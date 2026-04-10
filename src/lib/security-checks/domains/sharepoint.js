import { registerCheck } from '../checkRegistry';

// ==========================================
// SharePoint Online & External Sharing Security Checks
// ==========================================

registerCheck({
  id: 'CIS-5.1.1',
  title: 'Ensure SharePoint external sharing is managed and controlled',
  titleHe: 'ודא ששיתוף חיצוני ב-SharePoint מנוהל ומבוקר',
  descriptionHe: 'שיתוף חיצוני ב-SharePoint צריך להיות מוגבל לרמה המתאימה לארגון, ולא פתוח ללא הגבלה.',
  category: 'SharePoint / OneDrive',
  domain: 'sharepoint',
  severity: 'high',
  benchmarkRef: 'CIS 5.1.1',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'External sharing restricted to authenticated guests or more restrictive',
  validationMethodHe: 'בדיקת הגדרות שיתוף חיצוני ברמת SharePoint tenant',
  remediationHe: `1. היכנס ל-SharePoint admin center
2. נווט אל Policies > Sharing
3. הגדר רמת שיתוף חיצוני ל-"New and existing guests" או מגביל יותר
4. ודא שלא נבחר "Anyone" (שיתוף אנונימי)
5. הגדר מגבלות זמן לקישורי אורח
6. דרוש אימות זהות לאורחים`,
  whyItMattersHe: 'שיתוף חיצוני לא מבוקר עלול לחשוף מידע ארגוני רגיש לגורמים לא מורשים, כולל קבלנים, שותפים או תוקפים.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/admin/sharepoint/settings',
  requiredPermissions: ['SharePoint.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.2.1',
  title: 'Ensure OneDrive external sharing is restricted',
  titleHe: 'ודא ששיתוף חיצוני ב-OneDrive מוגבל',
  descriptionHe: 'שיתוף חיצוני ב-OneDrive צריך להיות מוגבל לפחות לרמת SharePoint או מחמיר יותר.',
  category: 'SharePoint / OneDrive',
  domain: 'onedrive',
  severity: 'medium',
  benchmarkRef: 'CIS 5.2.1',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'OneDrive sharing not more permissive than SharePoint',
  validationMethodHe: 'השוואת הגדרות שיתוף חיצוני של OneDrive מול SharePoint',
  remediationHe: `1. היכנס ל-SharePoint admin center
2. נווט אל Policies > Sharing
3. ודא שהגדרת OneDrive לא פתוחה יותר מ-SharePoint
4. הגדר מגבלות שיתוף מתאימות`,
  whyItMattersHe: 'OneDrive מכיל קבצים אישיים של עובדים שעלולים לכלול מידע רגיש. שיתוף לא מבוקר עלול לחשוף מסמכים פנימיים.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/admin/sharepoint/settings',
  requiredPermissions: ['SharePoint.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-6.1.1',
  title: 'Ensure external access in Microsoft Teams is managed',
  titleHe: 'ודא שגישה חיצונית ב-Teams מנוהלת',
  descriptionHe: 'גישה חיצונית (Federation) ב-Teams מאפשרת תקשורת עם משתמשים מארגונים אחרים. יש לנהל ולהגביל.',
  category: 'Microsoft Teams',
  domain: 'teams',
  severity: 'medium',
  benchmarkRef: 'CIS 6.1.1',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'External access configured with allowed domains only or disabled',
  validationMethodHe: 'בדיקת הגדרות External Access ב-Teams admin center',
  remediationHe: `1. היכנס ל-Teams admin center
2. נווט אל Users > External access
3. בחר "Allow only specific external domains" או "Block all"
4. הוסף דומיינים מורשים בלבד
5. ודא ש-Skype for Business interop מוגדר בהתאם`,
  whyItMattersHe: 'גישה חיצונית פתוחה מאפשרת לכל משתמש חיצוני ליצור קשר עם עובדי הארגון, מה שמגדיל את הסיכון לפישינג דרך Teams.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/admin/teams/settings',
  requiredPermissions: ['TeamSettings.Read.All'],
  isAutomated: true,
});