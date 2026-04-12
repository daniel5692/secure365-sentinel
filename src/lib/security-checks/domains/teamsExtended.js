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
  remediationHe: 'Teams admin center (admin.teams.microsoft.com) \u2192 Teams apps \u2192 Manage apps \u2192 \u05d7\u05e4\u05e9 \u05d0\u05ea \u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d5\u05ea Dropbox / Box / Google Drive / Egnyte \u2192 \u05e1\u05d8\u05d8\u05d5\u05e1: Blocked.\n\n\u05d0\u05d5: Teams admin center \u2192 Settings & policies \u2192 Teams settings \u2192 Files \u2192 \u05db\u05d1\u05d4: Dropbox, Box, Egnyte, Google Drive \u2192 Save.',
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
  remediationHe: 'Teams admin center \u2192 Settings & policies \u2192 Teams settings \u2192 Email integration \u2192 \u05db\u05d1\u05d4 "Allow users to send emails to a channel email address" \u2192 Save.',
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
  remediationHe: 'Teams admin center \u2192 Settings & policies \u2192 External collaborations \u2192 External access \u2192 \u05e9\u05e0\u05d4 \u05de-"Allow all external domains" \u05dc-"Allow only specific external domains" \u2192 \u05d4\u05d5\u05e1\u05e3 \u05d3\u05d5\u05de\u05d9\u05d9\u05e0\u05d9\u05dd \u05de\u05d0\u05d5\u05e9\u05e8\u05d9\u05dd \u2192 Save.',
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
  remediationHe: 'Teams admin center \u2192 Settings & policies \u2192 External collaborations \u2192 External access \u2192 "Allow users in my organization to communicate with Teams users whose accounts are not managed by an organization": \u05db\u05d1\u05d4 \u2192 Save.',
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
  remediationHe: 'Teams admin center \u2192 Settings & policies \u2192 External collaborations \u2192 External access \u2192 \u05d5\u05d3\u05d0 \u05e9\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea External access \u05de\u05d5\u05d2\u05d3\u05e8\u05d5\u05ea \u05db\u05da \u05e9\u05de\u05e9\u05ea\u05de\u05e9\u05d9\u05dd \u05d7\u05d9\u05e6\u05d5\u05e0\u05d9\u05d9\u05dd \u05dc\u05d0 \u05d9\u05db\u05d5\u05dc\u05d9\u05dd \u05dc\u05d9\u05e6\u05d5\u05e8 \u05e7\u05e9\u05e8 \u05e2\u05dd \u05e4\u05e0\u05d9\u05de\u05d9\u05d9\u05dd \u05dc\u05dc\u05d0 \u05d4\u05d6\u05de\u05e0\u05d4. \u05e9\u05e7\u05d5\u05dc \u05dc\u05d4\u05e9\u05ea\u05de\u05e9 \u05d1-Inbound/Outbound trust settings \u05dc\u05db\u05dc \u05d3\u05d5\u05de\u05d9\u05d9\u05df.',
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
  remediationHe: 'Teams admin center \u2192 Settings & policies \u2192 External collaborations \u2192 External access \u2192 "Allow communication with Teams accounts that are in trial tenants": \u05db\u05d1\u05d4 \u2192 Save.',
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
  remediationHe: 'Teams admin center \u2192 Settings & policies \u2192 Meeting settings \u2192 "Anonymous users can join a meeting unverified": \u05db\u05d1\u05d4 \u2192 Save.\n\u05d0\u05d5: Teams admin center \u2192 Meetings \u2192 Meeting policies \u2192 Global \u2192 Participants & guests \u2192 "Anonymous users can join a meeting": \u05db\u05d1\u05d4 \u2192 Save.',
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
  remediationHe: 'Teams admin center \u2192 Settings & policies \u2192 Meeting settings \u2192 "Anonymous users and dial-in callers can start a meeting": \u05db\u05d1\u05d4 \u2192 Save.\n\u05d0\u05d5: Teams admin center \u2192 Meetings \u2192 Meeting policies \u2192 Global \u2192 Participants & guests \u2192 "Anonymous users and dial-in callers can start a meeting": \u05db\u05d1\u05d4 \u2192 Save.',
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
  remediationHe: 'Teams admin center \u2192 Settings & policies \u2192 Meeting settings \u2192 "Who can bypass the lobby": \u05d1\u05d7\u05e8 "People who were invited" \u05d0\u05d5 "People in my org" \u2192 Save.\n\u05d0\u05d5: Teams admin center \u2192 Meetings \u2192 Meeting policies \u2192 Global \u2192 "Who can bypass the lobby": \u05d1\u05d7\u05e8 "People in my org" \u2192 Save.',
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
  remediationHe: 'Teams admin center \u2192 Settings & policies \u2192 Meeting settings \u2192 "People dialing in can bypass the lobby": \u05db\u05d1\u05d4 (Off) \u2192 Save.\n\u05d0\u05d5: Teams admin center \u2192 Meetings \u2192 Meeting policies \u2192 Global \u2192 "People dialing in can bypass the lobby": \u05db\u05d1\u05d4 \u2192 Save.',
  whyItMattersHe: 'מחייג PSTN אנונימי שעוקף לובי יכול להאזין לפגישות פנימיות רגישות ללא אימות זהות.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.5.5',
  title: 'Ensure meeting chat does not allow anonymous users',
  titleHe: "\u05d5\u05d3\u05d0 \u05e9\u05e6'\u05d0\u05d8 \u05d4\u05e4\u05d2\u05d9\u05e9\u05d4 \u05dc\u05d0 \u05de\u05d0\u05e4\u05e9\u05e8 \u05de\u05e9\u05ea\u05de\u05e9\u05d9\u05dd \u05d0\u05e0\u05d5\u05e0\u05d9\u05de\u05d9\u05d9\u05dd",
  descriptionHe: "\u05d0\u05e0\u05e9\u05d9\u05dd \u05d0\u05e0\u05d5\u05e0\u05d9\u05de\u05d9\u05d9\u05dd \u05e9\u05d4\u05e6\u05d8\u05e8\u05e4\u05d5 \u05dc\u05e4\u05d2\u05d9\u05e9\u05d4 \u05dc\u05d0 \u05e6\u05e8\u05d9\u05db\u05d9\u05dd \u05dc\u05d4\u05d9\u05d5\u05ea \u05de\u05e1\u05d5\u05d2\u05dc\u05d9\u05dd \u05dc\u05e9\u05dc\u05d5\u05d7 \u05d4\u05d5\u05d3\u05e2\u05d5\u05ea \u05d1\u05e6'\u05d0\u05d8 \u2014 \u05d6\u05d4 \u05de\u05d2\u05df \u05de\u05e4\u05e0\u05d9 phishing \u05d1\u05e6'\u05d0\u05d8.",
  category: 'Teams / Meetings', domain: 'teams', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.5.5', framework: 'cis_m365',
  expectedState: 'MeetingChatEnabledType does not allow anonymous participants',
  remediationHe: 'Teams admin center \u2192 Meetings \u2192 Meeting policies \u2192 Global \u2192 Meeting engagement \u2192 "Meeting chat": \u05d1\u05d7\u05e8 "On for everyone but anonymous users" \u2192 Save.',
  whyItMattersHe: "\u05d2\u05d5\u05e8\u05dd \u05d0\u05e0\u05d5\u05e0\u05d9\u05de\u05d9 \u05e9\u05de\u05e9\u05ea\u05ea\u05e3 \u05d1\u05e4\u05d2\u05d9\u05e9\u05d4 \u05d9\u05db\u05d5\u05dc \u05dc\u05e9\u05dc\u05d5\u05d7 \u05e7\u05d9\u05e9\u05d5\u05e8\u05d9\u05dd \u05d6\u05d3\u05d5\u05e0\u05d9\u05d9\u05dd \u05d1\u05e6'\u05d0\u05d8 \u2014 \u05e9\u05d4\u05de\u05e9\u05ea\u05ea\u05e4\u05d9\u05dd \u05d9\u05e1\u05de\u05db\u05d5 \u05e2\u05dc\u05d9\u05d4\u05dd \u05db\u05d9 \u05d4\u05dd \u201c\u05d1\u05e4\u05d2\u05d9\u05e9\u05d4\u201d.",
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.5.6',
  title: 'Ensure only organizers and co-organizers can present',
  titleHe: '\u05d5\u05d3\u05d0 \u05e9\u05e8\u05e7 \u05de\u05d0\u05e8\u05d2\u05e0\u05d9\u05dd \u05d5\u05de\u05d0\u05e8\u05d2\u05e0\u05d9\u05dd-\u05de\u05e9\u05e0\u05d4 \u05d9\u05db\u05d5\u05dc\u05d9\u05dd \u05dc\u05d4\u05e6\u05d9\u05d2',
  descriptionHe: '\u05d9\u05e9 \u05dc\u05d4\u05d2\u05d1\u05d9\u05dc \u05d0\u05ea \u05d9\u05db\u05d5\u05dc\u05ea \u05d4-Present (\u05e9\u05d9\u05ea\u05d5\u05e3 \u05de\u05e1\u05da, \u05dc\u05d5\u05d7, \u05ea\u05d5\u05db\u05df) \u05dc\u05de\u05d0\u05e8\u05d2\u05df \u05d5\u05dc\u05de\u05d9 \u05e9\u05d4\u05d5\u05d0 \u05de\u05d9\u05e0\u05d4 \u05d1\u05dc\u05d1\u05d3.',
  category: 'Teams / Meetings', domain: 'teams', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.5.6', framework: 'cis_m365',
  expectedState: 'DesignatedPresenterRoleMode = OrganizerOnlyUserOverride',
  remediationHe: 'Teams admin center \u2192 Meetings \u2192 Meeting policies \u2192 Global \u2192 Content sharing \u2192 "Who can present": \u05d1\u05d7\u05e8 "Only organizers and co-organizers" \u2192 Save.\n\u05d0\u05d5: Teams admin center \u2192 Settings & policies \u2192 Meeting settings \u2192 "Who can admit from the lobby": \u05d4\u05d2\u05d3\u05e8 Organizers \u05d5-co-organizers \u05d1\u05dc\u05d1\u05d3.',
  whyItMattersHe: '\u05db\u05d0\u05e9\u05e8 \u05db\u05dc \u05de\u05e9\u05ea\u05ea\u05e3 \u05d9\u05db\u05d5\u05dc \u05dc\u05e9\u05ea\u05e3 \u05de\u05e1\u05da, \u05d2\u05d5\u05e8\u05dd \u05d7\u05d9\u05e6\u05d5\u05e0\u05d9 \u05e2\u05dc\u05d5\u05dc \u05dc\u05d4\u05e6\u05d9\u05d2 \u05ea\u05d5\u05db\u05df \u05d6\u05d3\u05d5\u05e0\u05d9 \u05d0\u05d5 \u05dc\u05d4\u05e9\u05ea\u05dc\u05d8 \u05e2\u05dc \u05d4\u05de\u05e6\u05d2\u05d4.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.5.7',
  title: "Ensure external participants can't give or request control",
  titleHe: '\u05d5\u05d3\u05d0 \u05e9\u05de\u05e9\u05ea\u05ea\u05e4\u05d9\u05dd \u05d7\u05d9\u05e6\u05d5\u05e0\u05d9\u05d9\u05dd \u05dc\u05d0 \u05d9\u05db\u05d5\u05dc\u05d9\u05dd \u05dc\u05ea\u05ea \u05d0\u05d5 \u05dc\u05d1\u05e7\u05e9 \u05e9\u05dc\u05d9\u05d8\u05d4',
  descriptionHe: '\u05e9\u05dc\u05d9\u05d8\u05d4 \u05de\u05e8\u05d7\u05d5\u05e7 (Remote Control) \u05e9\u05dc \u05de\u05e1\u05da \u05d4\u05de\u05e9\u05ea\u05ea\u05e3 \u05e6\u05e8\u05d9\u05db\u05d4 \u05dc\u05d4\u05d9\u05d5\u05ea \u05d7\u05e1\u05d5\u05de\u05d4 \u05e2\u05d1\u05d5\u05e8 \u05d2\u05d5\u05e8\u05de\u05d9\u05dd \u05d7\u05d9\u05e6\u05d5\u05e0\u05d9\u05d9\u05dd.',
  category: 'Teams / Meetings', domain: 'teams', severity: 'high',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.5.7', framework: 'cis_m365',
  expectedState: 'AllowExternalParticipantGiveRequestControl = False',
  remediationHe: 'Teams admin center \u2192 Meetings \u2192 Meeting policies \u2192 Global \u2192 Content sharing \u2192 "External participants can give or request control": \u05db\u05d1\u05d4 \u2192 Save.',
  whyItMattersHe: '\u05d2\u05d5\u05e8\u05dd \u05d7\u05d9\u05e6\u05d5\u05e0\u05d9 \u05e2\u05dd \u05e9\u05dc\u05d9\u05d8\u05d4 \u05e2\u05dc \u05de\u05e1\u05da \u05e4\u05e0\u05d9\u05de\u05d9 \u05d9\u05db\u05d5\u05dc \u05dc\u05d2\u05e9\u05ea \u05dc\u05e7\u05d1\u05e6\u05d9\u05dd, \u05dc\u05e4\u05ea\u05d5\u05d7 \u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d5\u05ea, \u05d5\u05dc\u05d4\u05ea\u05e7\u05d9\u05df \u05ea\u05d5\u05db\u05e0\u05d4 \u2014 \u05d1\u05d3\u05d9\u05d5\u05e7 \u05db\u05de\u05d5 \u05d2\u05d9\u05e9\u05d4 \u05de\u05e8\u05d7\u05d5\u05e7.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.5.8',
  title: 'Ensure external meeting chat is off',
  titleHe: "\u05d5\u05d3\u05d0 \u05e9\u05e6'\u05d0\u05d8 \u05e2\u05dd \u05de\u05e9\u05ea\u05ea\u05e4\u05d9\u05dd \u05d7\u05d9\u05e6\u05d5\u05e0\u05d9\u05d9\u05dd \u05d1\u05e4\u05d2\u05d9\u05e9\u05d4 \u05de\u05d5\u05e9\u05d1\u05ea",
  descriptionHe: "\u05d9\u05e9 \u05dc\u05db\u05d1\u05d5\u05ea \u05d0\u05ea \u05d4\u05d0\u05e4\u05e9\u05e8\u05d5\u05ea \u05dc\u05e6'\u05d0\u05d8 \u05e2\u05dd \u05de\u05e9\u05ea\u05ea\u05e4\u05d9\u05dd \u05d7\u05d9\u05e6\u05d5\u05e0\u05d9\u05d9\u05dd \u05d1\u05e4\u05d2\u05d9\u05e9\u05d5\u05ea \u05db\u05d3\u05d9 \u05dc\u05de\u05e0\u05d5\u05e2 \u05e9\u05d9\u05ea\u05d5\u05e3 \u05de\u05d9\u05d3\u05e2 \u05d5\u05dc\u05d9\u05e0\u05e7\u05d9\u05dd \u05de\u05d7\u05d5\u05e5 \u05dc\u05d0\u05e8\u05d2\u05d5\u05df.",
  category: 'Teams / Meetings', domain: 'teams', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.5.8', framework: 'cis_m365',
  expectedState: 'AllowExternalNonTrustedMeetingChat = False',
  remediationHe: 'Teams admin center \u2192 Meetings \u2192 Meeting policies \u2192 Global \u2192 Meeting engagement \u2192 "External meeting chat": \u05db\u05d1\u05d4 \u2192 Save.',
  whyItMattersHe: "\u05e6'\u05d0\u05d8 \u05e2\u05dd \u05d7\u05d9\u05e6\u05d5\u05e0\u05d9\u05d9\u05dd \u05d1\u05e4\u05d2\u05d9\u05e9\u05d4 \u05e2\u05dc\u05d5\u05dc \u05dc\u05d7\u05e9\u05d5\u05e3 \u05de\u05d9\u05d3\u05e2 \u05e8\u05d2\u05d9\u05e9 \u05e9\u05e0\u05db\u05ea\u05d1 \u05d1\u05e6'\u05d0\u05d8 \u2014 \u05db\u05d5\u05dc\u05dc \u05e7\u05d9\u05e9\u05d5\u05e8\u05d9\u05dd, \u05e0\u05ea\u05d5\u05e0\u05d9\u05dd \u05d5\u05ea\u05d5\u05db\u05df \u05e4\u05e0\u05d9\u05de\u05d9.",
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

registerCheck({
  id: 'CIS-8.5.9',
  title: 'Ensure meeting recording is off by default',
  titleHe: '\u05d5\u05d3\u05d0 \u05e9\u05d4\u05e7\u05dc\u05d8\u05ea \u05e4\u05d2\u05d9\u05e9\u05d5\u05ea \u05de\u05d5\u05e9\u05d1\u05ea\u05ea \u05db\u05d1\u05e8\u05d9\u05e8\u05ea \u05de\u05d7\u05d3\u05dc',
  descriptionHe: '\u05d4\u05e7\u05dc\u05d8\u05ea \u05e4\u05d2\u05d9\u05e9\u05d5\u05ea \u05e6\u05e8\u05d9\u05db\u05d4 \u05dc\u05d4\u05d9\u05d5\u05ea opt-in \u2014 \u05dc\u05d0 opt-out. \u05d9\u05e9 \u05dc\u05db\u05d1\u05d5\u05ea \u05d4\u05e7\u05dc\u05d8\u05d4 \u05d0\u05d5\u05d8\u05d5\u05de\u05d8\u05d9\u05ea \u05d5\u05dc\u05d4\u05e9\u05d0\u05d9\u05e8 \u05d0\u05ea \u05d4\u05d4\u05d7\u05dc\u05d8\u05d4 \u05dc\u05de\u05d0\u05e8\u05d2\u05df.',
  category: 'Teams / Meetings', domain: 'teams', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.5.9', framework: 'cis_m365',
  expectedState: 'AllowCloudRecording = False (disabled by default); AutoRecording = Off',
  remediationHe: 'Teams admin center \u2192 Meetings \u2192 Meeting policies \u2192 Global \u2192 Recording & transcription \u2192 "Cloud recording": \u05db\u05d1\u05d4 \u05db\u05d1\u05e8\u05d9\u05e8\u05ea \u05de\u05d7\u05d3\u05dc. "Record automatically": \u05db\u05d1\u05d4 \u2192 Save.',
  whyItMattersHe: '\u05d4\u05e7\u05dc\u05d8\u05ea \u05e4\u05d2\u05d9\u05e9\u05d5\u05ea \u05e4\u05e0\u05d9\u05de\u05d9\u05d5\u05ea \u05dc\u05dc\u05d0 \u05d9\u05d3\u05d9\u05e2\u05ea \u05d4\u05de\u05e9\u05ea\u05ea\u05e4\u05d9\u05dd \u05de\u05e2\u05d5\u05e8\u05e8\u05ea \u05d1\u05e2\u05d9\u05d5\u05ea \u05e4\u05e8\u05d8\u05d9\u05d5\u05ea \u05d5\u05e2\u05dc\u05d5\u05dc\u05d4 \u05dc\u05d9\u05e6\u05d5\u05e8 \u05d7\u05e9\u05d9\u05e4\u05ea \u05de\u05d9\u05d3\u05e2 \u05e1\u05d5\u05d3\u05d9.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});

// ─── 8.6 Messaging ───

registerCheck({
  id: 'CIS-8.6.1',
  title: 'Ensure users can report security concerns in Teams',
  titleHe: '\u05d5\u05d3\u05d0 \u05e9\u05de\u05e9\u05ea\u05de\u05e9\u05d9\u05dd \u05d9\u05db\u05d5\u05dc\u05d9\u05dd \u05dc\u05d3\u05d5\u05d5\u05d7 \u05e2\u05dc \u05d7\u05e9\u05e9\u05d5\u05ea \u05d0\u05d1\u05d8\u05d7\u05d4 \u05d1-Teams',
  descriptionHe: '\u05d9\u05e9 \u05dc\u05d0\u05e4\u05e9\u05e8 \u05dc\u05de\u05e9\u05ea\u05de\u05e9\u05d9\u05dd \u05dc\u05d3\u05d5\u05d5\u05d7 \u05e2\u05dc \u05d4\u05d5\u05d3\u05e2\u05d5\u05ea \u05d7\u05e9\u05d5\u05d3\u05d5\u05ea \u05d1-Teams \u05d9\u05e9\u05d9\u05e8\u05d5\u05ea \u05d3\u05e8\u05da \u05d4\u05de\u05de\u05e9\u05e7 \u2014 \u05de\u05d4 \u05e9\u05de\u05d6\u05d9\u05df \u05d0\u05ea Microsoft Defender \u05dc\u05e0\u05d9\u05ea\u05d5\u05d7.',
  category: 'Teams / Messaging', domain: 'teams', severity: 'medium',
  benchmarkRef: 'CIS M365 v6.0.1 - 8.6.1', framework: 'cis_m365',
  expectedState: 'ReportSecurityConcernsEnabled = True; ReportJunkToCustomizedAddress configured',
  remediationHe: 'Teams admin center \u2192 Messaging \u2192 Messaging policies \u2192 Global \u2192 "Report a security concern": \u05d4\u05e4\u05e2\u05dc \u2192 Save.\n\nDefender portal \u2192 Settings \u2192 Email & collaboration \u2192 User reported settings \u2192 \u05d4\u05e4\u05e2\u05dc Teams integration.',
  whyItMattersHe: '\u05d3\u05d9\u05d5\u05d5\u05d7 \u05e2\u05dc \u05d4\u05d5\u05d3\u05e2\u05d5\u05ea \u05d7\u05e9\u05d5\u05d3\u05d5\u05ea \u05e2\u05dc \u05d9\u05d3\u05d9 \u05de\u05e9\u05ea\u05de\u05e9\u05d9\u05dd \u05d4\u05d5\u05d0 \u05db\u05dc\u05d9 threat intelligence \u05d7\u05e9\u05d5\u05d1. \u05db\u05db\u05dc \u05e9\u05d9\u05d5\u05ea\u05e8 \u05de\u05e9\u05ea\u05de\u05e9\u05d9\u05dd \u05de\u05d3\u05d5\u05d5\u05d7\u05d9\u05dd, \u05db\u05da Defender \u05dc\u05d5\u05de\u05d3 \u05de\u05d4\u05e8 \u05d9\u05d5\u05ea\u05e8.',
  graphApiEndpoint: null,
  requiredPermissions: [],
  isAutomated: true,
});