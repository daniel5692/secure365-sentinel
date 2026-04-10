import { registerCheck } from '../checkRegistry';

// CIS Microsoft 365 Foundations Benchmark v6.0.1 - Section 2: Conditional Access

registerCheck({
  id: 'CIS-2.1.1',
  title: 'Ensure Conditional Access covers all cloud apps',
  titleHe: 'ודא שגישה מותנית מכסה את כל אפליקציות הענן',
  descriptionHe: 'מדיניות CA חייבת לכסות All cloud apps כדי שלא יישארו אפליקציות ללא הגנה.',
  category: 'Conditional Access', domain: 'conditional_access', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 2.1.1', framework: 'cis_m365',
  expectedState: 'At least one enabled CA policy with Cloud apps = All',
  remediationHe: 'CA > ודא שמדיניות קיימת עם Cloud apps or actions = All cloud apps',
  whyItMattersHe: 'מדיניות שמכסה רק אפליקציות מסוימות מאפשרת לתוקף לגשת לאפליקציות אחרות ללא הגבלה.',
  graphApiEndpoint: '/identity/conditionalAccess/policies', requiredPermissions: ['Policy.Read.All'], isAutomated: true,
});

registerCheck({
  id: 'CIS-2.1.2',
  title: 'Ensure device compliance is required for access',
  titleHe: 'ודא שנדרש התקן תואם מדיניות לגישה למשאבים',
  descriptionHe: 'רק התקנים שעומדים במדיניות Intune צריכים לקבל גישה לנתונים ארגוניים.',
  category: 'Conditional Access', domain: 'conditional_access', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 2.1.2', framework: 'cis_m365',
  expectedState: 'CA policy requiring Compliant device for cloud apps access',
  remediationHe: 'CA > New policy > Grant: Require device to be marked as compliant',
  whyItMattersHe: 'התקן לא מנוהל שנגנב מאפשר גישה לנתונים ארגוניים. Compliant device מחייב הצפנה, PIN, עדכונים.',
  graphApiEndpoint: '/identity/conditionalAccess/policies', requiredPermissions: ['Policy.Read.All'], isAutomated: true,
});

registerCheck({
  id: 'CIS-2.1.3',
  title: 'Ensure sign-in frequency and session controls are configured',
  titleHe: 'ודא שתדירות כניסה מחדש ובקרות session מוגדרות',
  descriptionHe: 'הגדרת תדירות כניסה מחדש מבטיחה שסשנים לא נשארים פעילים ללא הגבלה.',
  category: 'Conditional Access', domain: 'conditional_access', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 2.1.3', framework: 'cis_m365',
  expectedState: 'CA policy with sign-in frequency (e.g., 1 hour for admins, 8 hours for users)',
  remediationHe: 'CA > Session > Sign-in frequency — הגדר תדירות מתאימה לכל קבוצת משתמשים',
  whyItMattersHe: 'סשן שנפרץ בגניבת Token נשאר בתוקף ללא הגבלה ללא בקרות session.',
  graphApiEndpoint: '/identity/conditionalAccess/policies', requiredPermissions: ['Policy.Read.All'], isAutomated: true,
});