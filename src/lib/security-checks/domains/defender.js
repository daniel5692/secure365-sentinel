import { registerCheck } from '../checkRegistry';

// CIS Microsoft 365 Foundations Benchmark v6.0.1 - Section 4: Microsoft Defender for Office 365

registerCheck({
  id: 'CIS-4.1.1',
  title: 'Ensure Safe Attachments policy is enabled',
  titleHe: 'ודא שמדיניות Safe Attachments פעילה',
  descriptionHe: 'Safe Attachments פותחת קבצים מצורפים בסביבה מבודדת (detonation) לפני מסירתם למשתמש.',
  category: 'Defender for Office 365', domain: 'defender', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 4.1.1', framework: 'cis_m365',
  expectedState: 'Safe Attachments policy enabled covering all users',
  remediationHe: 'Microsoft Defender > Email & collaboration > Policies > Safe attachments > הפעל מדיניות לכל הדומיינים',
  whyItMattersHe: 'רוב ה-ransomware מועבר כקובץ מצורף. Safe Attachments חוסם מתקפות zero-day לפני שהן מגיעות למשתמש.',
  graphApiEndpoint: '/security/secureScores', requiredPermissions: ['SecurityEvents.Read.All'], isAutomated: true,
});

registerCheck({
  id: 'CIS-4.1.2',
  title: 'Ensure Safe Links policy is enabled',
  titleHe: 'ודא שמדיניות Safe Links פעילה',
  descriptionHe: 'Safe Links בודקת כתובות URL בהודעות דואר ובמסמכי Office בזמן לחיצה.',
  category: 'Defender for Office 365', domain: 'defender', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 4.1.2', framework: 'cis_m365',
  expectedState: 'Safe Links policy enabled for email and Office apps',
  remediationHe: 'Microsoft Defender > Email & collaboration > Policies > Safe links > הפעל עם "Do not allow users to click through"',
  whyItMattersHe: 'קישורי פישינג משתנים לאחר מסירת הדואר. Safe Links בודקת URL בזמן לחיצה, לא רק בזמן קבלה.',
  graphApiEndpoint: '/security/secureScores', requiredPermissions: ['SecurityEvents.Read.All'], isAutomated: true,
});

registerCheck({
  id: 'CIS-4.2.1',
  title: 'Ensure Anti-Phishing policy is configured with impersonation protection',
  titleHe: 'ודא שמדיניות אנטי-פישינג מוגדרת עם הגנת התחזות',
  descriptionHe: 'Defender for Office 365 מציע הגנה מפני התחזות לדומיינים ולמשתמשים ספציפיים.',
  category: 'Defender for Office 365', domain: 'defender', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 4.2.1', framework: 'cis_m365',
  expectedState: 'Anti-phishing policy with user and domain impersonation protection enabled',
  remediationHe: 'Microsoft Defender > Policies > Anti-phishing > הגדר הגנת התחזות לדומיינים ובכירים בארגון',
  whyItMattersHe: 'BEC מסתמך על התחזות לכתובות של מנהלים. הגנת impersonation מזהה ניסיונות אלו.',
  graphApiEndpoint: '/security/secureScores', requiredPermissions: ['SecurityEvents.Read.All'], isAutomated: true,
});

registerCheck({
  id: 'CIS-4.3.1',
  title: 'Ensure Microsoft Secure Score is at least 60%',
  titleHe: 'ודא שציון אבטחה (Secure Score) הוא לפחות 60%',
  descriptionHe: 'Microsoft Secure Score מציג את רמת האבטחה הכוללת ומדריך לשיפור.',
  category: 'Secure Score', domain: 'defender', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 4.3.1', framework: 'cis_m365',
  expectedState: 'Secure Score ≥ 60%',
  remediationHe: 'Microsoft Defender > Secure score > Recommended actions — יישם את ההמלצות בסדר עדיפות',
  whyItMattersHe: 'Secure Score מרכז את כל ההמלצות. ציון נמוך מ-60% מצביע על פערים בסיסיים.',
  graphApiEndpoint: '/security/secureScores', requiredPermissions: ['SecurityEvents.Read.All'], isAutomated: true,
});

registerCheck({
  id: 'CIS-4.4.1',
  title: 'Ensure Customer Lockbox is enabled',
  titleHe: 'ודא ש-Customer Lockbox מופעל',
  descriptionHe: 'Customer Lockbox מחייב אישור ממנהל הארגון לפני שמהנדסי Microsoft יכולים לגשת לנתוני הדייר.',
  category: 'Defender for Office 365', domain: 'defender', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 4.4.1', framework: 'cis_m365',
  expectedState: 'Customer Lockbox enabled',
  remediationHe: 'Microsoft 365 Admin Center > Settings > Org settings > Security & privacy > Customer Lockbox = On',
  whyItMattersHe: 'Customer Lockbox מבטיח שגישת Microsoft לנתוניך היא רק באישורך ולצורך פתרון בעיות מתועד.',
  graphApiEndpoint: null, requiredPermissions: [], isAutomated: false,
});