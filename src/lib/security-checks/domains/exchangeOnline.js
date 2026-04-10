import { registerCheck } from '../checkRegistry';

// ==========================================
// Exchange Online Security Checks
// Based on CIS Microsoft 365 Foundations Benchmark v3.1.0
// ==========================================

registerCheck({
  id: 'CIS-3.1.1',
  title: 'Ensure modern authentication is enabled for Exchange Online',
  titleHe: 'ודא שאימות מודרני מופעל ב-Exchange Online',
  descriptionHe: 'אימות מודרני (Modern Authentication) תומך ב-MFA ושיטות אימות מתקדמות. יש להשבית פרוטוקולים ישנים.',
  category: 'Exchange Online',
  domain: 'exchange_online',
  severity: 'high',
  benchmarkRef: 'CIS 3.1.1',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'Modern authentication enabled, legacy protocols blocked',
  validationMethodHe: 'בדיקת הגדרות Exchange Online ומדיניות Conditional Access לחסימת legacy protocols',
  remediationHe: `1. היכנס ל-Exchange admin center
2. נווט אל Settings > Organization settings
3. ודא ש-Modern Authentication מופעל
4. צור Conditional Access policy לחסימת Legacy Authentication
5. מעבר לאימות מודרני בכל הלקוחות`,
  whyItMattersHe: 'פרוטוקולים ישנים (POP3, IMAP, SMTP Basic Auth) לא תומכים ב-MFA ומהווים וקטור תקיפה נפוץ.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/admin/exchange/organizationConfig',
  requiredPermissions: ['Exchange.ManageAsApp'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-3.2.1',
  title: 'Ensure mail transport rules do not forward email to external domains',
  titleHe: 'ודא שכללי העברת דואר לא מפנים דואר לדומיינים חיצוניים',
  descriptionHe: 'כללי העברה (Transport Rules) שמפנים דואר אוטומטית לדומיינים חיצוניים עלולים לחשוף מידע רגיש.',
  category: 'Exchange Online',
  domain: 'exchange_online',
  severity: 'high',
  benchmarkRef: 'CIS 3.2.1',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'No transport rules forwarding to external domains',
  validationMethodHe: 'סקירת כל כללי Transport Rules ובדיקת כללים שמפנים דואר לנמענים חיצוניים',
  remediationHe: `1. היכנס ל-Exchange admin center
2. נווט אל Mail flow > Rules
3. סקור כל כלל קיים
4. זהה כללים שמבצעים Forward/Redirect לדומיינים חיצוניים
5. השבת או מחק כללים לא מורשים
6. הגדר מדיניות למניעת הגדרת כללי העברה על ידי משתמשים`,
  whyItMattersHe: 'העברה אוטומטית של דואר לדומיינים חיצוניים היא טכניקה נפוצה של תוקפים לאחר פריצה לחשבון, המאפשרת להם לקבל עותק של כל הדואר.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/admin/exchange/transportRules',
  requiredPermissions: ['Exchange.ManageAsApp'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-3.3.1',
  title: 'Ensure DKIM is enabled for all Exchange Online domains',
  titleHe: 'ודא ש-DKIM מופעל לכל הדומיינים ב-Exchange Online',
  descriptionHe: 'DKIM (DomainKeys Identified Mail) מאמת שהודעות דואר נשלחו מהדומיין המוצהר ולא זויפו.',
  category: 'Exchange Online',
  domain: 'exchange_online',
  severity: 'medium',
  benchmarkRef: 'CIS 3.3.1',
  benchmarkVersion: 'CIS Microsoft 365 v3.1.0',
  framework: 'cis_m365',
  expectedState: 'DKIM enabled and configured for all domains',
  validationMethodHe: 'בדיקת הגדרות DKIM עבור כל דומיין מוגדר ב-Exchange Online',
  remediationHe: `1. היכנס ל-Microsoft 365 Defender portal
2. נווט אל Email & collaboration > Policies > DKIM
3. לכל דומיין, ודא ש-DKIM מופעל
4. הוסף את רשומות CNAME הנדרשות ב-DNS
5. המתן להפצת DNS ואפשר את DKIM`,
  whyItMattersHe: 'DKIM מגן מפני זיוף דואר (Email Spoofing) ומשפר את מהימנות הדואר הנשלח מהארגון.',
  manualVerificationNoteHe: null,
  graphApiEndpoint: '/admin/exchange/dkimSigningConfig',
  requiredPermissions: ['Exchange.ManageAsApp'],
  isAutomated: true,
});