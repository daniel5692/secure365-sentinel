import { registerCheck } from '../checkRegistry';

// ==========================================
// Conditional Access Security Checks
// Based on CIS Microsoft 365 Foundations Benchmark v3.1.0
// ==========================================

registerCheck({
  id: 'CIS-2.1.1',
  title: 'Ensure Conditional Access policies target all cloud applications',
  titleHe: 'ודא שמדיניות גישה מותנית מכסה את כל אפליקציות הענן',
  descriptionHe: 'מדיניות גישה מותנית צריכה לכסות את כל האפליקציות ולא רק חלק מהן, כדי למנוע עקיפת הגנות.',
  category: 'Conditional Access',
  domain: 'conditional_access',
  severity: 'high',
  benchmarkRef: 'CIS 2.1.1',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'At least one Conditional Access policy targets All cloud apps',
  validationMethodHe: 'בדיקת מדיניות Conditional Access שמכסות All cloud apps',
  remediationHe: `1. היכנס ל-Microsoft Entra admin center
2. נווט אל Protection > Conditional Access
3. ודא שקיימת מדיניות שמכסה All cloud apps
4. ודא שהמדיניות דורשת MFA או תנאים מחמירים
5. בדוק שאין פערי כיסוי`,
  whyItMattersHe: 'מדיניות שמכסה רק חלק מהאפליקציות מאפשרת לתוקפים לגשת לאפליקציות לא מוגנות ולבצע תנועה רוחבית.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/identity/conditionalAccess/policies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-2.1.2',
  title: 'Ensure sign-in risk policy is configured to block high risk sign-ins',
  titleHe: 'ודא שמדיניות סיכון כניסה מוגדרת לחסימת כניסות בסיכון גבוה',
  descriptionHe: 'מדיניות סיכון כניסה (Sign-in Risk) חוסמת אוטומטית כניסות שזוהו כמסוכנות על ידי Microsoft.',
  category: 'Conditional Access',
  domain: 'conditional_access',
  severity: 'critical',
  benchmarkRef: 'CIS 2.1.2',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'Sign-in risk policy blocks or requires MFA for high-risk sign-ins',
  validationMethodHe: 'בדיקת מדיניות Conditional Access שמשתמשת בתנאי Sign-in Risk',
  remediationHe: `1. היכנס ל-Microsoft Entra admin center
2. נווט אל Protection > Conditional Access
3. צור מדיניות חדשה
4. Conditions > Sign-in risk: High
5. Grant: Block access (או דרוש MFA + שינוי סיסמה)
6. הפעל את המדיניות`,
  whyItMattersHe: 'Microsoft משתמשת בלמידת מכונה לזיהוי כניסות חשודות (מיקום לא מוכר, כתובת IP זדונית, וכו\'). חסימת כניסות בסיכון גבוה מונעת גישה לא מורשית.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/identity/conditionalAccess/policies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-2.1.3',
  title: 'Ensure user risk policy is configured to block high risk users',
  titleHe: 'ודא שמדיניות סיכון משתמש חוסמת משתמשים בסיכון גבוה',
  descriptionHe: 'מדיניות סיכון משתמש (User Risk) דורשת שינוי סיסמה או חוסמת משתמשים שזוהו כבעלי סיכון גבוה.',
  category: 'Conditional Access',
  domain: 'conditional_access',
  severity: 'critical',
  benchmarkRef: 'CIS 2.1.3',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'User risk policy requires password change or blocks high-risk users',
  validationMethodHe: 'בדיקת מדיניות Conditional Access שמשתמשת בתנאי User Risk',
  remediationHe: `1. היכנס ל-Microsoft Entra admin center
2. נווט אל Protection > Conditional Access
3. צור מדיניות חדשה
4. Conditions > User risk: High
5. Grant: Require password change
6. הפעל את המדיניות`,
  whyItMattersHe: 'משתמשים שזוהו כבסיכון גבוה (חשבון שנפרץ, credentials שדלפו) חייבים להיות מטופלים מיידית כדי למנוע נזק נוסף.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/identity/conditionalAccess/policies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});