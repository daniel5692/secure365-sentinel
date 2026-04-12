import { registerCheck } from '../checkRegistry';

// CIS Microsoft 365 Foundations Benchmark v6.0.1 - Section 9: Microsoft Fabric

registerCheck({
  id: 'CIS-9.1.1',
  title: 'Ensure guest user access is restricted',
  titleHe: 'ודא שגישת משתמשי אורח ב-Fabric מוגבלת',
  descriptionHe: 'משתמשי אורח ב-Microsoft Fabric לא צריכים להיות מסוגלים לגשת לנתונים ארגוניים, דוחות ולוחות מחוונים.',
  category: 'Microsoft Fabric / Tenant Settings', domain: 'purview', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 9.1.1', framework: 'cis_m365',
  expectedState: 'Guest user access in Fabric = Disabled or restricted to specific groups',
  remediationHe: 'Microsoft Fabric admin portal (app.fabric.microsoft.com) → Admin portal → Tenant settings → Export and sharing settings → "Guest users can access Microsoft Fabric": כבה או הגבל לקבוצה מאושרת → Apply.',
  whyItMattersHe: 'Fabric מכיל נתונים עסקיים ותובנות BI רגישות. גישת אורחים לא מבוקרת עלולה לחשוף מידע תחרותי.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-9.1.2',
  title: 'Ensure external user invitations are restricted',
  titleHe: 'ודא שהזמנת משתמשים חיצוניים ב-Fabric מוגבלת',
  descriptionHe: 'רק מנהלים ייעודיים צריכים להיות מסוגלים להזמין משתמשים חיצוניים ל-Fabric — לא כל משתמש.',
  category: 'Microsoft Fabric / Tenant Settings', domain: 'purview', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 9.1.2', framework: 'cis_m365',
  expectedState: 'Invite external users to your organization = Disabled or specific security group only',
  remediationHe: 'Fabric admin portal → Tenant settings → Export and sharing settings → "Invite external users to your organization": כבה או הגבל לקבוצת אבטחה ייעודית → Apply.',
  whyItMattersHe: 'הזמנת גורמים חיצוניים ל-Fabric workspace מאפשרת גישה ישירה לנתוני BI — כולל דוחות פיננסיים ומכירות.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-9.1.3',
  title: 'Ensure guest access to content is restricted',
  titleHe: 'ודא שגישת אורחים לתוכן ב-Fabric מוגבלת',
  descriptionHe: 'גם אם אורחים מוזמנים, גישתם לתוכן ספציפי (datasets, reports, dashboards) צריכה להיות מינימלית ומבוקרת.',
  category: 'Microsoft Fabric / Tenant Settings', domain: 'purview', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 9.1.3', framework: 'cis_m365',
  expectedState: 'Allow Azure Active Directory guest users to access Microsoft Fabric = Disabled',
  remediationHe: 'Fabric admin portal → Tenant settings → Export and sharing settings → "Allow Azure Active Directory guest users to access Microsoft Fabric": כבה → Apply.',
  whyItMattersHe: 'גישת אורחים לתוכן Fabric ללא בקרה מאפשרת לגורמים חיצוניים לגלוש ב-datasets ולייצא נתונים.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-9.1.4',
  title: "Ensure 'Publish to web' is restricted",
  titleHe: "ודא ש-'Publish to web' מוגבל",
  descriptionHe: "תכונת 'Publish to web' מאפשרת פרסום דוחות Fabric לאינטרנט הפתוח ללא אימות — כל אחד עם הקישור יכול לצפות.",
  category: 'Microsoft Fabric / Tenant Settings', domain: 'purview', severity: 'critical',
  benchmarkRef: 'CIS M365 v6.0.1 - 9.1.4', framework: 'cis_m365',
  expectedState: "Publish to web = Disabled or restricted to specific security group",
  remediationHe: 'Fabric admin portal → Tenant settings → Export and sharing settings → "Publish to web": כבה לחלוטין, או הגבל ל-"Specific security groups" ודרוש אישור קוד embed → Apply.',
  whyItMattersHe: "דוח שפורסם ב-'Publish to web' נגיש לכל אדם באינטרנט ומאונדקס על ידי מנועי חיפוש — גם אם הוא מכיל נתוני לקוחות.",
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-9.1.5',
  title: "Ensure 'Interact with and share R and Python visuals' is disabled",
  titleHe: "ודא ש-'Interact with and share R and Python visuals' מושבת",
  descriptionHe: "ויזואליזציות R ו-Python ב-Fabric יכולות לכלול קוד שמתבצע בדפדפן הצופה. יש להשבית שיתוף של ויזואליזציות אלה.",
  category: 'Microsoft Fabric / Tenant Settings', domain: 'purview', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 9.1.5', framework: 'cis_m365',
  expectedState: 'Interact with and share R and Python visuals = Disabled',
  remediationHe: 'Fabric admin portal → Tenant settings → R and Python visuals settings → "Interact with and share R and Python visuals": כבה → Apply.',
  whyItMattersHe: 'ויזואליזציות R/Python שמשותפות יכולות לכלול קוד שרץ בהקשר המשתמש ועלולות לשמש להפעלת ביצוע קוד.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-9.1.6',
  title: "Ensure 'Allow users to apply sensitivity labels for content' is enabled",
  titleHe: "ודא שמשתמשים יכולים להחיל תוויות רגישות על תוכן ב-Fabric",
  descriptionHe: "יש לאפשר למשתמשים להחיל Sensitivity Labels של Microsoft Purview על תוכן Fabric (Datasets, Reports) לסיווג ובקרת גישה.",
  category: 'Microsoft Fabric / Tenant Settings', domain: 'purview', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 9.1.6', framework: 'cis_m365',
  expectedState: 'Apply sensitivity labels from Microsoft Purview Information Protection = Enabled',
  remediationHe: 'Fabric admin portal → Tenant settings → Information protection settings → "Apply sensitivity labels from Microsoft Purview Information Protection": הפעל → Apply.',
  whyItMattersHe: 'תוויות רגישות על נתוני Fabric מונעות שיתוף נתונים מסווגים ומחילות מדיניות DLP אוטומטית.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-9.1.7',
  title: 'Ensure shareable links are restricted',
  titleHe: 'ודא שקישורים לשיתוף ב-Fabric מוגבלים',
  descriptionHe: 'קישורים לשיתוף תוכן Fabric צריכים לדרוש אימות — לא להיות "anyone with the link".',
  category: 'Microsoft Fabric / Tenant Settings', domain: 'purview', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 9.1.7', framework: 'cis_m365',
  expectedState: 'Allow shareable links to grant access to everyone in your organization = Disabled',
  remediationHe: 'Fabric admin portal → Tenant settings → Export and sharing settings → "Allow shareable links to grant access to everyone in your organization": כבה → Apply.',
  whyItMattersHe: 'קישור שיתוף פתוח לכלל הארגון מאפשר לכל עובד לגשת לנתונים רגישים — גם ללא הרשאות ספציפיות.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-9.1.8',
  title: 'Ensure enabling of external data sharing is restricted',
  titleHe: 'ודא ששיתוף נתונים חיצוני ב-Fabric מוגבל',
  descriptionHe: 'שיתוף נתונים חיצוני מ-Fabric (External data sharing) מאפשר שיתוף OneLake data items עם ארגונים חיצוניים — יש להגביל.',
  category: 'Microsoft Fabric / Tenant Settings', domain: 'purview', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 9.1.8', framework: 'cis_m365',
  expectedState: 'External data sharing = Disabled or restricted security group',
  remediationHe: 'Fabric admin portal → Tenant settings → Export and sharing settings → "External data sharing": כבה או הגבל לקבוצת אבטחה ייעודית → Apply.',
  whyItMattersHe: 'שיתוף נתוני OneLake חיצונית ישירות עלול להוביל לדליפת datasets שלמים לארגונים אחרים.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-9.1.9',
  title: "Ensure 'Block ResourceKey Authentication' is enabled",
  titleHe: "ודא ש-Block ResourceKey Authentication מופעל",
  descriptionHe: "ResourceKey Authentication מאפשר גישה ל-Fabric APIs ללא אימות משתמש. יש לחסום זאת כדי לאכוף אימות מלא.",
  category: 'Microsoft Fabric / Tenant Settings', domain: 'purview', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 9.1.9', framework: 'cis_m365',
  expectedState: 'Block ResourceKey Authentication = Enabled',
  remediationHe: 'Fabric admin portal → Tenant settings → Developer settings → "Block ResourceKey Authentication": הפעל → Apply.',
  whyItMattersHe: 'ResourceKey מאפשר גישה ל-streaming datasets ו-APIs ללא הזדהות — קוד שמחזיק בו יכול לגשת לנתונים ללא MFA.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-9.1.10',
  title: 'Ensure access to APIs by service principals is restricted',
  titleHe: 'ודא שגישה ל-APIs על ידי service principals מוגבלת',
  descriptionHe: 'Service principals (אפליקציות) שניגשות ל-Fabric Admin APIs צריכות להיות מוגבלות לקבוצת אבטחה ספציפית.',
  category: 'Microsoft Fabric / Tenant Settings', domain: 'purview', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 9.1.10', framework: 'cis_m365',
  expectedState: 'Service principals can use Fabric APIs = Specific security group only',
  remediationHe: 'Fabric admin portal → Tenant settings → Developer settings → "Service principals can use Fabric APIs": הפעל עם "Specific security groups" → הגדר קבוצה מאושרת → Apply.',
  whyItMattersHe: 'Service principal שמקבל גישה רחבה ל-Fabric APIs יכול לייצא datasets, לשנות הרשאות ולגשת לנתונים רגישים.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-9.1.11',
  title: 'Ensure service principals cannot create and use profiles',
  titleHe: 'ודא ש-service principals לא יכולים ליצור ולהשתמש בפרופילים',
  descriptionHe: 'Service principals לא צריכים להיות מסוגלים ליצור Fabric profiles — יכולת זו מיועדת לניהול ידני מאושר בלבד.',
  category: 'Microsoft Fabric / Tenant Settings', domain: 'purview', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 9.1.11', framework: 'cis_m365',
  expectedState: 'Service principals can create and use profiles = Disabled',
  remediationHe: 'Fabric admin portal → Tenant settings → Developer settings → "Service principals can create and use profiles": כבה → Apply.',
  whyItMattersHe: 'פרופילים שנוצרים על ידי service principals יכולים לשמש לסלמה ירידת הרשאות ולגישה לא מורשית לנתונים.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-9.1.12',
  title: 'Ensure service principals ability to create workspaces, connections and deployment pipelines is restricted',
  titleHe: 'ודא שיכולת service principals ליצור workspaces, connections ו-pipelines מוגבלת',
  descriptionHe: 'Service principals לא צריכים להיות מסוגלים ליצור Fabric workspaces, data connections או deployment pipelines ללא אישור.',
  category: 'Microsoft Fabric / Tenant Settings', domain: 'purview', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 9.1.12', framework: 'cis_m365',
  expectedState: 'Service principals restricted from creating workspaces, connections and deployment pipelines',
  remediationHe: 'Fabric admin portal → Tenant settings → Workspace settings → "Service principals can create workspaces": כבה.\nTenant settings → Connection and gateway settings → "Service principals can create and use connections": כבה.\nTenant settings → Deployment pipeline settings → "Service principals can create deployment pipelines": כבה → Apply.',
  whyItMattersHe: 'Service principal פרוץ שיכול ליצור workspaces ו-pipelines עלול לבנות תשתית לגניבת נתונים אוטומטית בתוך ה-tenant.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});