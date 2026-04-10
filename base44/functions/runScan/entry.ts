import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function getAccessToken(tenantId) {
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: Deno.env.get('AZURE_CLIENT_ID'),
      client_secret: Deno.env.get('AZURE_CLIENT_SECRET'),
      scope: 'https://graph.microsoft.com/.default',
    }).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Token error');
  return data.access_token;
}

async function graphGet(token, path) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Graph error ${res.status}: ${err?.error?.message || path}`);
  }
  return res.json();
}

async function graphGetBeta(token, path) {
  const res = await fetch(`https://graph.microsoft.com/beta${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Graph beta error ${res.status}: ${err?.error?.message || path}`);
  }
  return res.json();
}

// Run a single check and return { check_id, status, actual_value, evidence, error_message }
async function runCheck(token, checkId) {
  try {
    switch (checkId) {
      case 'CIS-1.1.1': {
        // Security Defaults
        const data = await graphGet(token, '/policies/identitySecurityDefaultsEnforcementPolicy');
        const enabled = data.isEnabled;
        return { check_id: checkId, status: enabled ? 'warning' : 'passed', actual_value: String(enabled), evidence: JSON.stringify({ isEnabled: enabled }) };
      }
      case 'CIS-1.1.3': {
        // Global admin count
        const data = await graphGet(token, '/directoryRoles?$filter=roleTemplateId eq \'62e90394-69f5-4237-9190-012177145e10\'');
        let admins = [];
        if (data.value && data.value.length > 0) {
          const members = await graphGet(token, `/directoryRoles/${data.value[0].id}/members`);
          admins = members.value || [];
        }
        const count = admins.length;
        const status = count >= 2 && count <= 4 ? 'passed' : 'failed';
        return { check_id: checkId, status, actual_value: String(count), evidence: JSON.stringify({ global_admin_count: count }) };
      }
      case 'CIS-1.2.1': {
        // MFA for all users - check via auth methods policies
        const data = await graphGetBeta(token, '/policies/authenticationMethodsPolicy');
        return { check_id: checkId, status: 'manual', actual_value: 'בדיקה ידנית נדרשת', evidence: JSON.stringify({ policy_id: data.id }) };
      }
      case 'CIS-1.2.2': {
        // MFA for admins via Conditional Access
        const data = await graphGet(token, '/identity/conditionalAccess/policies');
        const policies = data.value || [];
        const mfaForAdmins = policies.filter(p =>
          p.state === 'enabled' &&
          p.grantControls?.builtInControls?.includes('mfa') &&
          p.conditions?.users?.includeRoles?.length > 0
        );
        const status = mfaForAdmins.length > 0 ? 'passed' : 'failed';
        return { check_id: checkId, status, actual_value: `${mfaForAdmins.length} מדיניות MFA לאדמינים`, evidence: JSON.stringify({ mfa_admin_policies: mfaForAdmins.map(p => p.displayName) }) };
      }
      case 'CIS-2.1.1': {
        // CA policies - all cloud apps
        const data = await graphGet(token, '/identity/conditionalAccess/policies');
        const policies = data.value || [];
        const allApps = policies.filter(p =>
          p.state === 'enabled' &&
          (p.conditions?.applications?.includeApplications?.includes('All') || p.conditions?.applications?.includeApplications?.includes('all'))
        );
        const status = allApps.length > 0 ? 'passed' : 'failed';
        return { check_id: checkId, status, actual_value: `${allApps.length} מדיניות מכסות כל האפליקציות`, evidence: JSON.stringify({ all_app_policies: allApps.map(p => p.displayName) }) };
      }
      case 'CIS-2.1.2': {
        // Sign-in risk policy
        const data = await graphGet(token, '/identity/conditionalAccess/policies');
        const policies = data.value || [];
        const riskPolicy = policies.filter(p =>
          p.state === 'enabled' &&
          p.conditions?.signInRiskLevels?.includes('high') &&
          (p.grantControls?.builtInControls?.includes('block') || p.grantControls?.builtInControls?.includes('mfa'))
        );
        const status = riskPolicy.length > 0 ? 'passed' : 'failed';
        return { check_id: checkId, status, actual_value: `${riskPolicy.length} מדיניות סיכון כניסה`, evidence: JSON.stringify({ risk_policies: riskPolicy.map(p => p.displayName) }) };
      }
      case 'CIS-2.1.3': {
        // User risk policy
        const data = await graphGet(token, '/identity/conditionalAccess/policies');
        const policies = data.value || [];
        const riskPolicy = policies.filter(p =>
          p.state === 'enabled' &&
          p.conditions?.userRiskLevels?.includes('high') &&
          (p.grantControls?.builtInControls?.includes('block') || p.grantControls?.builtInControls?.includes('mfa'))
        );
        const status = riskPolicy.length > 0 ? 'passed' : 'failed';
        return { check_id: checkId, status, actual_value: `${riskPolicy.length} מדיניות סיכון משתמש`, evidence: JSON.stringify({ risk_policies: riskPolicy.map(p => p.displayName) }) };
      }
      case 'CIS-7.2.1': {
        // Audit log search
        const data = await graphGetBeta(token, '/security/secureScoreControlProfiles?$filter=controlName eq \'AuditLogSearch\'');
        const ctrl = data.value?.[0];
        return { check_id: checkId, status: ctrl ? 'manual' : 'manual', actual_value: 'בדיקה ב-Purview', evidence: JSON.stringify({ note: 'Requires Exchange Online audit settings check' }) };
      }
      default:
        return { check_id: checkId, status: 'manual', actual_value: 'בדיקה ידנית', evidence: 'check not automated yet' };
    }
  } catch (err) {
    return { check_id: checkId, status: 'error', error_message: err.message, actual_value: null, evidence: null };
  }
}

const CHECK_META = {
  'CIS-1.1.1': { title: 'Security Defaults', title_he: 'הגדרות ברירת מחדל לאבטחה', domain: 'entra_id', severity: 'high', category: 'Account / Authentication' },
  'CIS-1.1.3': { title: 'Global Admin Count', title_he: 'מספר מנהלי Global Admin', domain: 'entra_id', severity: 'critical', category: 'Account / Authentication' },
  'CIS-1.2.1': { title: 'MFA All Users', title_he: 'אימות רב-שלבי לכל המשתמשים', domain: 'entra_id', severity: 'critical', category: 'Account / Authentication' },
  'CIS-1.2.2': { title: 'MFA All Admins via CA', title_he: 'אימות רב-שלבי לכל המנהלים', domain: 'conditional_access', severity: 'critical', category: 'Conditional Access' },
  'CIS-2.1.1': { title: 'CA - All Cloud Apps', title_he: 'מדיניות גישה מותנית לכל אפליקציות הענן', domain: 'conditional_access', severity: 'high', category: 'Conditional Access' },
  'CIS-2.1.2': { title: 'Sign-in Risk Policy', title_he: 'מדיניות סיכון כניסה', domain: 'conditional_access', severity: 'critical', category: 'Conditional Access' },
  'CIS-2.1.3': { title: 'User Risk Policy', title_he: 'מדיניות סיכון משתמש', domain: 'conditional_access', severity: 'critical', category: 'Conditional Access' },
  'CIS-7.2.1': { title: 'Audit Log Search', title_he: 'חיפוש יומן ביקורת', domain: 'purview', severity: 'critical', category: 'Purview / Compliance' },
};

const ALL_CHECKS = Object.keys(CHECK_META);

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { scan_job_id, tenant_record_id, customer_tenant_id, workspace_id } = await req.json();

  if (!scan_job_id || !customer_tenant_id) {
    return Response.json({ error: 'scan_job_id and customer_tenant_id are required' }, { status: 400 });
  }

  // Update scan to running
  await base44.asServiceRole.entities.ScanJob.update(scan_job_id, {
    status: 'running',
    started_at: new Date().toISOString(),
    total_checks: ALL_CHECKS.length,
    completed_checks: 0,
    progress: 0,
  });

  let token;
  try {
    token = await getAccessToken(customer_tenant_id);
  } catch (err) {
    await base44.asServiceRole.entities.ScanJob.update(scan_job_id, {
      status: 'failed',
      error_message: `Authentication failed: ${err.message}`,
      completed_at: new Date().toISOString(),
    });
    return Response.json({ error: err.message }, { status: 400 });
  }

  // Run all checks
  const checkResults = [];
  const summary = { passed: 0, failed: 0, warning: 0, manual: 0, not_applicable: 0, error: 0 };

  for (let i = 0; i < ALL_CHECKS.length; i++) {
    const checkId = ALL_CHECKS[i];
    const result = await runCheck(token, checkId);
    const meta = CHECK_META[checkId];

    summary[result.status] = (summary[result.status] || 0) + 1;

    // Save result to DB
    await base44.asServiceRole.entities.CheckResult.create({
      workspace_id: workspace_id || 'default',
      scan_job_id,
      tenant_id: tenant_record_id,
      check_id: result.check_id,
      check_title: meta.title_he,
      domain: meta.domain,
      category: meta.category,
      severity: meta.severity,
      status: result.status,
      actual_value: result.actual_value,
      evidence: result.evidence,
      error_message: result.error_message,
    });

    // Update progress
    const progress = Math.round(((i + 1) / ALL_CHECKS.length) * 100);
    await base44.asServiceRole.entities.ScanJob.update(scan_job_id, {
      completed_checks: i + 1,
      progress,
    });
  }

  // Calculate score
  const totalScored = summary.passed + summary.failed + summary.warning;
  const score = totalScored > 0 ? Math.round((summary.passed / totalScored) * 100) : 0;

  await base44.asServiceRole.entities.ScanJob.update(scan_job_id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    progress: 100,
    overall_score: score,
    summary,
  });

  // Update tenant last scan info
  if (tenant_record_id) {
    const existing = await base44.asServiceRole.entities.ConnectedTenant.filter({ id: tenant_record_id });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.ConnectedTenant.update(tenant_record_id, {
        last_scan_date: new Date().toISOString(),
        last_scan_score: score,
        total_scans: (existing[0].total_scans || 0) + 1,
        connection_status: 'connected',
      });
    }
  }

  return Response.json({ success: true, score, summary, total_checks: ALL_CHECKS.length });
});