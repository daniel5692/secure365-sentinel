import { useState, useEffect } from "react";
import { FileText, Download, Eye, Calendar, Plus, Loader2, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import ScoreRing from "@/components/shared/ScoreRing";
import { base44 } from "@/api/base44Client";

const REPORT_TYPES = [
  { value: 'executive_summary', label: 'דוח מנהלים (Executive Summary)', icon: '📊', desc: 'סיכום ברמה גבוהה לניהול, כולל ציון כולל, סיכונים עיקריים והמלצות מפתח.' },
  { value: 'technical_details', label: 'דוח טכני מפורט', icon: '🔧', desc: 'כל הממצאים עם עדויות מפורטות, הגדרות נוכחיות וצעדי תיקון מפורטים.' },
  { value: 'remediation_plan', label: 'תוכנית תיקון (Remediation Plan)', icon: '📋', desc: 'רשימת תיקונים מתועדפת עם צעדי מעשה, אחראים מומלצים ולוחות זמנים.' },
];

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
    const [r, s] = await Promise.all([
      base44.entities.Report.list('-created_date', 20),
      base44.entities.ScanJob.list('-created_date', 50),
    ]);
    const completedScans = s.filter(sc => sc.status === 'completed');
    setScans(completedScans);
    // Only show reports for scans that still exist
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

    // Fetch check results for this scan
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

  const handleExportPdf = async (report) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(report.title || 'דוח אבטחה', 20, 20);
    doc.setFontSize(10);
    doc.text(`תאריך: ${report.scan_date ? new Date(report.scan_date).toLocaleDateString('he-IL') : ''}`, 20, 32);
    doc.text(`ציון: ${report.overall_score || 0}/100`, 20, 40);
    doc.text(`עברו: ${report.passed_count || 0}  נכשלו: ${report.failed_count || 0}  קריטיים: ${report.findings_by_severity?.critical || 0}`, 20, 48);
    if (report.summary_he) {
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(report.summary_he, 170);
      doc.text(lines, 20, 60);
    }
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

      {/* Templates */}
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

      {/* Create Dialog */}
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

      {/* View Report Dialog */}
      {viewReport && (
        <Dialog open={!!viewReport} onOpenChange={() => setViewReport(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{viewReport.title}</DialogTitle>
            </DialogHeader>
            <div className="mt-2 space-y-4">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{viewReport.tenant_name}</span>
                <span>{viewReport.scan_date ? new Date(viewReport.scan_date).toLocaleDateString('he-IL') : ''}</span>
                <span>ציון: {viewReport.overall_score}/100</span>
              </div>
              <div className="prose prose-sm prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed font-heebo bg-secondary/20 rounded-lg p-4">
                  {viewReport.summary_he}
                </pre>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExportPdf(viewReport)}>
                  <Download className="w-4 h-4" />ייצא PDF
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}