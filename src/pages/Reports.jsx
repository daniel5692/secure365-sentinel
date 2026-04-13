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
    
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    body { font-family: 'Heebo', sans-serif; background: #0f1419; color: #e4e9f1; line-height: 1.6; margin: 0; padding: 20px; }
    .container { max-width: 1000px; margin: 0 auto; }
    .header { border-bottom: 2px solid #3d8ff7; padding-bottom: 20px; margin-bottom: 30px; }
    h1 { margin: 0; font-size: 28px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 15px; font-size: 13px; color: #9ca3af; }
    .meta div { display: flex; justify-content: space-between; }
    .score-section { display: flex; align-items: center; gap: 30px; margin-bottom: 40px; padding: 20px; background: #1a2332; border: 1px solid #364455; border-radius: 8px; }
    .score-ring { text-align: center; }
    .score-value { font-size: 48px; font-weight: bold; color: #3d8ff7; }
    .score-label { font-size: 12px; color: #9ca3af; margin-top: 5px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
    .stat { background: #1a2332; border: 1px solid #364455; border-radius: 8px; padding: 15px; text-align: center; }
    .stat-value { font-size: 20px; font-weight: bold; }
    .stat-label { font-size: 11px; color: #9ca3af; margin-top: 5px; }
    .results-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .results-table thead { background: #1a2332; border-bottom: 2px solid #364455; }
    .results-table th { padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #9ca3af; }
    .results-table td { padding: 12px; border-bottom: 1px solid #364455; font-size: 12px; }
    .results-table tr:hover { background: #242f3d; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; border: 1px solid; }
    .badge-passed { color: #22c55e; background: #16a34a20; border-color: #16a34a; }
    .badge-failed { color: #ef4444; background: #dc262620; border-color: #dc2626; }
    .badge-warning { color: #f59e0b; background: #d9710020; border-color: #d97100; }
    .badge-critical { color: #ef4444; background: #dc262620; border-color: #dc2626; }
    .badge-high { color: #f97316; background: #ea580c20; border-color: #ea580c; }
    .badge-medium { color: #eab308; background: #ca8a0420; border-color: #ca8a04; }
    .badge-low { color: #3b82f6; background: #1d4ed820; border-color: #1d4ed8; }
    .section { margin-top: 40px; }
    .section-title { font-size: 18px; font-weight: 600; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #364455; }
    .summary { background: #1a2332; padding: 20px; border-radius: 8px; border: 1px solid #364455; line-height: 1.8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${report.title}</h1>
      <div class="meta">
        <div><span>טננט:</span><strong>${report.tenant_name}</strong></div>
        <div><span>תאריך סריקה:</span><strong>${new Date(report.scan_date).toLocaleDateString('he-IL')}</strong></div>
        <div><span>גרסה:</span><strong>${report.benchmark_version}</strong></div>
      </div>
    </div>
    
    <div class="score-section">
      <div class="score-ring">
        <div class="score-value">${report.overall_score}</div>
        <div class="score-label">ציון כללי</div>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-value" style="color: #22c55e;">${report.passed_count || 0}</div><div class="stat-label">עברו</div></div>
        <div class="stat"><div class="stat-value" style="color: #ef4444;">${report.failed_count || 0}</div><div class="stat-label">נכשלו</div></div>
        <div class="stat"><div class="stat-value" style="color: #ef4444;">${report.findings_by_severity?.critical || 0}</div><div class="stat-label">קריטיים</div></div>
        <div class="stat"><div class="stat-value">${report.total_findings || 0}</div><div class="stat-label">סה"כ בדיקות</div></div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">סיכום הדוח</div>
      <div class="summary">${(report.summary_he || '').replace(/\n/g, '<br>')}</div>
    </div>
    
    <div class="section">
      <div class="section-title">תוצאות הבדיקות</div>
      <table class="results-table">
        <thead><tr><th>מזהה</th><th>בדיקה</th><th>תחום</th><th>חומרה</th><th>סטטוס</th></tr></thead>
        <tbody>
          ${results.map(r => `
          <tr>
            <td><code>${r.check_id}</code></td>
            <td>${r.check_title}</td>
            <td>${r.domain}</td>
            <td><span class="badge badge-${r.severity}">${SEVERITY_CONFIG[r.severity]?.label || r.severity}</span></td>
            <td><span class="badge badge-${r.status}">${STATUS_CONFIG[r.status]?.label || r.status}</span></td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
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

  const handleExportPdf = async (report) => {
    const { jsPDF } = await import('jspdf');
    const results = await base44.entities.CheckResult.filter({ scan_job_id: report.scan_job_id });
    const doc = new jsPDF({ compress: true });
    
    doc.setFont('Heebo');
    doc.setFontSize(18);
    doc.text(report.title || 'דוח אבטחה', 20, 15, { align: 'right' });
    
    doc.setFontSize(10);
    let y = 25;
    const metadata = [
      `טננט: ${report.tenant_name}`,
      `תאריך: ${report.scan_date ? new Date(report.scan_date).toLocaleDateString('he-IL') : ''}`,
      `ציון כללי: ${report.overall_score}/100`,
      `בנצ'מארק: ${report.benchmark_version}`,
    ];
    
    metadata.forEach(text => {
      doc.text(text, 20, y, { align: 'right' });
      y += 5;
    });
    
    y += 5;
    doc.setFontSize(12);
    doc.text('סטטיסטיקה', 20, y, { align: 'right' });
    y += 8;
    
    doc.setFontSize(9);
    const stats = `עברו: ${report.passed_count || 0} | נכשלו: ${report.failed_count || 0} | קריטיים: ${report.findings_by_severity?.critical || 0} | סה"כ: ${report.total_findings || 0}`;
    doc.text(stats, 20, y, { align: 'right' });
    
    y += 10;
    doc.setFontSize(12);
    doc.text('סיכום', 20, y, { align: 'right' });
    y += 8;
    
    if (report.summary_he) {
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(report.summary_he, 170);
      doc.text(lines, 20, y, { align: 'right', maxWidth: 170 });
      y += lines.length * 4 + 5;
    }
    
    if (y > 250) {
      doc.addPage();
      y = 15;
    }
    
    doc.setFontSize(12);
    doc.text('תוצאות הבדיקות', 20, y, { align: 'right' });
    y += 8;
    
    doc.setFontSize(8);
    results.slice(0, 50).forEach(r => {
      if (y > 270) { doc.addPage(); y = 15; }
      const text = `${r.check_id} | ${r.check_title.substring(0, 30)} | ${r.status}`;
      doc.text(text, 20, y, { align: 'right', maxWidth: 170 });
      y += 4;
    });
    
    doc.save(`${report.title || 'report'}.pdf`);
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
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleExportPdf(report)}>
                        <Download className="w-3.5 h-3.5" />PDF
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleExportHtml(report)}>
                        <Download className="w-3.5 h-3.5" />HTML
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
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExportPdf(viewReport)}>
                  <Download className="w-4 h-4" />ייצא PDF
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExportHtml(viewReport)}>
                  <Download className="w-4 h-4" />ייצא HTML
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}