import { useState, useEffect } from "react";
import { FileText, Download, Eye, Calendar, Plus, Loader2, X, Trash2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import ScoreRing from "@/components/shared/ScoreRing";
import SeverityBadge from "@/components/shared/SeverityBadge";
import StatusBadge from "@/components/shared/StatusBadge";
import { base44 } from "@/api/base44Client";

function ReportSummary({ summary }) {
  if (!summary) return null;
  const cleaned = summary
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^-+$/gm, '')
    .split('\n')
    .filter(line => line.trim())
    .join('\n');

  return (
    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-heebo bg-card rounded-lg p-5 border border-border">
      {cleaned}
    </div>
  );
}

function ReportFindingDetail({ result }) {
  return (
    <div className="p-5 bg-secondary/10 border-t border-border space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg p-4 border bg-red-500/5 border-red-500/20">
          <div className="text-[10px] font-semibold text-muted-foreground mb-1">ערך נוכחי</div>
          <p className="text-xs text-red-400 break-all font-mono">{result.actual_value || '—'}</p>
        </div>
        <div className="rounded-lg p-4 border bg-green-500/5 border-green-500/20">
          <div className="text-[10px] font-semibold text-muted-foreground mb-1">ערך מצופה</div>
          <p className="text-xs text-green-400 break-all font-mono">{result.expected_value || '—'}</p>
        </div>
      </div>
      {result.evidence && (
        <div>
          <div className="text-xs font-semibold text-foreground mb-2">עדויות</div>
          <div className="bg-secondary/30 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground break-all font-mono">{result.evidence?.substring(0, 200)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportResultsTable({ scanJobId }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const load = async () => {
      const res = await base44.entities.CheckResult.filter({ scan_job_id: scanJobId }, '-created_date', 100);
      setResults(res);
      setLoading(false);
    };
    load();
  }, [scanJobId]);

  if (loading) return <div className="text-center py-4"><Loader2 className="w-4 h-4 animate-spin inline" /></div>;

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">תוצאות הבדיקות ({results.length})</h3>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-3 p-3 bg-secondary/30 text-xs font-semibold text-muted-foreground border-b border-border">
          <div className="col-span-1">מזהה</div>
          <div className="col-span-4">בדיקה</div>
          <div className="col-span-2">חומרה</div>
          <div className="col-span-2">סטטוס</div>
          <div className="col-span-2">תוצאה</div>
          <div className="col-span-1"></div>
        </div>
        <div className="divide-y divide-border">
          {results.map(r => (
            <div key={r.id}>
              <div
                className="grid grid-cols-12 gap-3 p-3 items-center hover:bg-secondary/20 transition-colors text-xs cursor-pointer"
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
              >
                <div className="col-span-1"><code className="text-primary text-[10px]">{r.check_id}</code></div>
                <div className="col-span-4"><span className="text-foreground">{r.check_title}</span></div>
                <div className="col-span-2"><SeverityBadge severity={r.severity} size="sm" /></div>
                <div className="col-span-2"><StatusBadge status={r.status} size="sm" /></div>
                <div className="col-span-2">
                  <span className={cn(
                    "text-[10px] font-medium",
                    r.status === 'passed' ? 'text-green-400' :
                    r.status === 'failed' ? 'text-red-400' :
                    r.status === 'warning' ? 'text-amber-400' : 'text-blue-400'
                  )}>
                    {r.actual_value?.substring(0, 15) || '—'}
                  </span>
                </div>
                <div className="col-span-1 flex justify-end">
                  <ChevronLeft className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedId === r.id && '-rotate-90')} />
                </div>
              </div>
              {expandedId === r.id && <ReportFindingDetail result={r} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const REPORT_TYPES = [
  { value: 'executive_summary', label: 'דוח מנהלים (Executive Summary)', icon: '📊', desc: 'סיכום ברמה גבוהה לניהול, כולל ציון כולל, סיכונים עיקריים והמלצות מפתח.' },
  { value: 'technical_details', label: 'דוח טכני מפורט', icon: '🔧', desc: 'כל הממצאים עם עדויות מפורטות, הגדרות נוכחיות וצעדי תיקון מפורטים.' },
  { value: 'remediation_plan', label: 'תוכנית תיקון (Remediation Plan)', icon: '📋', desc: 'רשימת תיקונים מתועדפת עם צעדי מעשה, אחראים מומלצים ולוחות זמנים.' },
];

const STATUS_CONFIG = {
  passed: { color: 'text-green-400 bg-green-500/10 border-green-500/30', label: 'עבר' },
  failed: { color: 'text-red-400 bg-red-500/10 border-red-500/30', label: 'נכשל' },
  warning: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', label: 'אזהרה' },
  manual: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', label: 'ידני' },
};

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-400 bg-red-500/10 border-red-500/30', label: 'קריטי' },
  high: { color: 'text-orange-400 bg-orange-500/10 border-orange-500/30', label: 'גבוה' },
  medium: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', label: 'בינוני' },
  low: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', label: 'נמוך' },
};

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedScan, setSelectedScan] = useState('');
  const [selectedType, setSelectedType] = useState('executive_summary');
  const [viewReport, setViewReport] = useState(null);

  const load = async () => {
    const user = await base44.auth.me();
    const [r, s] = await Promise.all([
      base44.entities.Report.filter({ created_by: user.email }, '-created_date', 20),
      base44.entities.ScanJob.filter({ created_by: user.email }, '-created_date', 50),
    ]);
    const completedScans = s.filter(sc => sc.status === 'completed');
    setScans(completedScans);
    const validScanIds = new Set(completedScans.map(sc => sc.id));
    setReports(r.filter(rp => validScanIds.has(rp.scan_job_id)));
    if (completedScans.length > 0) setSelectedScan(completedScans[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async (typeOverride) => {
    const type = typeOverride || selectedType;
    const scan = scans.find(s => s.id === selectedScan);
    if (!scan) return;
    setGenerating(true);
    setShowCreate(false);

    const results = await base44.entities.CheckResult.filter({ scan_job_id: scan.id });
    const failed = results.filter(r => r.status === 'failed');
    const passed = results.filter(r => r.status === 'passed');
    const warnings = results.filter(r => r.status === 'warning');
    const criticals = failed.filter(r => r.severity === 'critical');

    const typeLabel = REPORT_TYPES.find(t => t.value === type)?.label || type;

    const prompt = `אתה מומחה אבטחת מידע ישראלי. צור ${typeLabel} בעברית עבור הערכת אבטחה של Microsoft 365.

נתוני הסריקה:
- טננט: ${scan.tenant_name}
- תאריך: ${new Date(scan.created_date).toLocaleDateString('he-IL')}
- ציון כולל: ${scan.overall_score}/100
- עברו: ${passed.length}, נכשלו: ${failed.length}, אזהרות: ${warnings.length}
- בדיקות קריטיות שנכשלו: ${criticals.map(r => r.check_title).join(', ') || 'אין'}
- כל הכישלונות: ${failed.map(r => `${r.check_id} - ${r.check_title} (${r.severity}): ${r.actual_value}`).join('\n')}

כתוב דוח מקצועי, ברור ותמציתי בעברית. כלול: סיכום מנהלים, ממצאים עיקריים, רמת סיכון כוללת, והמלצות לתיקון לפי עדיפות.`;

    const summary = await base44.integrations.Core.InvokeLLM({ prompt });

    const report = await base44.entities.Report.create({
      workspace_id: scan.workspace_id || 'default',
      scan_job_id: scan.id,
      tenant_id: scan.tenant_id,
      tenant_name: scan.tenant_name,
      report_type: type,
      title: `${typeLabel} - ${scan.tenant_name}`,
      scan_date: scan.created_date,
      overall_score: scan.overall_score,
      benchmark_version: scan.benchmark_version || 'CIS Microsoft 365 v6.0.1',
      summary_he: summary,
      total_findings: results.length,
      passed_count: passed.length,
      failed_count: failed.length,
      findings_by_severity: {
        critical: criticals.length,
        high: failed.filter(r => r.severity === 'high').length,
        medium: failed.filter(r => r.severity === 'medium').length,
        low: failed.filter(r => r.severity === 'low').length,
      },
      status: 'ready',
    });

    setGenerating(false);
    await load();
    setViewReport(report);
  };

  const handleDelete = async (id) => {
    await base44.entities.Report.delete(id);
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const handleExportHtml = async (report) => {
    const results = await base44.entities.CheckResult.filter({ scan_job_id: report.scan_job_id });
    
    const summaryHtml = report.summary_he ? `
    <div class="summary-section">
      <div class="summary-title">סיכום הדוח</div>
      <div class="summary-text">${(report.summary_he || '').replace(/\n/g, '<br>')}</div>
    </div>
    ` : '';

    const resultsHtml = results.map(r => {
      const evidenceHtml = r.evidence ? `<div class="detail-box"><div class="detail-label">עדויות</div><div class="detail-value">${r.evidence?.substring(0, 300) || '—'}</div></div>` : '';
      return `
      <div class="result-item" onclick="document.getElementById('detail-${r.id}').classList.toggle('open')">
        <div class="result-header">
          <div class="result-id">${r.check_id}</div>
          <div class="result-title">${r.check_title}</div>
          <div class="result-domain">${r.domain || '—'}</div>
          <div><span class="badge badge-${r.severity}">${SEVERITY_CONFIG[r.severity]?.label || r.severity}</span></div>
          <div><span class="badge badge-${r.status}">${STATUS_CONFIG[r.status]?.label || r.status}</span></div>
        </div>
        <div id="detail-${r.id}" class="result-detail">
          <div class="detail-grid">
            <div class="detail-box failed"><div class="detail-label">ערך נוכחי</div><div class="detail-value error">${r.actual_value || '—'}</div></div>
            <div class="detail-box passed"><div class="detail-label">ערך מצופה</div><div class="detail-value success">${r.expected_value || '—'}</div></div>
          </div>
          ${evidenceHtml}
        </div>
      </div>
      `;
    }).join('');
    
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Heebo', -apple-system, BlinkMacSystemFont, sans-serif; background: #0f1419; color: #e4e9f1; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    .header { margin-bottom: 50px; }
    .header h1 { font-size: 36px; font-weight: 700; margin-bottom: 15px; background: linear-gradient(135deg, #3d8ff7 0%, #60a5fa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .header-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px; }
    .meta-item { padding: 12px 0; border-bottom: 1px solid #1e293b; }
    .meta-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .meta-value { font-size: 16px; font-weight: 600; color: #e4e9f1; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 50px; }
    .stat-card { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #1e293b; border-radius: 12px; padding: 20px; text-align: center; transition: all 0.3s; }
    .stat-card:hover { border-color: #3d8ff7; transform: translateY(-2px); box-shadow: 0 8px 16px rgba(61, 143, 247, 0.1); }
    .stat-value { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
    .stat-label { font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-section { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #1e293b; border-radius: 12px; padding: 30px; margin-bottom: 40px; line-height: 1.8; }
    .summary-title { font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px; font-weight: 600; }
    .summary-text { font-size: 15px; color: #cbd5e1; }
    .results-section h2 { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: #e4e9f1; }
    .result-item { background: #1e293b; border: 1px solid #1e293b; border-radius: 8px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; }
    .result-item:hover { border-color: #3d8ff7; background: #0f172a; }
    .result-header { display: grid; grid-template-columns: 80px 1fr 120px 120px 100px; gap: 15px; padding: 15px 20px; align-items: center; }
    .result-id { font-family: 'Monaco', 'Courier', monospace; font-size: 12px; color: #3d8ff7; font-weight: 600; }
    .result-title { font-size: 14px; font-weight: 500; color: #e4e9f1; }
    .result-domain { font-size: 12px; color: #94a3b8; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; border: 1px solid; }
    .badge-passed { color: #22c55e; background: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3); }
    .badge-failed { color: #ef4444; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); }
    .badge-warning { color: #f59e0b; background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3); }
    .badge-critical { color: #ef4444; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); }
    .badge-high { color: #f97316; background: rgba(249, 115, 22, 0.1); border-color: rgba(249, 115, 22, 0.3); }
    .badge-medium { color: #eab308; background: rgba(234, 179, 8, 0.1); border-color: rgba(234, 179, 8, 0.3); }
    .badge-low { color: #3b82f6; background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); }
    .result-detail { display: none; padding: 20px; border-top: 1px solid #0f172a; background: #0f172a; }
    .result-detail.open { display: block; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .detail-box { background: #1e293b; border: 1px solid #1e293b; border-radius: 8px; padding: 15px; }
    .detail-box.passed { border-color: rgba(34, 197, 94, 0.3); }
    .detail-box.failed { border-color: rgba(239, 68, 68, 0.3); }
    .detail-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .detail-value { font-family: 'Monaco', 'Courier', monospace; font-size: 12px; color: #cbd5e1; word-break: break-all; }
    .detail-value.success { color: #22c55e; }
    .detail-value.error { color: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${report.title}</h1>
      <div class="header-meta">
        <div class="meta-item"><div class="meta-label">טננט</div><div class="meta-value">${report.tenant_name}</div></div>
        <div class="meta-item"><div class="meta-label">תאריך</div><div class="meta-value">${new Date(report.scan_date).toLocaleDateString('he-IL')}</div></div>
        <div class="meta-item"><div class="meta-label">בנצ'מארק</div><div class="meta-value">${report.benchmark_version}</div></div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value" style="color: #22c55e;">${report.overall_score}</div><div class="stat-label">ציון כללי</div></div>
      <div class="stat-card"><div class="stat-value" style="color: #22c55e;">${report.passed_count || 0}</div><div class="stat-label">עברו</div></div>
      <div class="stat-card"><div class="stat-value" style="color: #ef4444;">${report.failed_count || 0}</div><div class="stat-label">נכשלו</div></div>
      <div class="stat-card"><div class="stat-value" style="color: #ef4444;">${report.findings_by_severity?.critical || 0}</div><div class="stat-label">קריטיים</div></div>
    </div>

    ${summaryHtml}

    <div class="results-section">
      <h2>פרטי הבדיקות</h2>
      ${resultsHtml}
    </div>
  </div>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const items = document.querySelectorAll('.result-item');
      items.forEach(item => {
        item.style.cursor = 'pointer';
      });
    });
  </script>
</body>
</html>
    `.trim();
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title || 'report'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">דוחות</h1>
          <p className="text-sm text-muted-foreground mt-1">צפייה ויצוא דוחות הערכת אבטחה</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)} disabled={scans.length === 0}>
          <Plus className="w-4 h-4" />
          צור דוח חדש
        </Button>
      </div>

      {generating && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
          <span className="text-sm text-primary">מייצר דוח באמצעות AI... זה עשוי לקחת כ-30 שניות</span>
        </div>
      )}

      {scans.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">אין סריקות מושלמות — הפעל סריקה קודם כדי ליצור דוחות</p>
        </div>
      )}

      {reports.length > 0 && (
        <div className="space-y-4">
          {reports.map(report => (
            <div key={report.id} className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-all">
              <div className="flex items-start gap-6">
                <ScoreRing score={report.overall_score || 0} size={90} strokeWidth={6} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-bold text-foreground">{report.title}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium border bg-green-500/10 text-green-400 border-green-500/30">
                      מוכן
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {REPORT_TYPES.find(t => t.value === report.report_type)?.icon} {REPORT_TYPES.find(t => t.value === report.report_type)?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {report.scan_date ? new Date(report.scan_date).toLocaleDateString('he-IL') : ''}
                    </span>
                    <span>{report.benchmark_version}</span>
                    <span>{report.tenant_name}</span>
                  </div>
                  {report.summary_he && (
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{report.summary_he}</p>
                  )}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-6">
                      <div><div className="text-[10px] text-muted-foreground">סה"כ</div><div className="text-sm font-bold text-foreground">{report.total_findings || 0}</div></div>
                      <div><div className="text-[10px] text-muted-foreground">עברו</div><div className="text-sm font-bold text-green-400">{report.passed_count || 0}</div></div>
                      <div><div className="text-[10px] text-muted-foreground">נכשלו</div><div className="text-sm font-bold text-red-400">{report.failed_count || 0}</div></div>
                      <div><div className="text-[10px] text-muted-foreground">קריטיים</div><div className="text-sm font-bold text-red-400">{report.findings_by_severity?.critical || 0}</div></div>
                    </div>
                    <div className="mr-auto flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setViewReport(report)}>
                        <Eye className="w-3.5 h-3.5" />צפייה
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleExportHtml(report)}>
                        <Download className="w-3.5 h-3.5" />ייצא דוח
                      </Button>
                      <button onClick={() => handleDelete(report.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {scans.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">תבניות דוח זמינות</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {REPORT_TYPES.map(tpl => (
              <button
                key={tpl.value}
                onClick={() => { setSelectedType(tpl.value); setShowCreate(true); }}
                disabled={generating}
                className="p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-right"
              >
                <div className="text-2xl mb-2">{tpl.icon}</div>
                <h4 className="text-xs font-semibold text-foreground mb-1">{tpl.label}</h4>
                <p className="text-[10px] text-muted-foreground">{tpl.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>צור דוח חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">סריקה</label>
              <Select value={selectedScan} onValueChange={setSelectedScan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {scans.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.tenant_name} — {new Date(s.created_date).toLocaleDateString('he-IL')} (ציון: {s.overall_score})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">סוג דוח</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full gap-2" onClick={() => handleGenerate()} disabled={!selectedScan || generating}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              צור דוח
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {viewReport && (
        <Dialog open={!!viewReport} onOpenChange={() => setViewReport(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex-1">
                  <DialogTitle className="text-xl">{viewReport.title}</DialogTitle>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <span>{viewReport.tenant_name}</span>
                    <span>•</span>
                    <span>{viewReport.scan_date ? new Date(viewReport.scan_date).toLocaleDateString('he-IL') : ''}</span>
                    <span>•</span>
                    <span>{viewReport.benchmark_version}</span>
                  </div>
                </div>
                <ScoreRing score={viewReport.overall_score || 0} size={100} />
              </div>
            </DialogHeader>
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-secondary/30 rounded-lg p-4 border border-border text-center">
                  <div className="text-2xl font-bold text-green-400">{viewReport.passed_count || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">עברו</div>
                </div>
                <div className="bg-secondary/30 rounded-lg p-4 border border-border text-center">
                  <div className="text-2xl font-bold text-red-400">{viewReport.failed_count || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">נכשלו</div>
                </div>
                <div className="bg-secondary/30 rounded-lg p-4 border border-border text-center">
                  <div className="text-2xl font-bold text-red-400">{viewReport.findings_by_severity?.critical || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">קריטיים</div>
                </div>
                <div className="bg-secondary/30 rounded-lg p-4 border border-border text-center">
                  <div className="text-2xl font-bold text-foreground">{viewReport.total_findings || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">סה"כ בדיקות</div>
                </div>
              </div>

              {viewReport.summary_he && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">סיכום הדוח</h3>
                  <ReportSummary summary={viewReport.summary_he} />
                </div>
              )}

              {viewReport.scan_job_id && (
                <ReportResultsTable scanJobId={viewReport.scan_job_id} />
              )}

              <div className="flex gap-2 pt-4 border-t border-border">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExportHtml(viewReport)}>
                  <Download className="w-4 h-4" />ייצא דוח
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}