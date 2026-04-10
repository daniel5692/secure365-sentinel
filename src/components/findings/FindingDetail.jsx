import { ArrowRight, Shield, AlertTriangle, CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import SeverityBadge from "@/components/shared/SeverityBadge";
import StatusBadge from "@/components/shared/StatusBadge";
import { DOMAIN_META } from "@/lib/security-checks";
import { getAllChecks } from "@/lib/security-checks";

export default function FindingDetail({ finding, onBack }) {
  const checkDef = getAllChecks().find(c => c.id === finding.check_id);

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowRight className="w-4 h-4" />
        חזרה לממצאים
      </button>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mt-1">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{finding.check_id}</code>
                <SeverityBadge severity={finding.severity} />
                <StatusBadge status={finding.status} />
              </div>
              <h1 className="text-lg font-bold text-foreground" dir="ltr">{finding.check_title}</h1>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>{DOMAIN_META[finding.domain]?.labelHe}</span>
                <span>•</span>
                <span>{finding.category}</span>
                <span>•</span>
                <span>{finding.benchmark_ref}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Explanation */}
          {(finding.explanation_he || checkDef?.descriptionHe) && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                הסבר הממצא
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {finding.explanation_he || checkDef?.descriptionHe}
              </p>
            </div>
          )}

          {/* Why it Matters */}
          {(finding.why_it_matters_he || checkDef?.whyItMattersHe) && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">למה זה חשוב?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {finding.why_it_matters_he || checkDef?.whyItMattersHe}
              </p>
            </div>
          )}

          {/* Remediation */}
          {(finding.remediation_he || checkDef?.remediationHe) && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                המלצות לתיקון
              </h3>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {finding.remediation_he || checkDef?.remediationHe}
              </div>
            </div>
          )}

          {/* Validation Method */}
          {(finding.validation_method_he || checkDef?.validationMethodHe) && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">שיטת בדיקה</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {finding.validation_method_he || checkDef?.validationMethodHe}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Evidence */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">עדות (Evidence)</h3>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">ערך נוכחי</div>
                <code className="text-xs font-mono text-foreground bg-secondary p-2 rounded block" dir="ltr">
                  {finding.actual_value || 'N/A'}
                </code>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">ערך מצופה</div>
                <code className="text-xs font-mono text-green-400 bg-green-500/5 p-2 rounded block" dir="ltr">
                  {finding.expected_value || 'N/A'}
                </code>
              </div>
              {finding.evidence && (
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1">נתונים גולמיים</div>
                  <code className="text-[10px] font-mono text-muted-foreground bg-secondary p-2 rounded block break-all" dir="ltr">
                    {finding.evidence}
                  </code>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">מידע נוסף</h3>
            <div className="space-y-2.5">
              <InfoRow label="מזהה בדיקה" value={finding.check_id} />
              <InfoRow label="הפנייה" value={finding.benchmark_ref} />
              <InfoRow label="גרסת Benchmark" value="CIS Microsoft 365 v3.1.0" />
              <InfoRow label="תחום" value={DOMAIN_META[finding.domain]?.labelHe} />
              {finding.execution_time_ms && (
                <InfoRow label="זמן ביצוע" value={`${finding.execution_time_ms}ms`} />
              )}
              {checkDef?.graphApiEndpoint && (
                <InfoRow label="Graph API" value={checkDef.graphApiEndpoint} mono />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[10px] text-muted-foreground flex-shrink-0">{label}</span>
      <span className={`text-xs text-foreground text-left ${mono ? 'font-mono' : ''}`} dir="ltr">{value}</span>
    </div>
  );
}