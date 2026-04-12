import { registerCheck } from '../checkRegistry';

// CIS Microsoft 365 Foundations Benchmark v6.0.1 - Section 8: Microsoft Teams Admin Center

// ─── 8.1 Teams ───

registerCheck({
  id: 'CIS-8.1.1',
  title: 'Ensure external file sharing in Teams is enabled for only approved cloud storage services',
  titleHe: 'ודא ששיתוף קבצים חיצוני ב-Teams מוגבל לשירותי ענן מאושרים בלבד',
  descriptionHe: 'Teams מאפשר שיתוף קבצים משירותים חיצוניים כמו Dropbox, Box, Google Drive ו-ShareFile. יש להגביל זאת לשירותים ארגוניים מאושרים בלבד.',
  category: 'Teams / File Sharing', domain: 'teams', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.1.1', framework: 'cis_m365',
  expectedState: 'Only approved cloud storage providers enabled; Dropbox/Box/Google Drive/Egnyte disabled',
  remediationHe: 'Teams admin center (admin.teams.microsoft.com) → Teams apps → Setup policies → כבה שירותי ענן לא מאושרים.\n\nאו: Teams admin center → Teams → Teams settings → Files → כבה: Dropbox, Box, Egnyte, Google Drive → Save.',
  whyItMattersHe: 'שיתוף קבצים ל-Google Drive האישי מ-Teams מאפשר לעובדים להעביר נתונים ארגוניים ישירות לחשבון אישי ללא מעקב.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.1.2',
  title: "Ensure users can't send emails to a channel email address",
  titleHe: 'ודא שמשתמשים לא יכולים לשלוח דואר לכתובת דואר של ערוץ',
  descriptionHe: 'כתובות דואר של ערוצי Teams מאפשרות שליחת הודעות ישירות לערוץ. יש להגביל תכונה זו כדי למנוע spam ו-phishing בערוצים.',
  category: 'Teams / Settings', domain: 'teams', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.1.2', framework: 'cis_m365',
  expectedState: 'Allow users to send emails to a channel email address = Disabled',
  remediationHe: 'Teams admin center → Teams → Teams settings → Email integration → כבה "Allow users to send emails to a channel email address" → Save.',
  whyItMattersHe: 'ערוצי Teams עם כתובת דואר פתוחה יכולים לקבל הודעות spam ו-phishing מכל גורם חיצוני — וחברי הערוץ עלולים לסמוך עליהן.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

// ─── 8.2 Users ───

registerCheck({
  id: 'CIS-8.2.1',
  title: 'Ensure external domains are restricted in the Teams admin center',
  titleHe: 'ודא שדומיינים חיצוניים מוגבלים ב-Teams admin center',
  descriptionHe: 'יש להגביל את הדומיינים החיצוניים שמשתמשי Teams יכולים לתקשר איתם — או לאסור לגמרי, או להרשות רשימה מוגדרת בלבד.',
  category: 'Teams / External Access', domain: 'teams', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.2.1', framework: 'cis_m365',
  expectedState: 'External access: Allow only specific domains (allowlist) or Block all',
  remediationHe: 'Teams admin center → Users → External access → External access settings → שנה מ-"Allow all external domains" ל-"Allow only specific external domains" → הוסף דומיינים מאושרים → Save.',
  whyItMattersHe: 'ללא הגבלת דומיינים, עובדים יכולים לתקשר ישירות עם כל ארגון ב-Teams — כולל מתחרים וגורמים עוינים.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.2.2',
  title: 'Ensure communication with unmanaged Teams users is disabled',
  titleHe: 'ודא שתקשורת עם משתמשי Teams לא מנוהלים מושבתת',
  descriptionHe: 'משתמשי Teams לא מנוהלים (חשבונות Teams אישיים שאינם חלק מארגון) לא צריכים להיות מסוגלים ליצור קשר עם עובדי הארגון.',
  category: 'Teams / External Access', domain: 'teams', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.2.2', framework: 'cis_m365',
  expectedState: 'Allow communication with unmanaged Teams accounts = Off',
  remediationHe: 'Teams admin center → Users → External access → "Allow users in my organization to communicate with Teams users whose accounts are not managed by an organization": כבה → Save.',
  whyItMattersHe: 'משתמש Teams אישי יכול להיות תוקף שמנסה לתקשר עם עובדים ולשלוח קישורים זדוניים — ללא שום בדיקת זהות ארגונית.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.2.3',
  title: 'Ensure external Teams users cannot initiate conversations',
  titleHe: 'ודא שמשתמשים חיצוניים ב-Teams לא יכולים ליזום שיחות',
  descriptionHe: 'גם אם תקשורת חיצונית מאושרת, יש להגביל כך שרק משתמשים פנימיים יכולים ליזום שיחות עם צד חיצוני — לא הפוך.',
  category: 'Teams / External Access', domain: 'teams', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.2.3', framework: 'cis_m365',
  expectedState: 'External users cannot initiate conversations with internal users',
  remediationHe: 'Teams admin center → Users → External access → ודא שהגדרות External access מוגדרות כך שמשתמשים חיצוניים לא יכולים ליצור קשר עם פנימיים ללא הזמנה. שקול להשתמש ב-Inbound/Outbound trust settings לכל דומיין.',
  whyItMattersHe: 'יכולת של גורם חיצוני ליזום שיחה מהווה וקטור spear phishing ישיר — ללא כל סינון מוקדם.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.2.4',
  title: 'Ensure the organization cannot communicate with accounts in trial Teams tenants',
  titleHe: 'ודא שהארגון לא יכול לתקשר עם חשבונות ב-Teams trial tenants',
  descriptionHe: 'Tenants בתקופת ניסיון (trial) לא עברו אימות מלא. תקשורת איתם מגדילה את משטח התקיפה.',
  category: 'Teams / External Access', domain: 'teams', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.2.4', framework: 'cis_m365',
  expectedState: 'Communication with trial tenants blocked',
  remediationHe: 'Teams admin center → Users → External access → "Allow communication with Teams accounts that are in trial tenants": כבה → Save.',
  whyItMattersHe: 'Tenant ניסיוני הוא כלי זול ומהיר שתוקף יכול ליצור בדקות לביצוע מתקפות social engineering דרך Teams.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

// ─── 8.5 Meetings ───

registerCheck({
  id: 'CIS-8.5.1',
  title: "Ensure anonymous users can't join a meeting",
  titleHe: 'ודא שמשתמשים אנונימיים לא יכולים להצטרף לפגישה',
  descriptionHe: 'יש למנוע מגורמים אנונימיים (ללא חשבון Microsoft) להצטרף לפגישות Teams ללא אישור מפורש.',
  category: 'Teams / Meetings', domain: 'teams', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.5.1', framework: 'cis_m365',
  expectedState: 'AllowAnonymousUsersToJoinMeeting = False',
  remediationHe: 'Teams admin center → Meetings → Meeting policies → Global (Org-wide default) → Participants & guests → "Anonymous users can join a meeting": כבה → Save.',
  whyItMattersHe: 'פגישה עם משתתף אנונימי עלולה לכלול מתחרה, עיתונאי, או תוקף שקיבל את הקישור — ללא שום זיהוי.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.5.2',
  title: "Ensure anonymous users and dial-in callers can't start a meeting",
  titleHe: 'ודא שמשתמשים אנונימיים ומחייגים לא יכולים להתחיל פגישה',
  descriptionHe: 'אפילו אם אנונימיים מורשים להצטרף, הם לא צריכים להיות מסוגלים להתחיל פגישה לפני שמשתתף מורשה נכנס.',
  category: 'Teams / Meetings', domain: 'teams', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.5.2', framework: 'cis_m365',
  expectedState: 'AllowAnonymousUsersToStartMeeting = False; AllowPSTNUsersToBypassLobby = False',
  remediationHe: 'Teams admin center → Meetings → Meeting policies → Global → "Anonymous users and dial-in callers can start a meeting": כבה → Save.',
  whyItMattersHe: 'פגישה שהתחיל בה גורם אנונימי לפני המארח עלולה להיות מוקלטת ללא ידיעת המשתתפים הלגיטימיים.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.5.3',
  title: 'Ensure only people in my org can bypass the lobby',
  titleHe: 'ודא שרק אנשים בארגון יכולים לעקוף את הלובי',
  descriptionHe: 'הלובי הוא בקרת כניסה לפגישות Teams. רק משתמשים פנימיים צריכים להיות מסוגלים לעקוף אותו — אורחים וחיצוניים צריכים להמתין לאישור.',
  category: 'Teams / Meetings', domain: 'teams', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.5.3', framework: 'cis_m365',
  expectedState: 'AutoAdmittedUsers = PeopleInMyOrganization (not Everyone)',
  remediationHe: 'Teams admin center → Meetings → Meeting policies → Global → Participants & guests → "Who can bypass the lobby": בחר "People in my org" → Save.',
  whyItMattersHe: 'כאשר כולם עוקפים את הלובי, כל מי שיש לו קישור לפגישה נכנס ישירות — ללא שום בדיקה על ידי המארח.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.5.4',
  title: "Ensure users dialing in can't bypass the lobby",
  titleHe: 'ודא שמחייגים בטלפון לא יכולים לעקוף את הלובי',
  descriptionHe: 'משתתפים שמתחברים בטלפון (PSTN dial-in) צריכים להמתין בלובי עד לאישור המארח — כמו כל גורם חיצוני אחר.',
  category: 'Teams / Meetings', domain: 'teams', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.5.4', framework: 'cis_m365',
  expectedState: 'AllowPSTNUsersToBypassLobby = False',
  remediationHe: 'Teams admin center → Meetings → Meeting policies → Global → Participants & guests → "People dialing in can bypass the lobby": כבה → Save.',
  whyItMattersHe: 'מחייג PSTN אנונימי שעוקף לובי יכול להאזין לפגישות פנימיות רגישות ללא אימות זהות.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.5.5',
  title: 'Ensure meeting chat does not allow anonymous users',
  titleHe: 'ודא שצ׳אט הפגישה לא מאפשר משתמשים אנונימיים',
  descriptionHe: 'אנשים אנונימיים שהצטרפו לפגישה לא צריכים להיות מסוגלים לשלוח הודעות בצ׳אט — זה מגן מפני phishing בצ׳אט.',
  category: 'Teams / Meetings', domain: 'teams', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.5.5', framework: 'cis_m365',
  expectedState: 'MeetingChatEnabledType does not allow anonymous participants',
  remediationHe: 'Teams admin center → Meetings → Meeting policies → Global → Meeting engagement → "Meeting chat": בחר "On for everyone but anonymous users" → Save.',
  whyItMattersHe: 'גורם אנונימי שמשתתף בפגישה יכול לשלוח קישורים זדוניים בצ׳אט — שהמשתתפים יסמכו עליהם כי הם "בפגישה".',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.5.6',
  title: 'Ensure only organizers and co-organizers can present',
  titleHe: 'ודא שרק מארגנים ומארגנים-משנה יכולים להציג',
  descriptionHe: 'יש להגביל את יכולת ה-Present (שיתוף מסך, לוח, תוכן) למארגן ולמי שהוא מינה בלבד.',
  category: 'Teams / Meetings', domain: 'teams', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.5.6', framework: 'cis_m365',
  expectedState: 'DesignatedPresenterRoleMode = OrganizerOnlyUserOverride',
  remediationHe: 'Teams admin center → Meetings → Meeting policies → Global → Content sharing → "Who can present": בחר "Only organizers and co-organizers" → Save.',
  whyItMattersHe: 'כאשר כל משתתף יכול לשתף מסך, גורם חיצוני עלול להציג תוכן זדוני או להשתלט על המצגת.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.5.7',
  title: "Ensure external participants can't give or request control",
  titleHe: 'ודא שמשתתפים חיצוניים לא יכולים לתת או לבקש שליטה',
  descriptionHe: 'שליטה מרחוק (Remote Control) של מסך המשתתף צריכה להיות חסומה עבור גורמים חיצוניים.',
  category: 'Teams / Meetings', domain: 'teams', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.5.7', framework: 'cis_m365',
  expectedState: 'AllowExternalParticipantGiveRequestControl = False',
  remediationHe: 'Teams admin center → Meetings → Meeting policies → Global → Content sharing → "External participants can give or request control": כבה → Save.',
  whyItMattersHe: 'גורם חיצוני עם שליטה על מסך פנימי יכול לגשת לקבצים, לפתוח אפליקציות, ולהתקין תוכנה — בדיוק כמו גישה מרחוק.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.5.8',
  title: 'Ensure external meeting chat is off',
  titleHe: 'ודא שצ׳אט עם משתתפים חיצוניים בפגישה מושבת',
  descriptionHe: 'יש לכבות את האפשרות לצ׳אט עם משתתפים חיצוניים בפגישות כדי למנוע שיתוף מידע ולינקים מחוץ לארגון.',
  category: 'Teams / Meetings', domain: 'teams', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.5.8', framework: 'cis_m365',
  expectedState: 'AllowExternalNonTrustedMeetingChat = False',
  remediationHe: 'Teams admin center → Meetings → Meeting policies → Global → Meeting engagement → "External meeting chat": כבה → Save.',
  whyItMattersHe: 'צ׳אט עם חיצוניים בפגישה עלול לחשוף מידע רגיש שנכתב בצ׳אט — כולל קישורים, נתונים ותוכן פנימי.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.5.9',
  title: 'Ensure meeting recording is off by default',
  titleHe: 'ודא שהקלטת פגישות מושבתת כברירת מחדל',
  descriptionHe: 'הקלטת פגישות צריכה להיות opt-in — לא opt-out. יש לכבות הקלטה אוטומטית ולהשאיר את ההחלטה למארגן.',
  category: 'Teams / Meetings', domain: 'teams', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.5.9', framework: 'cis_m365',
  expectedState: 'AllowCloudRecording = False (disabled by default); AutoRecording = Off',
  remediationHe: 'Teams admin center → Meetings → Meeting policies → Global → Recording & transcription → "Cloud recording": כבה כברירת מחדל. אפשר per-organizer policy למי שצריך. "Record automatically": כבה → Save.',
  whyItMattersHe: 'הקלטת פגישות פנימיות ללא ידיעת המשתתפים מעוררת בעיות פרטיות ועלולה ליצור חשיפת מידע סודי.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

// ─── 8.6 Messaging ───

registerCheck({
  id: 'CIS-8.6.1',
  title: 'Ensure users can report security concerns in Teams',
  titleHe: 'ודא שמשתמשים יכולים לדווח על חששות אבטחה ב-Teams',
  descriptionHe: 'יש לאפשר למשתמשים לדווח על הודעות חשודות ב-Teams ישירות דרך הממשק — מה שמזין את Microsoft Defender לניתוח.',
  category: 'Teams / Messaging', domain: 'teams', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.6.1', framework: 'cis_m365',
  expectedState: 'ReportSecurityConcernsEnabled = True; ReportJunkToCustomizedAddress configured',
  remediationHe: 'Teams admin center → Messaging → Messaging policies → Global → "Report a security concern": הפעל → Save.\n\nDefender portal → Settings → Email & collaboration → User reported settings → הפעל Teams integration.',
  whyItMattersHe: 'דיווח על הודעות חשודות על ידי משתמשים הוא כלי threat intelligence חשוב. ככל שיותר משתמשים מדווחים, כך Defender לומד מהר יותר.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});