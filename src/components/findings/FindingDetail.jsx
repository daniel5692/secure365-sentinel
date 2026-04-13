import { useState } from "react";
import { Shield, AlertTriangle, CheckCircle2, XCircle, Info, Wrench, ShieldCheck } from "lucide-react";
import SeverityBadge from "@/components/shared/SeverityBadge";
import StatusBadge from "@/components/shared/StatusBadge";
import OverridePanel from "@/components/findings/OverridePanel";
import { DOMAIN_META } from "@/lib/security-checks";
import { getAllChecks } from "@/lib/security-checks";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

function parseEvidence(evidenceStr) {
  if (!evidenceStr) return {};
  try {
    return typeof evidenceStr === 'object' ? evidenceStr : JSON.parse(evidenceStr);
  } catch {
    return { 'נתון גולמי': evidenceStr };
  }
}

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

function formatScore(val) {
  // Fix "X/undefined" by showing just the number if maxScore is missing
  if (typeof val === 'string' && val.includes('/undefined')) return val.replace('/undefined', '');
  return val;
}

function EvidenceCard({ evidence }) {
  const parsed = parseEvidence(evidence);
  const entries = Object.entries(parsed);
  if (entries.length === 0) return null;
  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => {
        let strVal = String(value);
        if (strVal.includes('<')) strVal = stripHtml(strVal);
        strVal = formatScore(strVal);
        const isGood = strVal.includes('✓');
        const isBad = strVal.includes('✗');
        return (
          <div key={key} className={cn(
            "flex items-start justify-between gap-3 p-2.5 rounded-lg border text-xs",
            isGood ? "bg-green-500/5 border-green-500/20" :
            isBad ? "bg-red-500/5 border-red-500/20" :
            "bg-secondary/30 border-border"
          )}>
            <span className="text-muted-foreground font-medium flex-shrink-0 min-w-[120px]">{key}</span>
            <span className={cn(
              "font-mono text-right break-all",
              isGood ? "text-green-400" : isBad ? "text-red-400" : "text-foreground"
            )} dir="ltr">{strVal}</span>
          </div>
        );
      })}
    </div>
  );
}

function ValueComparison({ actual, expected, status }) {
  const statusConfig = {
    passed: { bg: 'bg-green-500/5', border: 'border-green-500/20', icon: CheckCircle2, color: 'text-green-400' },
    failed: { bg: 'bg-red-500/5', border: 'border-red-500/20', icon: XCircle, color: 'text-red-400' },
    warning: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', icon: AlertTriangle, color: 'text-amber-400' },
    not_applicable: { bg: 'bg-slate-500/5', border: 'border-slate-500/20', icon: Info, color: 'text-slate-400' },
    error: { bg: 'bg-red-500/5', border: 'border-red-500/20', icon: XCircle, color: 'text-red-400' },
  };
  const cfg = statusConfig[status] || statusConfig.warning;
  const Icon = cfg.icon;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className={cn("rounded-xl p-4 border", cfg.bg, cfg.border)}>
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn("w-4 h-4", cfg.color)} />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">ערך נוכחי</span>
        </div>
        <p className={cn("text-sm font-semibold leading-relaxed", cfg.color)}>{actual || '—'}</p>
      </div>
      <div className="rounded-xl p-4 border bg-green-500/5 border-green-500/20">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">ערך מצופה</span>
        </div>
        <p className="text-sm font-semibold text-green-400 leading-relaxed">{expected || '—'}</p>
      </div>
    </div>
  );
}

export default function FindingDetail({ finding, onOverrideChange }) {
  const checkDef = getAllChecks().find(c => c.id === finding.check_id);
  const domainMeta = DOMAIN_META[finding.domain];
  const [localFinding, setLocalFinding] = useState(finding);
  const [saving, setSaving] = useState(false);

  const handleSaveOverride = async (overrideStatus, note) => {
    setSaving(true);
    const user = await base44.auth.me();
    const updated = {
      override_status: overrideStatus,
      override_note: note,
      override_by: user.email,
      override_date: new Date().toISOString(),
    };
    await base44.entities.CheckResult.update(finding.id, updated);
    const newFinding = { ...localFinding, ...updated };
    setLocalFinding(newFinding);
    setSaving(false);
    onOverrideChange?.(newFinding);
  };

  const handleClearOverride = async () => {
    setSaving(true);
    const updated = { override_status: null, override_note: null, override_by: null, override_date: null };
    await base44.entities.CheckResult.update(finding.id, updated);
    const newFinding = { ...localFinding, ...updated };
    setLocalFinding(newFinding);
    setSaving(false);
    onOverrideChange?.(newFinding);
  };

  return (
    <div className="p-5 bg-secondary/10 border-t border-border space-y-5">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            {localFinding.override_status ? <ShieldCheck className="w-6 h-6 text-purple-400" /> : <Shield className="w-6 h-6 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{localFinding.check_id}</code>
              <SeverityBadge severity={localFinding.severity} />
              <StatusBadge status={localFinding.status} />
              {localFinding.override_status && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Override פעיל
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold text-foreground mb-1">{checkDef?.title || localFinding.check_title}</h1>
            {checkDef?.titleHe && (
              <p className="text-sm text-muted-foreground mb-1">{checkDef.titleHe}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("px-2 py-0.5 rounded-md border text-[11px]",
                `bg-${domainMeta?.color || 'blue'}-500/10 border-${domainMeta?.color || 'blue'}-500/30 text-${domainMeta?.color || 'blue'}-400`
              )}>{domainMeta?.labelHe || localFinding.domain}</span>
              <span>•</span>
              <span>{localFinding.category}</span>
              <span>•</span>
              <span className="font-mono">{checkDef?.benchmarkRef || localFinding.benchmark_ref || 'CIS M365 v6.0.1'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">

          {/* Value Comparison */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              תוצאת הבדיקה
            </h3>
            <ValueComparison actual={localFinding.actual_value} expected={localFinding.expected_value} status={localFinding.status} />
          </div>

          {/* Evidence breakdown */}
          {localFinding.evidence && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">פירוט ממצאים</h3>
              <EvidenceCard evidence={localFinding.evidence} />
            </div>
          )}

          {/* Description */}
          {(checkDef?.descriptionHe) && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                הסבר
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{checkDef.descriptionHe}</p>
            </div>
          )}

          {/* Why it matters */}
          {checkDef?.whyItMattersHe && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-amber-400 mb-2">למה זה חשוב?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{checkDef.whyItMattersHe}</p>
            </div>
          )}

          {/* Remediation */}
          {(localFinding.status === 'failed' || localFinding.status === 'warning') && checkDef?.remediationHe && (
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                צעדי תיקון מומלצים
              </h3>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {checkDef.remediationHe}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Override Panel */}
          <OverridePanel
            finding={localFinding}
            onSave={handleSaveOverride}
            onClear={handleClearOverride}
            saving={saving}
          />

          {/* Metadata */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">פרטי הבדיקה</h3>
            <div className="space-y-3">
              <MetaRow label="מזהה" value={localFinding.check_id} mono />
              <MetaRow label="Framework" value="CIS M365 v6.0.1" />
              <MetaRow label="תחום" value={domainMeta?.labelHe || localFinding.domain} />
              <MetaRow label="קטגוריה" value={localFinding.category} />
              {checkDef?.graphApiEndpoint && (
                <MetaRow label="Graph API" value={checkDef.graphApiEndpoint} mono />
              )}
              {checkDef?.requiredPermissions?.length > 0 && (
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1.5">הרשאות נדרשות</div>
                  <div className="flex flex-wrap gap-1">
                    {checkDef.requiredPermissions.map(p => (
                      <span key={p} className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status indicator */}
          <div className={cn(
            "rounded-xl p-4 border text-center",
            localFinding.override_status ? 'bg-purple-500/10 border-purple-500/30' :
            localFinding.status === 'passed' ? 'bg-green-500/10 border-green-500/30' :
            localFinding.status === 'failed' ? 'bg-red-500/10 border-red-500/30' :
            localFinding.status === 'warning' ? 'bg-amber-500/10 border-amber-500/30' :
            'bg-slate-500/10 border-slate-500/30'
          )}>
            {localFinding.override_status ? <ShieldCheck className="w-8 h-8 text-purple-400 mx-auto mb-2" /> :
             localFinding.status === 'passed' ? <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" /> :
             localFinding.status === 'failed' ? <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" /> :
             localFinding.status === 'warning' ? <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" /> :
             <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />}
            <p className={cn("text-sm font-semibold",
              localFinding.override_status ? 'text-purple-400' :
              localFinding.status === 'passed' ? 'text-green-400' :
              localFinding.status === 'failed' ? 'text-red-400' :
              localFinding.status === 'warning' ? 'text-amber-400' :
              'text-slate-400'
            )}>
              {localFinding.override_status ? 'Override פעיל' :
               localFinding.status === 'passed' ? 'עבר בהצלחה' :
               localFinding.status === 'failed' ? 'נכשל — דורש תיקון' :
               localFinding.status === 'warning' ? 'אזהרה — בדוק' :
               localFinding.status === 'not_applicable' ? 'לא רלוונטי' : localFinding.status}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">{label}</span>
      <span className={cn("text-xs text-foreground text-left break-all", mono && 'font-mono')} dir="ltr">{value || '—'}</span>
    </div>
  );
}