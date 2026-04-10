// Demo data for showcase purposes
// This provides realistic sample data for the UI

export const DEMO_WORKSPACE = {
  id: 'ws-demo-001',
  name: 'אקמה טכנולוגיות בע"מ',
  owner_email: 'admin@acme-tech.co.il',
  plan: 'professional',
  scan_quota: 50,
  scans_used: 12,
  status: 'active',
  members: [
    { email: 'admin@acme-tech.co.il', role: 'customer_admin', joined_date: '2024-01-15' },
    { email: 'security@acme-tech.co.il', role: 'customer_reader', joined_date: '2024-02-01' },
  ],
};

export const DEMO_TENANTS = [
  {
    id: 'tn-001',
    workspace_id: 'ws-demo-001',
    tenant_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    tenant_name: 'Acme Technologies Production',
    domain: 'acme-tech.co.il',
    connection_status: 'connected',
    consent_date: '2024-01-20',
    last_scan_date: '2025-04-08',
    last_scan_score: 72,
    total_scans: 8,
    permissions_granted: ['Directory.Read.All', 'Policy.Read.All', 'SecurityEvents.Read.All'],
  },
  {
    id: 'tn-002',
    workspace_id: 'ws-demo-001',
    tenant_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    tenant_name: 'Acme Technologies Dev/Test',
    domain: 'acme-dev.onmicrosoft.com',
    connection_status: 'connected',
    consent_date: '2024-03-10',
    last_scan_date: '2025-04-05',
    last_scan_score: 58,
    total_scans: 3,
    permissions_granted: ['Directory.Read.All', 'Policy.Read.All'],
  },
  {
    id: 'tn-003',
    workspace_id: 'ws-demo-001',
    tenant_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    tenant_name: 'Acme Subsidiary Corp',
    domain: 'subsidiary.acme.com',
    connection_status: 'pending_consent',
    consent_date: null,
    last_scan_date: null,
    last_scan_score: null,
    total_scans: 0,
    permissions_granted: [],
  },
];

export const DEMO_SCANS = [
  {
    id: 'scan-001',
    workspace_id: 'ws-demo-001',
    tenant_id: 'tn-001',
    tenant_name: 'Acme Technologies Production',
    status: 'completed',
    progress: 100,
    total_checks: 18,
    completed_checks: 18,
    benchmark_version: 'CIS Microsoft 365 v3.1.0',
    framework: 'cis_m365',
    started_at: '2025-04-08T10:00:00Z',
    completed_at: '2025-04-08T10:12:34Z',
    overall_score: 72,
    summary: { passed: 10, failed: 5, warning: 2, manual: 1, not_applicable: 0, error: 0 },
    domains_scanned: ['entra_id', 'conditional_access', 'exchange_online', 'defender', 'sharepoint', 'purview'],
    triggered_by: 'admin@acme-tech.co.il',
  },
  {
    id: 'scan-002',
    workspace_id: 'ws-demo-001',
    tenant_id: 'tn-001',
    tenant_name: 'Acme Technologies Production',
    status: 'completed',
    progress: 100,
    total_checks: 18,
    completed_checks: 18,
    benchmark_version: 'CIS Microsoft 365 v3.1.0',
    framework: 'cis_m365',
    started_at: '2025-03-15T14:00:00Z',
    completed_at: '2025-03-15T14:10:45Z',
    overall_score: 65,
    summary: { passed: 8, failed: 7, warning: 2, manual: 1, not_applicable: 0, error: 0 },
    domains_scanned: ['entra_id', 'conditional_access', 'exchange_online', 'defender', 'sharepoint', 'purview'],
    triggered_by: 'admin@acme-tech.co.il',
  },
  {
    id: 'scan-003',
    workspace_id: 'ws-demo-001',
    tenant_id: 'tn-002',
    tenant_name: 'Acme Technologies Dev/Test',
    status: 'completed',
    progress: 100,
    total_checks: 18,
    completed_checks: 18,
    benchmark_version: 'CIS Microsoft 365 v3.1.0',
    framework: 'cis_m365',
    started_at: '2025-04-05T09:00:00Z',
    completed_at: '2025-04-05T09:08:22Z',
    overall_score: 58,
    summary: { passed: 7, failed: 8, warning: 2, manual: 1, not_applicable: 0, error: 0 },
    domains_scanned: ['entra_id', 'conditional_access', 'exchange_online', 'defender', 'sharepoint', 'purview'],
    triggered_by: 'admin@acme-tech.co.il',
  },
];

export const DEMO_RESULTS = [
  // Entra ID results for scan-001
  { id: 'r-001', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-1.1.1', check_title: 'Ensure Security Defaults is disabled on Azure Active Directory', domain: 'entra_id', category: 'Account / Authentication', severity: 'high', status: 'passed', evidence: 'isEnabled: false', actual_value: 'Security Defaults: Disabled', expected_value: 'Disabled (Conditional Access in use)', explanation_he: 'הגדרות ברירת מחדל לאבטחה מושבתות. הארגון משתמש ב-Conditional Access.', remediation_he: '', benchmark_ref: 'CIS 1.1.1', execution_time_ms: 234 },
  { id: 'r-002', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-1.1.3', check_title: 'Ensure that between two and four global admins are designated', domain: 'entra_id', category: 'Account / Authentication', severity: 'critical', status: 'failed', evidence: 'Global Admins count: 7', actual_value: '7 Global Administrators', expected_value: '2-4 Global Administrators', explanation_he: 'נמצאו 7 מנהלי Global Admin - מעל המומלץ. יש לצמצם ל-2-4 מנהלים.', remediation_he: 'הסר מנהלי Global Admin מיותרים. שקול שימוש ב-PIM לגישה Just-in-Time.', why_it_matters_he: 'ריבוי חשבונות מנהל ברמה הגבוהה ביותר מגדיל את שטח התקיפה.', benchmark_ref: 'CIS 1.1.3', execution_time_ms: 456 },
  { id: 'r-003', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-1.1.4', check_title: 'Ensure self-service password reset is enabled', domain: 'entra_id', category: 'Account / Authentication', severity: 'medium', status: 'passed', evidence: 'SSPR: Enabled for All', actual_value: 'Enabled for All Users', expected_value: 'Enabled', explanation_he: 'איפוס סיסמה עצמאי מופעל לכל המשתמשים.', remediation_he: '', benchmark_ref: 'CIS 1.1.4', execution_time_ms: 189 },
  { id: 'r-004', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-1.2.1', check_title: 'Ensure multi-factor authentication is enabled for all users', domain: 'entra_id', category: 'Account / Authentication', severity: 'critical', status: 'warning', evidence: 'MFA policy exists but 12 users excluded', actual_value: 'MFA enabled with exclusions', expected_value: 'MFA for all users without exclusions', explanation_he: 'מדיניות MFA קיימת אך 12 משתמשים מוחרגים. יש לבדוק את ההחרגות.', remediation_he: 'סקור את רשימת ההחרגות וצמצם למינימום ההכרחי.', why_it_matters_he: 'כל משתמש ללא MFA הוא נקודת חולשה בארגון.', benchmark_ref: 'CIS 1.2.1', execution_time_ms: 312 },
  { id: 'r-005', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-1.2.2', check_title: 'Ensure multi-factor authentication is enabled for all admins', domain: 'entra_id', category: 'Account / Authentication', severity: 'critical', status: 'passed', evidence: 'All admin roles require MFA via CA policy', actual_value: 'MFA enforced for all admin roles', expected_value: 'MFA enforced for all admin roles', explanation_he: 'כל המנהלים מחויבים ב-MFA דרך מדיניות גישה מותנית.', remediation_he: '', benchmark_ref: 'CIS 1.2.2', execution_time_ms: 278 },
  
  // Conditional Access results
  { id: 'r-006', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-2.1.1', check_title: 'Ensure Conditional Access policies target all cloud applications', domain: 'conditional_access', category: 'Conditional Access', severity: 'high', status: 'passed', evidence: 'Policy "Baseline - All Apps MFA" targets All cloud apps', actual_value: 'All cloud apps targeted', expected_value: 'All cloud apps targeted', explanation_he: 'מדיניות גישה מותנית מכסה את כל אפליקציות הענן.', remediation_he: '', benchmark_ref: 'CIS 2.1.1', execution_time_ms: 201 },
  { id: 'r-007', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-2.1.2', check_title: 'Ensure sign-in risk policy is configured to block high risk sign-ins', domain: 'conditional_access', category: 'Conditional Access', severity: 'critical', status: 'failed', evidence: 'No sign-in risk policy found', actual_value: 'No sign-in risk policy', expected_value: 'Sign-in risk policy for High risk', explanation_he: 'לא נמצאה מדיניות סיכון כניסה. כניסות בסיכון גבוה אינן נחסמות.', remediation_he: 'צור מדיניות Conditional Access שחוסמת כניסות בסיכון גבוה.', why_it_matters_he: 'כניסות מסוכנות (ממיקום חריג, VPN זדוני) לא ייחסמו אוטומטית.', benchmark_ref: 'CIS 2.1.2', execution_time_ms: 345 },
  { id: 'r-008', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-2.1.3', check_title: 'Ensure user risk policy is configured to block high risk users', domain: 'conditional_access', category: 'Conditional Access', severity: 'critical', status: 'failed', evidence: 'No user risk policy found', actual_value: 'No user risk policy', expected_value: 'User risk policy for High risk', explanation_he: 'לא נמצאה מדיניות סיכון משתמש. משתמשים בסיכון גבוה אינם מטופלים.', remediation_he: 'צור מדיניות Conditional Access שדורשת שינוי סיסמה למשתמשים בסיכון גבוה.', why_it_matters_he: 'משתמשים שחשבונם נפרץ לא יטופלו אוטומטית.', benchmark_ref: 'CIS 2.1.3', execution_time_ms: 289 },
  
  // Exchange results
  { id: 'r-009', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-3.1.1', check_title: 'Ensure modern authentication is enabled for Exchange Online', domain: 'exchange_online', category: 'Exchange Online', severity: 'high', status: 'passed', evidence: 'Modern Auth: Enabled, Basic Auth: Blocked via CA', actual_value: 'Modern Authentication enabled', expected_value: 'Modern Authentication enabled', explanation_he: 'אימות מודרני מופעל ואימות ישן חסום.', remediation_he: '', benchmark_ref: 'CIS 3.1.1', execution_time_ms: 445 },
  { id: 'r-010', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-3.2.1', check_title: 'Ensure mail transport rules do not forward email to external domains', domain: 'exchange_online', category: 'Exchange Online', severity: 'high', status: 'failed', evidence: 'Found 2 rules forwarding to external: rule "FWD to Partner" -> partner@external.com', actual_value: '2 external forwarding rules found', expected_value: 'No external forwarding rules', explanation_he: 'נמצאו 2 כללי העברה לדומיינים חיצוניים. יש לבדוק אם הם מורשים.', remediation_he: 'סקור את כללי ההעברה והסר כללים לא מורשים.', why_it_matters_he: 'העברה אוטומטית לדומיינים חיצוניים יכולה לחשוף מידע רגיש.', benchmark_ref: 'CIS 3.2.1', execution_time_ms: 567 },
  { id: 'r-011', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-3.3.1', check_title: 'Ensure DKIM is enabled for all Exchange Online domains', domain: 'exchange_online', category: 'Exchange Online', severity: 'medium', status: 'passed', evidence: 'DKIM enabled for acme-tech.co.il', actual_value: 'DKIM enabled for all domains', expected_value: 'DKIM enabled', explanation_he: 'DKIM מופעל לכל הדומיינים.', remediation_he: '', benchmark_ref: 'CIS 3.3.1', execution_time_ms: 334 },
  
  // Defender results
  { id: 'r-012', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-4.1.1', check_title: 'Ensure Safe Attachments policy is enabled', domain: 'defender', category: 'Microsoft Defender', severity: 'critical', status: 'passed', evidence: 'Safe Attachments: Dynamic Delivery for all recipients', actual_value: 'Dynamic Delivery enabled', expected_value: 'Safe Attachments enabled', explanation_he: 'מדיניות Safe Attachments מופעלת עם Dynamic Delivery.', remediation_he: '', benchmark_ref: 'CIS 4.1.1', execution_time_ms: 289 },
  { id: 'r-013', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-4.1.2', check_title: 'Ensure Safe Links policy is enabled', domain: 'defender', category: 'Microsoft Defender', severity: 'high', status: 'passed', evidence: 'Safe Links: Enabled with click-time scanning', actual_value: 'Safe Links enabled', expected_value: 'Safe Links enabled', explanation_he: 'מדיניות Safe Links מופעלת עם סריקה בזמן אמת.', remediation_he: '', benchmark_ref: 'CIS 4.1.2', execution_time_ms: 234 },
  { id: 'r-014', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-4.2.1', check_title: 'Ensure anti-phishing policy is enabled with advanced settings', domain: 'defender', category: 'Microsoft Defender', severity: 'high', status: 'warning', evidence: 'Anti-phishing enabled but Impersonation Protection not configured for VIPs', actual_value: 'Basic anti-phishing only', expected_value: 'Advanced anti-phishing with impersonation protection', explanation_he: 'מדיניות אנטי-פישינג בסיסית קיימת אך הגנת התחזות (Impersonation) לא מוגדרת.', remediation_he: 'הפעל Impersonation Protection למנהלים ולדומיינים מרכזיים.', why_it_matters_he: 'ללא הגנת התחזות, תוקפים יכולים להתחזות למנהלים בקלות.', benchmark_ref: 'CIS 4.2.1', execution_time_ms: 267 },
  
  // SharePoint & Teams results
  { id: 'r-015', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-5.1.1', check_title: 'Ensure SharePoint external sharing is managed and controlled', domain: 'sharepoint', category: 'SharePoint / OneDrive', severity: 'high', status: 'failed', evidence: 'External sharing set to "Anyone" (most permissive)', actual_value: 'Anyone (anonymous links)', expected_value: 'New and existing guests or more restrictive', explanation_he: 'שיתוף חיצוני ב-SharePoint מוגדר לרמה הפתוחה ביותר - כולל קישורים אנונימיים.', remediation_he: 'הגבל שיתוף חיצוני ל-"New and existing guests" או מגביל יותר.', why_it_matters_he: 'קישורים אנונימיים מאפשרים לכל אחד עם הקישור לגשת למידע ארגוני.', benchmark_ref: 'CIS 5.1.1', execution_time_ms: 345 },
  { id: 'r-016', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-5.2.1', check_title: 'Ensure OneDrive external sharing is restricted', domain: 'onedrive', category: 'SharePoint / OneDrive', severity: 'medium', status: 'passed', evidence: 'OneDrive sharing: New and existing guests', actual_value: 'New and existing guests', expected_value: 'Not more permissive than SharePoint', explanation_he: 'שיתוף חיצוני ב-OneDrive מוגבל לאורחים מאומתים.', remediation_he: '', benchmark_ref: 'CIS 5.2.1', execution_time_ms: 198 },
  { id: 'r-017', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-6.1.1', check_title: 'Ensure external access in Microsoft Teams is managed', domain: 'teams', category: 'Microsoft Teams', severity: 'medium', status: 'passed', evidence: 'External access: Allowed specific domains only', actual_value: 'Specific domains allowed', expected_value: 'Managed and controlled', explanation_he: 'גישה חיצונית ב-Teams מוגבלת לדומיינים מורשים בלבד.', remediation_he: '', benchmark_ref: 'CIS 6.1.1', execution_time_ms: 211 },
  
  // Compliance results
  { id: 'r-018', workspace_id: 'ws-demo-001', scan_job_id: 'scan-001', tenant_id: 'tn-001', check_id: 'CIS-7.2.1', check_title: 'Ensure audit log search is enabled', domain: 'purview', category: 'Purview / Compliance', severity: 'critical', status: 'passed', evidence: 'Unified Audit Log: Enabled', actual_value: 'Audit logging enabled', expected_value: 'Audit logging enabled', explanation_he: 'יומן ביקורת מאוחד מופעל.', remediation_he: '', benchmark_ref: 'CIS 7.2.1', execution_time_ms: 156 },
];

// Historical score data for trend charts
export const DEMO_SCORE_HISTORY = [
  { date: '2024-10-01', tenant: 'Acme Technologies Production', score: 45 },
  { date: '2024-11-01', tenant: 'Acme Technologies Production', score: 52 },
  { date: '2024-12-01', tenant: 'Acme Technologies Production', score: 58 },
  { date: '2025-01-15', tenant: 'Acme Technologies Production', score: 61 },
  { date: '2025-02-15', tenant: 'Acme Technologies Production', score: 65 },
  { date: '2025-03-15', tenant: 'Acme Technologies Production', score: 65 },
  { date: '2025-04-08', tenant: 'Acme Technologies Production', score: 72 },
];

export const DEMO_REPORTS = [
  {
    id: 'rpt-001',
    workspace_id: 'ws-demo-001',
    scan_job_id: 'scan-001',
    tenant_id: 'tn-001',
    tenant_name: 'Acme Technologies Production',
    report_type: 'full_report',
    title: 'דוח הערכת אבטחה - Acme Technologies Production',
    scan_date: '2025-04-08',
    overall_score: 72,
    benchmark_version: 'CIS Microsoft 365 v3.1.0',
    summary_he: 'סריקת אבטחה של סביבת Microsoft 365 הושלמה בהצלחה. ציון כולל: 72/100. נמצאו 5 ממצאים שנכשלו, 2 אזהרות ו-10 בדיקות שעברו בהצלחה. נדרש שיפור בתחומי Conditional Access ושיתוף חיצוני.',
    findings_by_severity: { critical: 2, high: 2, medium: 0, low: 0, informational: 0 },
    findings_by_domain: { entra_id: 1, conditional_access: 2, exchange_online: 1, sharepoint: 1 },
    total_findings: 18,
    passed_count: 10,
    failed_count: 5,
    compliance_percentage: 72,
    status: 'ready',
    generated_by: 'admin@acme-tech.co.il',
  },
];