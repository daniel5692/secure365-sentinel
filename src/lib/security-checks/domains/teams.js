import { registerCheck } from '../checkRegistry';

// CIS Microsoft 365 Foundations Benchmark v6.0.1 - Section 6: Microsoft Teams

registerCheck({
  id: 'CIS-6.1.1',
  title: 'Ensure external access in Teams is restricted to known domains',
  titleHe: 'ודא שגישה חיצונית ב-Teams מוגבלת לדומיינים ידועים',
  descriptionHe: 'הגדרת "Allow all external domains" מאפשרת לכל אדם מחוץ לארגון ליצור קשר דרך Teams.',
  category: 'Microsoft Teams', domain: 'teams', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 6.1.1', framework: 'cis_m365',
  expectedState: 'External access restricted to specific allowed domains',
  remediationHe: 'Teams Admin Center > Users > External access > Allow only specific external domains',
  whyItMattersHe: 'External access פתוח מאפשר phishing ישירות דרך Teams מכל ארגון בעולם.',
  graphApiEndpoint: null, requiredPermissions: [], isAutomated: false,
});

registerCheck({
  id: 'CIS-6.1.2',
  title: 'Ensure guest access permissions in Teams are configured securely',
  titleHe: 'ודא שהרשאות גישת אורחים ב-Teams מוגדרות בצורה מאובטחת',
  descriptionHe: 'אורחים ב-Teams לא צריכים להיות מסוגלים לבצע שיחות פרטיות או לגשת לתצוגות ניהול.',
  category: 'Microsoft Teams', domain: 'teams', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 6.1.2', framework: 'cis_m365',
  expectedState: 'Guest access with limited permissions (no private calling, no presence)',
  remediationHe: 'Teams Admin Center > Users > Guest access > השבת Make private calls, Allow IP video, וכו\'',
  whyItMattersHe: 'אורח עם הרשאות רחבות יכול לקיים שיחות לא מנוטרות עם עובדים ולגשת לתוכן רגיש.',
  graphApiEndpoint: null, requiredPermissions: [], isAutomated: false,
});

registerCheck({
  id: 'CIS-6.2.1',
  title: 'Ensure anonymous users cannot start Teams meetings',
  titleHe: 'ודא שמשתמשים אנונימיים אינם יכולים להתחיל פגישות Teams',
  descriptionHe: 'משתמשים אנונימיים שמצטרפים לפגישה לפני המארח יכולים לנצל פגיעויות.',
  category: 'Microsoft Teams', domain: 'teams', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 6.2.1', framework: 'cis_m365',
  expectedState: 'Allow anonymous users to start a meeting = Off',
  remediationHe: 'Teams Admin Center > Meetings > Meeting policies > Allow anonymous users to start a meeting = Off',
  whyItMattersHe: 'ללא הגבלה זו, אנשים חיצוניים יכולים "לחטוף" פגישות ריקות ולחכות לניצול.',
  graphApiEndpoint: null, requiredPermissions: [], isAutomated: false,
});

registerCheck({
  id: 'CIS-6.3.1',
  title: 'Ensure meeting recordings are stored in OneDrive or SharePoint',
  titleHe: 'ודא שהקלטות ישיבות Teams מאוחסנות ב-OneDrive או SharePoint',
  descriptionHe: 'הקלטות שמאוחסנות ב-Microsoft עצמה (Azure Media Services) ממשיכות להיות נגישות לאחר פקיעה.',
  category: 'Microsoft Teams', domain: 'teams', severity: 'low',
  benchmarkRef: 'CIS M365 v6.0.1 - 6.3.1', framework: 'cis_m365',
  expectedState: 'Meeting recording storage = OneDrive (default in current Teams)',
  remediationHe: 'בגרסאות Teams מודרניות הקלטות עוברות ל-OneDrive אוטומטית; ודא שאין override',
  whyItMattersHe: 'הקלטות מכילות לעתים מידע רגיש. אחסון ב-OneDrive/SharePoint מאפשר DLP ו-retention policies.',
  graphApiEndpoint: null, requiredPermissions: [], isAutomated: false,
});