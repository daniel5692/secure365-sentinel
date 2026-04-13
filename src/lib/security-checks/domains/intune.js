import { registerCheck } from '../checkRegistry';

// CIS Microsoft 365 Foundations Benchmark v6.0.1 - Section 4: Microsoft Intune

// 4.1 (L2) - Devices without compliance policy marked not compliant
registerCheck({
  id: 'CIS-4.1',
  title: "Ensure devices without a compliance policy are marked 'not compliant'",
  titleHe: 'ודא שמכשירים ללא מדיניות תאימות מסומנים כלא תואמים (Not Compliant)',
  descriptionHe: 'כברירת מחדל, Intune מתייחס למכשירים ללא policy כתואמים. יש לשנות הגדרה זו (secureByDefault = true) כך שמכשיר שאין לו policy מוקצית ייחשב כלא תואם ויחסם מגישה למשאבים.',
  category: 'Intune & Endpoint Device', domain: 'defender', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 4.1', framework: 'cis_m365',
  expectedState: 'deviceManagement/settings: secureByDefault = true',
  remediationHe: 'Microsoft Intune admin center (intune.microsoft.com) → Devices → Compliance → Compliance policy settings → שנה את ההגדרה לא תואם (Not Compliant) → Save.',
  whyItMattersHe: 'מכשיר ללא policy שנחשב תואם יוכל לגשת למשאבים ארגוניים מבלי שאף בדיקת אבטחה תוחל עליו — כולל מכשירים אישיים לא מנוהלים.',
  graphApiEndpoint: '/deviceManagement/settings',
  requiredPermissions: ['DeviceManagementConfiguration.Read.All'],
  isAutomated: true,
});

// 4.2 (L2) - Block device enrollment for personally owned devices
registerCheck({
  id: 'CIS-4.2',
  title: 'Ensure device enrollment for personally owned devices is blocked by default',
  titleHe: 'ודא שהרשמת מכשירים אישיים חסומה כברירת מחדל',
  descriptionHe: "Intune מאפשר לחסום רישום של מכשירים אישיים (BYOD) שאינם בבעלות החברה. יש להגדיר שרק מכשירי Corporate-owned מורשים להירשם.",
  category: 'Intune / Device Management', domain: 'defender', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 4.2', framework: 'cis_m365',
  expectedState: 'Enrollment restrictions block personally owned devices for all platforms',
  remediationHe: 'Microsoft Intune admin center (intune.microsoft.com) → Devices → Enrollment → Enrollment restrictions → ערוך את "All users" Device type restriction → עבור כל פלטפורמה (Android, iOS, Windows, macOS): שנה "Personally owned" ל-Block → Review + Save.',
  whyItMattersHe: 'מכשירים אישיים לא מנוהלים שמתחברים לרשת הארגונית מהווים סיכון — אין שליטה על עדכוני אבטחה, הגדרות, או יכולת מחיקה מרחוק.',
  graphApiEndpoint: '/deviceManagement/deviceEnrollmentConfigurations',
  requiredPermissions: ['DeviceManagementConfiguration.Read.All'],
  isAutomated: true,
});