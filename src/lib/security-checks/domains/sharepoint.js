import { registerCheck } from '../checkRegistry';

// CIS Microsoft 365 Foundations Benchmark v6.0.1 - Section 5: SharePoint Online & OneDrive

registerCheck({
  id: 'CIS-5.1.1',
  title: 'Ensure SharePoint external sharing is not set to "Anyone"',
  titleHe: 'ודא שהשיתוף החיצוני ב-SharePoint אינו מוגדר ל-"כל אחד"',
  descriptionHe: 'הגדרת "Anyone" מאפשרת שיתוף קבצים ללא אימות — כל מי שיש לו קישור יכול לגשת.',
  category: 'SharePoint Online', domain: 'sharepoint', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.1', framework: 'cis_m365',
  expectedState: 'External sharing level = New and existing guests OR Only people in your organization',
  remediationHe: 'SharePoint Admin Center (admin.microsoft.com → Show all → SharePoint) → Policies → Sharing → תחת "External sharing" הגדר את SharePoint ל-"New and existing guests" (או נמוך יותר) → Save. אל תשאיר ב-"Anyone".',
  //
  whyItMattersHe: 'שיתוף "Anyone" יוצר קישורים anonymiים. מידע רגיש יכול לדלוף אם הקישור נשלח הלאה.',
  graphApiEndpoint: null, requiredPermissions: [], isAutomated: false,
});

registerCheck({
  id: 'CIS-5.1.2',
  title: 'Ensure OneDrive external sharing is restricted',
  titleHe: 'ודא שהשיתוף החיצוני ב-OneDrive מוגבל',
  descriptionHe: 'OneDrive לעתים קרובות מכיל קבצים אישיים ורגישים. שיתוף חופשי מסוכן.',
  category: 'SharePoint Online', domain: 'sharepoint', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.2', framework: 'cis_m365',
  expectedState: 'OneDrive sharing limited to New and existing guests or less permissive',
  remediationHe: 'SharePoint Admin Center (admin.microsoft.com → Show all → SharePoint) → Policies → Sharing → גלול למטה לקטע OneDrive → הגדר ל-"New and existing guests" (לא "Anyone") → Save.',
  //
  whyItMattersHe: 'משתמשים שיתפו OneDrive לינקים anonymiים מבלי לדעת שהם נגישים לכולם.',
  graphApiEndpoint: null, requiredPermissions: [], isAutomated: false,
});

registerCheck({
  id: 'CIS-5.2.1',
  title: 'Ensure legacy authentication to SharePoint is disabled',
  titleHe: 'ודא שאימות Legacy ל-SharePoint מושבת',
  descriptionHe: 'SharePoint תומך בפרוטוקולים ישנים שעוקפים MFA ו-Conditional Access.',
  category: 'SharePoint Online', domain: 'sharepoint', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.1', framework: 'cis_m365',
  expectedState: 'LegacyAuthProtocolsEnabled = False',
  remediationHe: 'PowerShell: Connect-SPOService -Url https://[tenant]-admin.sharepoint.com → הרץ: Set-SPOTenant -LegacyAuthProtocolsEnabled $false → אמת עם: Get-SPOTenant | Select LegacyAuthProtocolsEnabled (ציפייה: False). בנוסף מומלץ להגדיר Conditional Access policy שחוסם Legacy Auth.',
  //
  whyItMattersHe: 'Legacy auth ל-SharePoint מאפשר גישה ישירה לקבצים ולאתרים עם שם משתמש/סיסמה בלבד.',
  graphApiEndpoint: null, requiredPermissions: [], isAutomated: false,
});

registerCheck({
  id: 'CIS-5.3.1',
  title: 'Ensure OneDrive sync is restricted to domain-joined devices only',
  titleHe: 'ודא שסנכרון OneDrive מוגבל להתקנים מנוהלים בלבד',
  descriptionHe: 'הגבלת הסנכרון מונעת הורדת נתונים ארגוניים למחשבים אישיים לא מנוהלים.',
  category: 'SharePoint Online', domain: 'sharepoint', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.3.1', framework: 'cis_m365',
  expectedState: 'OneDrive sync restricted to specific domain GUIDs (AllowedDomainGuids configured)',
  remediationHe: 'SharePoint Admin Center (admin.microsoft.com → SharePoint) → Settings → OneDrive Sync → סמן "Allow syncing only on computers joined to specific domains" → הוסף Domain GUID (מצא אותו ב-Entra ID → Overview → Tenant ID, או PowerShell: Get-ADDomain | Select ObjectGUID) → Save.',
  //
  whyItMattersHe: 'עובד שמוריד נתוני חברה למחשב אישי יוצר סיכון — המחשב הפרטי לא מנוהל ויכול להיפרץ.',
  graphApiEndpoint: null, requiredPermissions: [], isAutomated: false,
});