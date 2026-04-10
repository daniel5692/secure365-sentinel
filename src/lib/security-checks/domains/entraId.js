import { registerCheck } from '../checkRegistry';

// ==========================================
// Entra ID Security Checks
// Based on CIS Microsoft 365 Foundations Benchmark v3.1.0
// ==========================================

registerCheck({
  id: 'CIS-1.1.1',
  title: 'Ensure Security Defaults is disabled on Azure Active Directory',
  titleHe: 'ודא שהגדרות ברירת מחדל לאבטחה מושבתות ב-Entra ID',
  descriptionHe: 'הגדרות ברירת מחדל לאבטחה (Security Defaults) מספקות רמת אבטחה בסיסית, אך ארגונים בוגרים צריכים להשתמש ב-Conditional Access לשליטה מדויקת יותר.',
  category: 'Account / Authentication',
  domain: 'entra_id',
  severity: 'high',
  benchmarkRef: 'CIS 1.1.1',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'Security Defaults should be disabled when Conditional Access policies are in use',
  validationMethodHe: 'בדיקת הגדרות ברירת מחדל לאבטחה דרך Microsoft Graph API - endpoint: /policies/identitySecurityDefaultsEnforcementPolicy',
  remediationHe: `1. היכנס למרכז הניהול של Microsoft Entra
2. נווט אל Identity > Overview > Properties
3. לחץ על "Manage security defaults"
4. שנה את ההגדרה ל-Disabled
5. הפעל מדיניות Conditional Access מותאמת במקום
6. ודא שכל המשתמשים מכוסים על ידי מדיניות גישה מותנית`,
  whyItMattersHe: 'הגדרות ברירת מחדל מספקות הגנה בסיסית בלבד. מדיניות גישה מותנית (Conditional Access) מאפשרת שליטה מדויקת ומותאמת לדרישות הארגון, כולל MFA, מגבלות מיקום, ותנאי התקן.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/policies/identitySecurityDefaultsEnforcementPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-1.1.3',
  title: 'Ensure that between two and four global admins are designated',
  titleHe: 'ודא שבין שניים לארבעה מנהלי Global Admin מוגדרים',
  descriptionHe: 'מספר מנהלי מערכת ברמת Global Admin צריך להיות מינימלי - בין 2 ל-4. מספר גבוה מדי מגדיל את משטח התקיפה.',
  category: 'Account / Authentication',
  domain: 'entra_id',
  severity: 'critical',
  benchmarkRef: 'CIS 1.1.3',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'Between 2 and 4 Global Administrator accounts',
  validationMethodHe: 'בדיקת מספר המשתמשים עם תפקיד Global Administrator דרך Microsoft Graph API',
  remediationHe: `1. היכנס למרכז הניהול של Microsoft Entra
2. נווט אל Identity > Roles & admins > All roles
3. חפש את תפקיד "Global Administrator"
4. סקור את רשימת המשתמשים המוקצים
5. הסר מנהלים מיותרים או הוסף מנהל גיבוי
6. ודא שיש בין 2 ל-4 מנהלים בלבד
7. שקול שימוש ב-PIM (Privileged Identity Management) לגישה Just-in-Time`,
  whyItMattersHe: 'חשבונות Global Admin הם המטרה העיקרית לתוקפים. מספר מצומצם של מנהלים מקטין את שטח התקיפה, בעוד שלפחות 2 מנהלים מבטיחים המשכיות עסקית.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/directoryRoles/roleTemplateId=62e90394-69f5-4237-9190-012177145e10/members',
  requiredPermissions: ['Directory.Read.All', 'RoleManagement.Read.Directory'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-1.1.4',
  title: 'Ensure self-service password reset is enabled',
  titleHe: 'ודא שאיפוס סיסמה עצמאי מופעל',
  descriptionHe: 'איפוס סיסמה עצמאי (SSPR) מאפשר למשתמשים לאפס סיסמאות ללא עזרת ה-IT, תוך שמירה על אבטחה.',
  category: 'Account / Authentication',
  domain: 'entra_id',
  severity: 'medium',
  benchmarkRef: 'CIS 1.1.4',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'Self-service password reset enabled for all users',
  validationMethodHe: 'בדיקת הגדרת SSPR דרך Microsoft Graph API - endpoint: /policies/authenticationMethodsPolicy',
  remediationHe: `1. היכנס ל-Microsoft Entra admin center
2. נווט אל Protection > Password reset
3. הגדר "Self service password reset enabled" ל-All
4. הגדר שיטות אימות מתאימות (לפחות 2)
5. הפעל Registration enforcement
6. סקור את הגדרות ההתראות`,
  whyItMattersHe: 'SSPR מפחית עומס על צוות IT, משפר את חוויית המשתמש, ומבטיח שמשתמשים יכולים לשחזר גישה בצורה מאובטחת ללא התערבות ידנית.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/policies/authenticationMethodsPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-1.2.1',
  title: 'Ensure multi-factor authentication is enabled for all users',
  titleHe: 'ודא שאימות רב-שלבי (MFA) מופעל לכל המשתמשים',
  descriptionHe: 'אימות רב-שלבי הוא ההגנה הבסיסית ביותר נגד גניבת חשבונות. יש לוודא שכל המשתמשים מחויבים ב-MFA.',
  category: 'Account / Authentication',
  domain: 'entra_id',
  severity: 'critical',
  benchmarkRef: 'CIS 1.2.1',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'MFA enabled and enforced for all users via Conditional Access',
  validationMethodHe: 'בדיקת מדיניות גישה מותנית שדורשת MFA עבור כל המשתמשים',
  remediationHe: `1. היכנס ל-Microsoft Entra admin center
2. נווט אל Protection > Conditional Access
3. צור מדיניות חדשה או ערוך קיימת
4. Users: All users
5. Cloud apps: All cloud apps
6. Grant: Require multi-factor authentication
7. הפעל את המדיניות
8. בדוק שאין אי-כללים (Exclusions) לא מוצדקים`,
  whyItMattersHe: 'אימות רב-שלבי חוסם מעל 99.9% מהתקפות גניבת זהות. ללא MFA, סיסמה שנפרצה מאפשרת גישה מלאה לחשבון ולכל המידע הארגוני.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/identity/conditionalAccess/policies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-1.2.2',
  title: 'Ensure multi-factor authentication is enabled for all admins',
  titleHe: 'ודא שאימות רב-שלבי מופעל לכל המנהלים',
  descriptionHe: 'מנהלי מערכת חייבים להיות מוגנים ב-MFA ללא יוצא מן הכלל. חשבונות מנהלים הם יעד עדיפות לתוקפים.',
  category: 'Account / Authentication',
  domain: 'entra_id',
  severity: 'critical',
  benchmarkRef: 'CIS 1.2.2',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'MFA enforced for all administrative roles',
  validationMethodHe: 'בדיקת מדיניות Conditional Access שדורשת MFA לתפקידי מנהל',
  remediationHe: `1. היכנס ל-Microsoft Entra admin center
2. נווט אל Protection > Conditional Access
3. צור מדיניות ייעודית למנהלים
4. Users: Directory roles - בחר את כל תפקידי המנהל
5. Cloud apps: All cloud apps
6. Grant: Require multi-factor authentication
7. הפעל מיד - ללא תקופת מעבר`,
  whyItMattersHe: 'חשבונות מנהלים בעלי הרשאות מוגברות הם היעד המועדף על תוקפים. פריצה לחשבון מנהל ללא MFA עלולה להוביל להשתלטות מלאה על הסביבה.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/identity/conditionalAccess/policies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});