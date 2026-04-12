import { registerCheck } from '../checkRegistry';

// CIS Microsoft 365 Foundations Benchmark v6.0.1 - Section 5.2: ID Protection

// ─── 5.2.2 Risk-based Conditional Access ───

registerCheck({
  id: 'CIS-5.2.2.1',
  title: 'Ensure MFA is enabled for all users in administrative roles',
  titleHe: 'ודא ש-MFA מופעל לכל המשתמשים בתפקידי מנהל',
  descriptionHe: 'Conditional Access policy חייב לחייב MFA לכל חשבון בעל תפקיד מנהל (Global Admin, Security Admin, Exchange Admin וכד\'). זהו בקרת אבטחה קריטית.',
  category: 'ID Protection / Conditional Access', domain: 'conditional_access', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.2.1', framework: 'cis_m365',
  expectedState: 'Conditional Access policy enforces MFA for all directory roles',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Protection → Conditional Access → New policy → Users: כלול "Directory roles" → בחר את כל תפקידי המנהל → Grant: "Require multifactor authentication" → Enable policy → Save.',
  whyItMattersHe: 'חשבונות מנהל הם המטרה העיקרית של תוקפים. MFA על חשבון מנהל מונע השתלטות גם אם הסיסמה נפרצה.',
  graphApiEndpoint: '/identity/conditionalAccess/policies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.2.2.2',
  title: 'Ensure MFA is enabled for all users',
  titleHe: 'ודא ש-MFA מופעל לכל המשתמשים',
  descriptionHe: 'Conditional Access policy חייב לחייב MFA לכל המשתמשים — לא רק למנהלים. כל חשבון ארגוני הוא וקטור תקיפה פוטנציאלי.',
  category: 'ID Protection / Conditional Access', domain: 'conditional_access', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.2.2', framework: 'cis_m365',
  expectedState: 'Conditional Access policy enforces MFA for All users (with appropriate exclusions)',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Protection → Conditional Access → New policy → Users: "All users" (הוצא חשבון Break Glass) → Cloud apps: All cloud apps → Grant: "Require multifactor authentication" → Enable policy → Save.',
  whyItMattersHe: 'מתקפות credential stuffing וphishing מכוונות לכל סוגי המשתמשים. MFA עוצר ~99% ממתקפות חשבון אוטומטיות.',
  graphApiEndpoint: '/identity/conditionalAccess/policies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.2.2.3',
  title: 'Enable Conditional Access policies to block legacy authentication',
  titleHe: 'הפעל Conditional Access לחסימת אימות מדור קודם',
  descriptionHe: 'פרוטוקולי Legacy Authentication (SMTP, IMAP, POP3, Basic Auth) לא תומכים ב-MFA. יש לחסום אותם דרך Conditional Access.',
  category: 'ID Protection / Conditional Access', domain: 'conditional_access', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.2.3', framework: 'cis_m365',
  expectedState: 'Conditional Access policy blocks all legacy authentication clients',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Protection → Conditional Access → New policy → Users: All users → Cloud apps: All cloud apps → Conditions → Client apps: סמן "Exchange ActiveSync clients" ו-"Other clients" → Grant: Block access → Enable → Save.',
  whyItMattersHe: 'Legacy Auth עוקפת MFA לחלוטין. תוקפים משתמשים בפרוטוקולים אלה לגשת לדואר עם סיסמה בלבד.',
  graphApiEndpoint: '/identity/conditionalAccess/policies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.2.2.4',
  title: 'Ensure Sign-in frequency is enabled and browser sessions are not persistent for Administrative users',
  titleHe: 'ודא שתדירות כניסה מחדש מופעלת ו-session דפדפן אינו קבוע עבור מנהלים',
  descriptionHe: 'מנהלים צריכים להיות מאולצים לאמת מחדש תדיר, ו-browser session שלהם לא צריך להישמר בין sessions.',
  category: 'ID Protection / Conditional Access', domain: 'conditional_access', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.2.4', framework: 'cis_m365',
  expectedState: 'CA policy for admins: Sign-in frequency ≤ 4 hours; Persistent browser session = Never persistent',
  remediationHe: 'Entra admin center → Conditional Access → New policy → Users: Directory roles (כל תפקידי מנהל) → Session: "Sign-in frequency": 4 שעות + "Persistent browser session": Never persistent → Enable → Save.',
  whyItMattersHe: 'Token גנוב של מנהל תקף לשעות ארוכות. הגבלת session מצמצמת את חלון הזמן שתוקף יכול לנצל token גנוב.',
  graphApiEndpoint: '/identity/conditionalAccess/policies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.2.2.5',
  title: "Ensure 'Phishing-resistant MFA strength' is required for Administrators",
  titleHe: 'ודא שנדרשת חוזקת MFA עמידה בפני phishing עבור מנהלים',
  descriptionHe: 'מנהלים חייבים להשתמש ב-MFA עמיד בפני phishing: FIDO2 Security Keys, Windows Hello for Business, או Certificate-based Auth — לא SMS/OTP.',
  category: 'ID Protection / Conditional Access', domain: 'conditional_access', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.2.5', framework: 'cis_m365',
  expectedState: 'CA policy for admins requires authentication strength = Phishing-resistant MFA',
  remediationHe: 'Entra admin center → Conditional Access → New policy → Users: Directory roles (מנהלים) → Grant: "Require authentication strength" → בחר "Phishing-resistant MFA" → Enable → Save.',
  whyItMattersHe: 'SMS ו-TOTP חשופים ל-MFA fatigue attacks ו-real-time phishing proxies. FIDO2/WHfB עמידים בפני התקפות אלה מבנית.',
  graphApiEndpoint: '/identity/conditionalAccess/policies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.2.2.6',
  title: 'Enable Identity Protection user risk policies',
  titleHe: 'הפעל מדיניות סיכון משתמש ב-Identity Protection',
  descriptionHe: 'Entra Identity Protection מזהה משתמשים בסיכון (leaked credentials, unusual behavior). יש להפעיל policy שמאלץ password change כאשר סיכון גבוה.',
  category: 'ID Protection / Risk Policies', domain: 'conditional_access', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.2.6', framework: 'cis_m365',
  expectedState: 'User risk policy: High risk → Require password change; Medium → MFA',
  remediationHe: 'Entra admin center → Protection → Conditional Access → New policy → Users: All users → Conditions → User risk: High → Grant: "Require password change" → Enable. צור policy נפרדת ל-Medium: Require MFA.',
  whyItMattersHe: 'סיסמה שנחשפה ב-dark web מסומנת כ-High risk. ללא policy, החשבון נשאר פתוח לתוקף שמחזיק בסיסמה.',
  graphApiEndpoint: '/identity/conditionalAccess/policies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.2.2.7',
  title: 'Enable Identity Protection sign-in risk policies',
  titleHe: 'הפעל מדיניות סיכון כניסה ב-Identity Protection',
  descriptionHe: 'כניסות מסיכון גבוה (anonymous IP, impossible travel) חייבות לדרוש MFA או להיחסם. Identity Protection מזהה אלה בזמן אמת.',
  category: 'ID Protection / Risk Policies', domain: 'conditional_access', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.2.7', framework: 'cis_m365',
  expectedState: 'Sign-in risk policy: High → Block; Medium → Require MFA',
  remediationHe: 'Entra admin center → Protection → Conditional Access → New policy → Users: All users → Conditions → Sign-in risk: High → Grant: Block access. policy נפרדת: Sign-in risk Medium → Require MFA → Enable.',
  whyItMattersHe: 'כניסה מכתובת Tor או מ-2 מדינות תוך דקות היא סימן ברור לפריצה. חסימה אוטומטית מונעת נזק לפני שמנהל מגיב.',
  graphApiEndpoint: '/identity/conditionalAccess/policies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.2.2.8',
  title: "Ensure 'sign-in risk' is blocked for medium and high risk",
  titleHe: 'ודא שכניסות עם סיכון בינוני וגבוה נחסמות',
  descriptionHe: 'כניסות עם ציון סיכון בינוני (Medium) וגבוה (High) מ-Identity Protection צריכות להיחסם לחלוטין או לדרוש MFA חזק.',
  category: 'ID Protection / Risk Policies', domain: 'conditional_access', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.2.8', framework: 'cis_m365',
  expectedState: 'Sign-in risk Medium and High both result in block or strong MFA requirement',
  remediationHe: 'ודא שה-Conditional Access policies מ-5.2.2.7 מכסות גם Medium ו-High. Medium: Require MFA. High: Block access. בדוק ב-Sign-in logs שכניסות מסוכנות נחסמות בפועל.',
  whyItMattersHe: 'כניסות בסיכון בינוני שאינן נחסמות מאפשרות לתוקף לגשת אם הצליח לעבור SMS MFA רגיל.',
  graphApiEndpoint: '/identity/conditionalAccess/policies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.2.2.9',
  title: 'Ensure a managed device is required for authentication',
  titleHe: 'ודא שנדרש מכשיר מנוהל לאימות',
  descriptionHe: 'Conditional Access יכול לחייב שהמכשיר המתחבר יהיה Entra Joined, Hybrid Joined, או Intune Compliant — ולמנוע גישה מ-BYOD לא מנוהל.',
  category: 'ID Protection / Conditional Access', domain: 'conditional_access', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.2.9', framework: 'cis_m365',
  expectedState: 'CA policy requires compliant or hybrid-joined device for access to sensitive apps',
  remediationHe: 'Entra admin center → Conditional Access → New policy → Cloud apps: בחר אפליקציות רגישות (Exchange, SharePoint) → Grant: "Require device to be marked as compliant" OR "Require hybrid Azure AD joined device" → Enable.',
  whyItMattersHe: 'מכשיר לא מנוהל חסר הגנות: אין AV מנוהל, אין disk encryption מאומת, אין Remote Wipe. גישה ממנו לנתונים ארגוניים מסוכנת.',
  graphApiEndpoint: '/identity/conditionalAccess/policies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.2.2.10',
  title: 'Ensure a managed device is required to register security information',
  titleHe: 'ודא שנדרש מכשיר מנוהל לרישום מידע אבטחה',
  descriptionHe: 'רישום שיטות MFA חדשות (כגון מפתח FIDO2 או אפליקציית Authenticator) צריך להתבצע אך ורק ממכשיר מנוהל כדי למנוע רישום זדוני.',
  category: 'ID Protection / Conditional Access', domain: 'conditional_access', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.2.10', framework: 'cis_m365',
  expectedState: 'CA policy: Security info registration requires compliant device or named location',
  remediationHe: 'Entra admin center → Conditional Access → New policy → Users: All users → Cloud apps: "Microsoft Azure Management" / User Actions: "Register security information" → Grant: "Require device to be marked as compliant" → Enable.',
  whyItMattersHe: 'תוקף שגנב סיסמה יכול לרשום את הטלפון שלו כשיטת MFA — ולאחר מכן לעקוף MFA לחלוטין. דרישת מכשיר מנוהל מונעת זאת.',
  graphApiEndpoint: '/identity/conditionalAccess/policies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.2.2.11',
  title: "Ensure sign-in frequency for Intune Enrollment is set to 'Every time'",
  titleHe: "ודא שתדירות כניסה לרישום Intune מוגדרת ל-'בכל פעם'",
  descriptionHe: 'בעת רישום מכשיר ב-Intune, על המשתמש לאמת בכל פעם מחדש — ללא תלות ב-session קיים.',
  category: 'ID Protection / Conditional Access', domain: 'conditional_access', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.2.11', framework: 'cis_m365',
  expectedState: 'CA policy for Intune enrollment: Sign-in frequency = Every time',
  remediationHe: 'Entra admin center → Conditional Access → New policy → Cloud apps: "Microsoft Intune Enrollment" → Session: "Sign-in frequency" → בחר "Every time" → Enable.',
  whyItMattersHe: 'רישום מכשיר זדוני דרך session ישן של משתמש לגיטימי מאפשר לתוקף לנהל מכשיר בשם הארגון.',
  graphApiEndpoint: '/identity/conditionalAccess/policies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.2.2.12',
  title: 'Ensure the device code sign-in flow is blocked',
  titleHe: 'ודא שתהליך כניסה באמצעות קוד מכשיר (device code flow) חסום',
  descriptionHe: 'Device Code Flow מאפשר אימות ממכשיר ללא דפדפן. תוקפים משתמשים בו בהתקפות phishing ל-OAuth token hijacking.',
  category: 'ID Protection / Conditional Access', domain: 'conditional_access', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.2.12', framework: 'cis_m365',
  expectedState: 'Conditional Access policy blocks Device Code authentication flow',
  remediationHe: 'Entra admin center → Conditional Access → New policy → Users: All users → Cloud apps: All → Conditions → Authentication flows: "Device code flow" → Grant: Block → Enable.',
  whyItMattersHe: 'Device code phishing: התוקף שולח קישור שמבקש מהמשתמש להזין קוד — ובתגובה, התוקף מקבל access token מלא ללא MFA.',
  graphApiEndpoint: '/identity/conditionalAccess/policies',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

// ─── 5.2.3 Authentication Methods ───

registerCheck({
  id: 'CIS-5.2.3.1',
  title: 'Ensure Microsoft Authenticator is configured to protect against MFA fatigue',
  titleHe: 'ודא ש-Microsoft Authenticator מוגדר להגנה מפני MFA fatigue',
  descriptionHe: 'MFA Fatigue = תוקף שולח בקשות push רבות עד שהמשתמש מאשר. יש להפעיל Number Matching ו-Additional Context כדי למנוע זאת.',
  category: 'ID Protection / Auth Methods', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.3.1', framework: 'cis_m365',
  expectedState: 'Microsoft Authenticator: Number matching = Enabled; Additional context = Enabled',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Protection → Authentication methods → Microsoft Authenticator → Enable → הגדר: "Require number matching": Enabled → "Show additional context in notifications": Enabled → Save.',
  whyItMattersHe: 'Number Matching מחייב את המשתמש להקיש מספר שמוצג על המסך — תוקף שמשלח push לא יודע את המספר ולא יוכל לאשר.',
  graphApiEndpoint: '/policies/authenticationMethodsPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.2.3.2',
  title: 'Ensure custom banned passwords lists are used',
  titleHe: 'ודא ששימוש ברשימת סיסמאות אסורות מותאמת אישית',
  descriptionHe: 'Microsoft מספקת רשימת סיסמאות אסורות גלובלית, אך ניתן להוסיף מילים ספציפיות לארגון (שם החברה, מוצרים) שתוקפים ינחשו.',
  category: 'ID Protection / Auth Methods', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.3.2', framework: 'cis_m365',
  expectedState: 'Custom banned password list configured with organization-specific terms',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Protection → Authentication methods → Password protection → Custom banned passwords: Enable → הוסף מילים ספציפיות לארגון: שם החברה, מוצרים, עיר, מותגים → Mode: Enforced → Save.',
  whyItMattersHe: 'הסיסמה "Company2024!" עוברת בדרך כלל בדיקות מורכבות אבל צפויה לחלוטין. רשימה מותאמת חוסמת ניחושים ספציפיים לארגון.',
  graphApiEndpoint: '/policies/authenticationMethodsPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.2.3.3',
  title: 'Ensure password protection is enabled for on-premises Active Directory',
  titleHe: 'ודא שהגנת סיסמאות מופעלת ב-Active Directory המקומי',
  descriptionHe: 'Entra Password Protection ל-on-prem AD מאפשר לאכוף את רשימת הסיסמאות האסורות גם על שינויי סיסמה ב-Domain Controllers המקומיים.',
  category: 'ID Protection / Auth Methods', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.3.3', framework: 'cis_m365',
  expectedState: 'Entra Password Protection deployed on-prem; Mode = Enforced',
  remediationHe: 'הורד והתקן את Azure AD Password Protection DC Agent על כל Domain Controllers → הורד Password Protection Proxy על שרתים עם קישוריות ל-Entra → Entra admin center → Protection → Authentication methods → Password protection → On-premises: Mode: Enforced → Save.',
  whyItMattersHe: 'ב-Hybrid environment, משתמשים משנים סיסמאות דרך ה-DC המקומי. ללא הגנה on-prem, ניתן להגדיר סיסמה חלשה שעוקפת את מדיניות Entra.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: false,
});

registerCheck({
  id: 'CIS-5.2.3.4',
  title: "Ensure all member users are 'MFA capable'",
  titleHe: 'ודא שכל משתמשי הארגון מסוגלים לבצע MFA',
  descriptionHe: "כל user חייב לרשום לפחות שיטת MFA אחת. 'MFA Capable' פירושו שיש לו Authenticator app, FIDO2 key, או טלפון רשום.",
  category: 'ID Protection / Auth Methods', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.3.4', framework: 'cis_m365',
  expectedState: '100% of member users are MFA capable (have registered authentication methods)',
  remediationHe: 'Entra admin center → Reports → Authentication methods → User registration details → סנן: "MFA capable = No" → לכל משתמש שאינו מסוגל: שלח הזמנה לרישום דרך "Require re-register MFA" ב-user properties. שקול Conditional Access policy שמאלץ רישום.',
  whyItMattersHe: 'משתמש ללא שיטת MFA רשומה לא יוכל לעמוד בדרישות CA → ייחסם. או גרוע יותר: יגיע לסיטואציה שבה MFA דלוג בפועל.',
  graphApiEndpoint: '/reports/authenticationMethods/userRegistrationDetails',
  requiredPermissions: ['Reports.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.2.3.5',
  title: 'Ensure weak authentication methods are disabled',
  titleHe: 'ודא ששיטות אימות חלשות מושבתות',
  descriptionHe: 'שיטות SMS OTP ו-Voice Call הן חלשות ועלולות להיות מיורטות. יש להשבית אותן ולעבור ל-Microsoft Authenticator, FIDO2 או Certificate.',
  category: 'ID Protection / Auth Methods', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.3.5', framework: 'cis_m365',
  expectedState: 'SMS and Voice call authentication methods disabled in Authentication Methods policy',
  remediationHe: 'Entra admin center → Protection → Authentication methods → Policies → SMS: כבה → Voice call: כבה → ודא שמשתמשים עברו ל-Microsoft Authenticator תחילה → Save.',
  whyItMattersHe: 'SMS SIM swapping ו-SS7 attacks מאפשרים ליירט קודי SMS. Voice phishing (vishing) מרמה משתמשים לאשר MFA בטלפון.',
  graphApiEndpoint: '/policies/authenticationMethodsPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.2.3.6',
  title: 'Ensure system-preferred multifactor authentication is enabled',
  titleHe: 'ודא ש-System-preferred MFA מופעל',
  descriptionHe: "System-preferred MFA מנחה את המשתמש להשתמש בשיטת ה-MFA החזקה ביותר שרשם, במקום לבחור את החלשה ביותר.",
  category: 'ID Protection / Auth Methods', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.3.6', framework: 'cis_m365',
  expectedState: 'System-preferred MFA = Enabled',
  remediationHe: 'Entra admin center → Protection → Authentication methods → Settings → "System-preferred multifactor authentication": Enabled → Save.',
  whyItMattersHe: "ללא System-preferred, משתמש עם Authenticator app ו-SMS יבחר לרוב ב-SMS כי זה יותר נוח. System-preferred מאלץ שימוש ב-Authenticator.",
  graphApiEndpoint: '/policies/authenticationMethodsPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.2.3.7',
  title: 'Ensure the email OTP authentication method is disabled',
  titleHe: 'ודא ששיטת אימות OTP באמצעות דואר אלקטרוני מושבתת',
  descriptionHe: 'Email OTP מאפשר קבלת קוד חד-פעמי לדואר. אם חשבון הדואר עצמו נפרץ, שיטת MFA זו לא מוסיפה שום הגנה.',
  category: 'ID Protection / Auth Methods', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.3.7', framework: 'cis_m365',
  expectedState: 'Email OTP authentication method disabled',
  remediationHe: 'Entra admin center → Protection → Authentication methods → Email OTP → כבה (Disabled) → Save.',
  whyItMattersHe: "אם תוקף השיג גישה לדואר של הקורבן, הוא יוכל לאשר Email OTP ולהשיג גישה לשירותים נוספים — הפוך ל-circular dependency.",
  graphApiEndpoint: '/policies/authenticationMethodsPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

// ─── 5.2.4 Password Reset ───

registerCheck({
  id: 'CIS-5.2.4.1',
  title: "Ensure 'Self service password reset enabled' is set to 'All'",
  titleHe: "ודא שאיפוס סיסמה עצמי (SSPR) מופעל לכל המשתמשים",
  descriptionHe: "SSPR מאפשר למשתמשים לאפס סיסמה ללא מעורבות Helpdesk — אך חייב להיות מוגדר עם אמצעי אימות חזקים.",
  category: 'ID Protection / Password Reset', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.2.4.1', framework: 'cis_m365',
  expectedState: 'SSPR enabled = All users; Number of methods required = 2',
  remediationHe: 'Entra admin center → Protection → Password reset → Properties → "Self service password reset enabled": All → Methods: מינימום 2 שיטות (Authenticator app + Mobile phone) → הפעל account lockout lockout → Save.',
  whyItMattersHe: 'SSPR מפחית עומס על Helpdesk ומאפשר תגובה מהירה לנעילות חשבון. ללא SSPR, עובדים שוכחי סיסמה פורצים לאבטחה ע"י דרכים לא רשמיות.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: false,
});