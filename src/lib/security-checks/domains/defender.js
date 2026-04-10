import { registerCheck } from '../checkRegistry';

// ==========================================
// Microsoft Defender Security Checks
// Based on CIS Microsoft 365 Foundations Benchmark v3.1.0
// ==========================================

registerCheck({
  id: 'CIS-4.1.1',
  title: 'Ensure Safe Attachments policy is enabled',
  titleHe: 'ודא שמדיניות Safe Attachments מופעלת',
  descriptionHe: 'Safe Attachments סורק קבצים מצורפים בסביבת sandbox לפני מסירה למשתמש, ומגן מפני תוכנות זדוניות חדשות.',
  category: 'Microsoft Defender',
  domain: 'defender',
  severity: 'critical',
  benchmarkRef: 'CIS 4.1.1',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'Safe Attachments policy enabled with Dynamic Delivery or Block',
  validationMethodHe: 'בדיקת מדיניות Safe Attachments ב-Microsoft Defender for Office 365',
  remediationHe: `1. היכנס ל-Microsoft 365 Defender portal
2. נווט אל Email & collaboration > Policies > Threat policies
3. לחץ על Safe Attachments
4. צור או ערוך מדיניות
5. הגדר Action: Dynamic Delivery (מומלץ) או Block
6. הפעל לכל הנמענים בארגון`,
  whyItMattersHe: 'קבצים מצורפים הם וקטור תקיפה מרכזי. Safe Attachments מזהה איומים שלא נתפסים על ידי חתימות אנטי-וירוס מסורתיות.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/security/threatProtection/safeAttachmentsPolicies',
  requiredPermissions: ['ThreatAssessment.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-4.1.2',
  title: 'Ensure Safe Links policy is enabled',
  titleHe: 'ודא שמדיניות Safe Links מופעלת',
  descriptionHe: 'Safe Links בודק קישורים בזמן אמת ומגן מפני קישורים זדוניים בדואר אלקטרוני ובמסמכי Office.',
  category: 'Microsoft Defender',
  domain: 'defender',
  severity: 'high',
  benchmarkRef: 'CIS 4.1.2',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'Safe Links policy enabled for all users with URL scanning on click',
  validationMethodHe: 'בדיקת מדיניות Safe Links ב-Microsoft Defender for Office 365',
  remediationHe: `1. היכנס ל-Microsoft 365 Defender portal
2. נווט אל Threat policies > Safe Links
3. צור או ערוך מדיניות
4. הפעל URL scanning בעת לחיצה
5. הפעל scanning בתוך מסמכי Office
6. אל תאפשר למשתמשים לעקוף`,
  whyItMattersHe: 'קישורים זדוניים הם הטכניקה הנפוצה ביותר בפישינג. Safe Links בודק כל קישור בזמן הלחיצה ומגן גם מפני קישורים שנהפכו לזדוניים לאחר מסירת ההודעה.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/security/threatProtection/safeLinksPolicies',
  requiredPermissions: ['ThreatAssessment.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-4.2.1',
  title: 'Ensure anti-phishing policy is enabled with advanced settings',
  titleHe: 'ודא שמדיניות אנטי-פישינג מופעלת עם הגדרות מתקדמות',
  descriptionHe: 'מדיניות אנטי-פישינג מתקדמת כוללת הגנת התחזות (Impersonation Protection) לניהול, דומיינים וזיהוי Mailbox Intelligence.',
  category: 'Microsoft Defender',
  domain: 'defender',
  severity: 'high',
  benchmarkRef: 'CIS 4.2.1',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'Anti-phishing policy with impersonation protection enabled',
  validationMethodHe: 'בדיקת מדיניות Anti-Phishing ב-Microsoft Defender עם Impersonation Protection',
  remediationHe: `1. היכנס ל-Microsoft 365 Defender portal
2. נווט אל Threat policies > Anti-phishing
3. ערוך את המדיניות
4. הפעל Impersonation Protection למשתמשים מרכזיים
5. הפעל Domain Impersonation Protection
6. הגדר פעולות: Quarantine
7. הפעל Mailbox Intelligence`,
  whyItMattersHe: 'התחזות (Impersonation) היא טכניקת פישינג מתוחכמת שבה תוקפים מתחזים למנהלים או שותפים עסקיים. ללא הגנה מתאימה, התקפות אלו קשות מאוד לזיהוי.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/security/threatProtection/antiPhishingPolicies',
  requiredPermissions: ['ThreatAssessment.Read.All'],
  isAutomated: true,
});