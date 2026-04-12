import { registerCheck } from '../checkRegistry';

// CIS Microsoft 365 Foundations Benchmark v6.0.1 - Section 5: Microsoft Entra admin center (extended)

// ─── 5.1.2 Users ───

registerCheck({
  id: 'CIS-5.1.2.1',
  title: "Ensure 'Per-user MFA' is disabled",
  titleHe: "ודא ש-MFA פר-משתמש מושבת",
  descriptionHe: "MFA פר-משתמש (legacy) מנוהל בנפרד מ-Conditional Access ועלול לגרום לכפילות ולפגמי תצורה. יש להשתמש אך ורק ב-MFA דרך Conditional Access.",
  category: 'Entra ID / Users', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.2.1', framework: 'cis_m365',
  expectedState: 'All users have per-user MFA state = Disabled (enforced via Conditional Access instead)',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Users → All users → Multi-Factor Authentication (legacy link) → בחר את כל המשתמשים → Disable → אשר. ודא שיש Conditional Access policy שמאכף MFA לפני כן.',
  whyItMattersHe: 'ניהול MFA ב-2 מקומות גורם לבלבול וטעויות תצורה. MFA פר-משתמש לא תומך ב-Conditional Access ולכן פחות גמיש ואינו עומד ב-best practices.',
  graphApiEndpoint: '/reports/authenticationMethods/userRegistrationDetails',
  requiredPermissions: ['Reports.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.1.2.2',
  title: 'Ensure third party integrated applications are not allowed',
  titleHe: 'ודא שאפליקציות צד שלישי משולבות אינן מורשות',
  descriptionHe: 'כאשר משתמשים רשאים לתת הרשאות לאפליקציות צד שלישי, הם עלולים לתת גישה לנתוני הארגון ללא פיקוח. יש להגביל הרשאות אלה למנהלים בלבד.',
  category: 'Entra ID / Users', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.2.2', framework: 'cis_m365',
  expectedState: 'Users are not allowed to consent to third party apps; admin consent required',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Applications → Enterprise applications → Consent and permissions → User consent settings → "User consent for applications": בחר "Do not allow user consent" → Save.',
  whyItMattersHe: 'אפליקציה זדונית יכולה לבקש הרשאות קריאה לדואר, לאנשי קשר ולקבצים. אם משתמש נותן הסכמה, התוקף מקבל גישה לנתוני הארגון ללא פריצה לחשבון.',
  graphApiEndpoint: '/policies/authorizationPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.1.2.3',
  title: "Ensure 'Restrict non-admin users from creating tenants' is set to 'Yes'",
  titleHe: "ודא שמשתמשים שאינם מנהלים לא יכולים ליצור tenants חדשים",
  descriptionHe: "משתמשים רגילים יכולים ליצור Entra ID tenants חדשים כברירת מחדל. tenant לא מנוהל עלול לשמש לזליגת נתונים ולפעילות לא מבוקרת.",
  category: 'Entra ID / Users', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.2.3', framework: 'cis_m365',
  expectedState: 'allowedToCreateTenants = false for non-admins',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Users → User settings → "Restrict non-admin users from creating tenants": שנה ל-Yes → Save.',
  whyItMattersHe: "משתמש שיוצר tenant חיצוני יכול להעביר אליו נתונים ארגוניים. tenant לא מנוהל לא כפוף למדיניות האבטחה של הארגון.",
  graphApiEndpoint: '/policies/authorizationPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.1.2.4',
  title: 'Ensure access to the Entra admin center is restricted',
  titleHe: 'ודא שגישה ל-Entra admin center מוגבלת למנהלים',
  descriptionHe: 'גישה לפורטל Entra צריכה להיות מוגבלת למשתמשים בעלי תפקידי מנהל. משתמשים רגילים לא אמורים לגלוש בפורטל הניהול.',
  category: 'Entra ID / Users', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.2.4', framework: 'cis_m365',
  expectedState: 'Restrict access to Entra admin center to admins only = Yes',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Users → User settings → "Restrict access to Microsoft Entra admin center": שנה ל-Yes → Save.',
  whyItMattersHe: 'גישת משתמשים רגילים לפורטל הניהול חושפת מידע על תצורת הארגון שיכול לסייע לתוקף בתכנון מתקפה.',
  graphApiEndpoint: '/policies/authorizationPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: false,
});

registerCheck({
  id: 'CIS-5.1.2.5',
  title: 'Ensure the option to remain signed in is hidden',
  titleHe: 'ודא שאפשרות "להישאר מחובר" מוסתרת',
  descriptionHe: 'כאשר המשתמש רואה את כפתור "Stay signed in", הוא עלול לבחור בו במחשב ציבורי — מה שמשאיר session פעיל לאחר סיום הפגישה.',
  category: 'Entra ID / Users', domain: 'entra_id', severity: 'low',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.2.5', framework: 'cis_m365',
  expectedState: 'Show option to remain signed in = No (hidden from users)',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Company branding → ערוך Branding ברירת מחדל → Sign-in page → "Show option to remain signed in": כבה → Save.',
  whyItMattersHe: 'session שנשאר פתוח במחשב ציבורי מאפשר לכל מי שישב לאחר מכן לגשת לחשבון ללא אימות.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: false,
});

registerCheck({
  id: 'CIS-5.1.2.6',
  title: "Ensure 'LinkedIn account connections' is disabled",
  titleHe: "ודא שחיבור חשבונות LinkedIn מושבת",
  descriptionHe: "חיבור LinkedIn ל-Microsoft 365 מאפשר שיתוף נתוני פרופיל בין שני השירותים. זהו סיכון פרטיות ועלול לחשוף מידע ארגוני.",
  category: 'Entra ID / Users', domain: 'entra_id', severity: 'low',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.2.6', framework: 'cis_m365',
  expectedState: 'LinkedIn account connections = No (disabled)',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Users → User settings → "LinkedIn account connections": שנה ל-No → Save.',
  whyItMattersHe: 'שיתוף נתונים בין Microsoft ו-LinkedIn עלול לחשוף ארגומנטים כמו כותרת תפקיד, שם מעסיק ורשת קשרים — מידע שמסייע למתקפות social engineering.',
  graphApiEndpoint: '/policies/authorizationPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: false,
});

// ─── 5.1.3 Groups ───

registerCheck({
  id: 'CIS-5.1.3.1',
  title: 'Ensure a dynamic group for guest users is created',
  titleHe: 'ודא שנוצרת קבוצה דינמית עבור משתמשי אורח',
  descriptionHe: 'קבוצה דינמית שמכילה אוטומטית את כל ה-Guest users מאפשרת לתחזק מדיניות גישה ומחזור חיים (lifecycle) ייעודית לאורחים בצורה עקבית.',
  category: 'Entra ID / Groups', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.3.1', framework: 'cis_m365',
  expectedState: 'Dynamic group exists with rule: (user.userType -eq "Guest")',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Groups → New group → Group type: Security → Membership type: Dynamic user → Dynamic user members → הוסף rule: Property: userType, Operator: Equals, Value: Guest → Save.',
  whyItMattersHe: 'ללא קבוצה ייעודית לאורחים קשה לאכוף עליהם מדיניות גישה, Conditional Access ייחודי, וביצוע access reviews תקופתיים.',
  graphApiEndpoint: '/groups?$filter=groupTypes/any(c:c+eq+\'DynamicMembership\')',
  requiredPermissions: ['Group.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.1.3.2',
  title: 'Ensure users cannot create security groups',
  titleHe: 'ודא שמשתמשים רגילים לא יכולים ליצור קבוצות אבטחה',
  descriptionHe: 'כאשר משתמשים יכולים ליצור Security Groups, הם עלולים להקצות הרשאות לחברים לא מורשים ולעקוף בקרות גישה ארגוניות.',
  category: 'Entra ID / Groups', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.3.2', framework: 'cis_m365',
  expectedState: 'Users can create security groups = No',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Groups → General settings → "Users can create security groups in Azure portals, API or PowerShell": שנה ל-No → Save.',
  whyItMattersHe: 'קבוצת אבטחה שנוצרה על ידי משתמש רגיל יכולה לקבל הרשאות גישה למשאבים. ניהול מרוכז של קבוצות מבטיח שרק מנהלים מקצים הרשאות.',
  graphApiEndpoint: '/policies/authorizationPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

// ─── 5.1.4 Devices ───

registerCheck({
  id: 'CIS-5.1.4.1',
  title: 'Ensure the ability to join devices to Entra is restricted',
  titleHe: 'ודא שצירוף מכשירים ל-Entra מוגבל',
  descriptionHe: 'יש להגביל את היכולת לצרף מכשירים ל-Entra ID למנהלים או לקבוצה מוגדרת בלבד, ולא לכלל המשתמשים.',
  category: 'Entra ID / Devices', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.4.1', framework: 'cis_m365',
  expectedState: 'Users may join devices to Entra = Selected (specific group) or None',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Devices → Device settings → "Users may join devices to Microsoft Entra": שנה מ-All ל-Selected → בחר קבוצת IT/Helpdesk → Save.',
  whyItMattersHe: 'כל משתמש שיכול לצרף מכשירים ל-Entra יכול לרשום מכשיר אישי לא מנוהל ולגשת ממנו למשאבים ארגוניים.',
  graphApiEndpoint: '/policies/deviceRegistrationPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.1.4.2',
  title: 'Ensure the maximum number of devices per user is limited',
  titleHe: 'ודא שמספר המכשירים המרבי למשתמש מוגבל',
  descriptionHe: 'הגבלת מספר המכשירים שמשתמש יכול לרשום מונעת רישום מסיבי של מכשירים לא מורשים.',
  category: 'Entra ID / Devices', domain: 'entra_id', severity: 'low',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.4.2', framework: 'cis_m365',
  expectedState: 'Maximum number of devices per user ≤ 5 (not Unlimited)',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Devices → Device settings → "Maximum number of devices per user": שנה מ-Unlimited לערך מוגדר (מומלץ 5) → Save.',
  whyItMattersHe: 'ללא מגבלה, משתמש יכול לרשום עשרות מכשירים — כולל VMs וסביבות וירטואליות שמשמשות לעקיפת בקרות.',
  graphApiEndpoint: '/policies/deviceRegistrationPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.1.4.3',
  title: 'Ensure the GA role is not added as a local administrator during Entra join',
  titleHe: 'ודא שתפקיד GA לא מתווסף כמנהל מקומי בעת צירוף ל-Entra',
  descriptionHe: 'כברירת מחדל, המנהל הגלובלי שמצרף מכשיר ל-Entra מתווסף כ-Local Administrator. יש לכבות זאת.',
  category: 'Entra ID / Devices', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.4.3', framework: 'cis_m365',
  expectedState: 'Global administrator role not automatically added as local admin on joined devices',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Devices → Device settings → "Additional local administrators on all Microsoft Entra joined devices": ודא ש-Global Administrator אינו ברשימה. השתמש ב-Cloud Device Administrator עם הרשאות מוגבלות יותר.',
  whyItMattersHe: 'אם Global Administrator הוא מנהל מקומי על כל מכשיר מצורף, פגיעה במכשיר אחד יכולה לחשוף את כל הרשת.',
  graphApiEndpoint: '/policies/deviceRegistrationPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.1.4.4',
  title: 'Ensure local administrator assignment is limited during Entra join',
  titleHe: 'ודא שהקצאת מנהל מקומי מוגבלת בעת צירוף ל-Entra',
  descriptionHe: 'יש להגביל אילו משתמשים מקבלים הרשאות מנהל מקומי אוטומטית בעת Entra join — ולהשאיר זאת לתהליך מנוהל בלבד.',
  category: 'Entra ID / Devices', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.4.4', framework: 'cis_m365',
  expectedState: 'Registering user is not automatically made local administrator',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Devices → Device settings → "Registering user is an administrator on this device": כבה → Save. נהל מנהלים מקומיים דרך Intune → Endpoint security → Account protection.',
  whyItMattersHe: 'משתמש רגיל עם הרשאות Local Admin יכול להתקין תוכנות, לשנות הגדרות אבטחה ולעקוף GPO — וזאת ללא שום פיקוח.',
  graphApiEndpoint: '/policies/deviceRegistrationPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.1.4.5',
  title: 'Ensure Local Administrator Password Solution (LAPS) is enabled',
  titleHe: 'ודא ש-LAPS (ניהול סיסמת מנהל מקומי) מופעל',
  descriptionHe: 'LAPS מנהל סיסמאות ייחודיות לכל מכשיר עבור חשבון המנהל המקומי, ומחליפן אוטומטית. זה מונע התפשטות רוחבית עם סיסמה משותפת.',
  category: 'Entra ID / Devices', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.4.5', framework: 'cis_m365',
  expectedState: 'Microsoft Entra LAPS enabled; devices report LAPS-managed passwords',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Devices → Device settings → "Enable Microsoft Entra Local Administrator Password Solution (LAPS)": הפעל → Save. לאחר מכן: Intune → Endpoint security → Account protection → צור LAPS policy לכל פלטפורמה.',
  whyItMattersHe: 'סיסמת מנהל מקומי זהה בכל המכשירים היא וקטור מרכזי בהתפשטות רוחבית (lateral movement). LAPS מבטל זאת.',
  graphApiEndpoint: '/policies/deviceRegistrationPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.1.4.6',
  title: 'Ensure users are restricted from recovering BitLocker keys',
  titleHe: 'ודא שמשתמשים מוגבלים משחזור מפתחות BitLocker',
  descriptionHe: 'מפתחות BitLocker המאוחסנים ב-Entra לא צריכים להיות נגישים למשתמשים רגילים — אלא אם כן יש צורך עסקי מפורש.',
  category: 'Entra ID / Devices', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.4.6', framework: 'cis_m365',
  expectedState: 'Users restricted from viewing their own BitLocker recovery keys',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Devices → Device settings → "Users can view their BitLocker keys": שנה ל-No → Save.',
  whyItMattersHe: 'משתמש שיכול לשחזר את מפתח BitLocker של המכשיר שלו יכול לגשת לדיסק גם ללא אימות — למשל לאחר גניבת המכשיר.',
  graphApiEndpoint: '/policies/deviceRegistrationPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

// ─── 5.1.5 Applications ───

registerCheck({
  id: 'CIS-5.1.5.1',
  title: 'Ensure user consent to apps accessing company data on their behalf is not allowed',
  titleHe: 'ודא שמשתמשים לא יכולים לתת הסכמה לאפליקציות לגשת לנתונים ארגוניים',
  descriptionHe: 'יש לחסום הסכמת משתמש (user consent) לאפליקציות צד שלישי שמבקשות גישה לנתוני הארגון. כל הסכמה תדרוש אישור מנהל.',
  category: 'Entra ID / Applications', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.5.1', framework: 'cis_m365',
  expectedState: 'User consent for applications = Do not allow user consent',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Applications → Enterprise applications → Consent and permissions → User consent settings → "User consent for applications": בחר "Do not allow user consent" → Save.',
  whyItMattersHe: 'OAuth consent phishing הוא סוג מתקפה שבה אפליקציה זדונית משכנעת משתמש לאשר גישה לדואר ולקבצים. חסימת user consent מבטלת וקטור זה.',
  graphApiEndpoint: '/policies/authorizationPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.1.5.2',
  title: 'Ensure the admin consent workflow is enabled',
  titleHe: 'ודא שתהליך הסכמת מנהל (admin consent workflow) מופעל',
  descriptionHe: 'כאשר user consent חסום, משתמשים צריכים דרך לבקש אישור מנהל. Admin consent workflow מספק תהליך מסודר לבקשה ואישור.',
  category: 'Entra ID / Applications', domain: 'entra_id', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.5.2', framework: 'cis_m365',
  expectedState: 'Admin consent workflow enabled = Yes; reviewers configured',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → Applications → Enterprise applications → Consent and permissions → Admin consent settings → "Users can request admin consent to apps they are unable to consent to": הפעל → הוסף reviewers (מנהלי IT) → Set email notifications → Save.',
  whyItMattersHe: 'ללא workflow מסודר, משתמשים עלולים לעקוף את החסימה על ידי פנייה ישירה למנהל שלהם — מה שמוביל לאישורים ללא בחינה מקצועית.',
  graphApiEndpoint: '/policies/adminConsentRequestPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

// ─── 5.1.6 External Identities ───

registerCheck({
  id: 'CIS-5.1.6.1',
  title: 'Ensure that collaboration invitations are sent to allowed domains only',
  titleHe: 'ודא שהזמנות שיתוף פעולה נשלחות לדומיינים מאושרים בלבד',
  descriptionHe: 'יש להגביל הזמנות לאורחים חיצוניים לדומיינים ספציפיים ומאושרים, ולחסום הזמנות לדומיינים שאינם ברשימה.',
  category: 'Entra ID / External Identities', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.6.1', framework: 'cis_m365',
  expectedState: 'Guest invitations restricted to allowed domains (allowlist configured)',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → External Identities → External collaboration settings → "Collaboration restrictions": בחר "Allow invitations only to the specified domains" → הוסף את הדומיינים המאושרים → Save.',
  whyItMattersHe: 'ללא הגבלת דומיינים, עובד יכול להזמין כל אדם מחוץ לארגון — כולל חשבונות אישיים ב-Gmail ו-Hotmail — לגשת למשאבים ארגוניים.',
  graphApiEndpoint: '/policies/authorizationPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.1.6.2',
  title: 'Ensure that guest user access is restricted',
  titleHe: 'ודא שגישת משתמשי אורח מוגבלת',
  descriptionHe: 'יש להגביל את רמת הגישה של אורחים כך שלא יוכלו למנות משתמשים, קבוצות ומשאבים ארגוניים.',
  category: 'Entra ID / External Identities', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.6.2', framework: 'cis_m365',
  expectedState: 'Guest access level = Most restrictive (guest user access is limited to properties of their own directory objects)',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → External Identities → External collaboration settings → "Guest user access": בחר "Guest user access is restricted to properties and memberships of their own directory objects" → Save.',
  whyItMattersHe: 'אורח עם גישה רחבה יכול למנות את כל משתמשי הארגון, הקבוצות והאפליקציות — מידע שמסייע מאוד לתכנון מתקפה פנימית.',
  graphApiEndpoint: '/policies/authorizationPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-5.1.6.3',
  title: 'Ensure guest user invitations are limited to the Guest Inviter role',
  titleHe: 'ודא שהזמנת אורחים מוגבלת לתפקיד Guest Inviter בלבד',
  descriptionHe: 'רק משתמשים בעלי תפקיד Guest Inviter (או מנהלים) צריכים להיות מורשים להזמין אורחים חיצוניים לארגון.',
  category: 'Entra ID / External Identities', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.6.3', framework: 'cis_m365',
  expectedState: 'Guest invite settings = Only users assigned to specific admin roles can invite guest users',
  remediationHe: 'Entra admin center (entra.microsoft.com) → Identity → External Identities → External collaboration settings → "Guest invite settings": בחר "Only users assigned to specific admin roles can invite guest users" → Save.',
  whyItMattersHe: 'אם כל עובד יכול להזמין אורחים, הארגון מאבד שליטה על מי מחזיק בגישה. הגבלה לתפקיד ייעודי מבטיחה תהליך מבוקר ואחראי.',
  graphApiEndpoint: '/policies/authorizationPolicy',
  requiredPermissions: ['Policy.Read.All'],
  isAutomated: true,
});

// ─── 5.1.8 Hybrid Management ───

registerCheck({
  id: 'CIS-5.1.8.1',
  title: 'Ensure that password hash sync is enabled for hybrid deployments',
  titleHe: 'ודא ש-Password Hash Sync מופעל בסביבות היברידיות',
  descriptionHe: 'ב-Hybrid deployments (AD + Entra), Password Hash Sync (PHS) מאפשר אימות ישיר מול Entra גם אם ה-ADFS/PTA לא זמין, ותומך ב-Identity Protection.',
  category: 'Entra ID / Hybrid', domain: 'entra_id', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 5.1.8.1', framework: 'cis_m365',
  expectedState: 'Password Hash Synchronization enabled in Entra Connect',
  remediationHe: 'בשרת ה-Entra Connect: פתח "Microsoft Entra Connect" → Optional features → סמן "Password hash synchronization" → Next → Configure. ב-Entra admin center: Identity → Hybrid management → Microsoft Entra Connect → ודא שה-PHS מופעל.',
  whyItMattersHe: 'PHS מאפשר ל-Microsoft Entra Identity Protection לזהות סיסמאות שדלפו. ללא PHS, גם אם סיסמה הופיעה ב-dark web, Entra לא יוכל לזהות זאת.',
  graphApiEndpoint: '/organization',
  requiredPermissions: ['Organization.Read.All'],
  isAutomated: false,
});