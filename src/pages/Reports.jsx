import { FileText, Download, Eye, Calendar, Shield, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_REPORTS, DEMO_SCANS } from "@/lib/demoData";
import { cn } from "@/lib/utils";
import ScoreRing from "@/components/shared/ScoreRing";

export default function Reports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">דוחות</h1>
          <p className="text-sm text-muted-foreground mt-1">צפייה ויצוא דוחות הערכת אבטחה</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          צור דוח חדש
        </Button>
      </div>

      {/* Report List */}
      <div className="space-y-4">
        {DEMO_REPORTS.map(report => (
          <div key={report.id} className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-all">
            <div className="flex items-start gap-6">
              <ScoreRing score={report.overall_score} size={90} strokeWidth={6} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-base font-bold text-foreground">{report.title}</h3>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium border",
                    report.status === 'ready' 
                      ? "bg-green-500/10 text-green-400 border-green-500/30" 
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  )}>
                    {report.status === 'ready' ? 'מוכן' : 'בהכנה'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(report.scan_date).toLocaleDateString('he-IL')}</span>
                  <span>{report.benchmark_version}</span>
                  <span>{report.tenant_name}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{report.summary_he}</p>

                {/* Findings Summary */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-[10px] text-muted-foreground">סה"כ ממצאים</div>
                      <div className="text-sm font-bold text-foreground">{report.total_findings}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">עברו</div>
                      <div className="text-sm font-bold text-green-400">{report.passed_count}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">נכשלו</div>
                      <div className="text-sm font-bold text-red-400">{report.failed_count}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">קריטיים</div>
                      <div className="text-sm font-bold text-red-400">{report.findings_by_severity?.critical || 0}</div>
                    </div>
                  </div>
                  <div className="mr-auto flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <Eye className="w-3.5 h-3.5" />
                      צפייה
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Report Templates */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">תבניות דוח זמינות</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'דוח מנהלים (Executive Summary)', desc: 'סיכום ברמה גבוהה לניהול, כולל ציון כולל, סיכונים עיקריים והמלצות מפתח.', icon: '📊' },
            { title: 'דוח טכני מפורט', desc: 'כל הממצאים עם עדויות מפורטות, הגדרות נוכחיות וצעדי תיקון מפורטים.', icon: '🔧' },
            { title: 'תוכנית תיקון (Remediation Plan)', desc: 'רשימת תיקונים מתועדפת עם צעדי מעשה, אחראים מומלצים ולוחות זמנים.', icon: '📋' },
          ].map(tpl => (
            <div key={tpl.title} className="p-4 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer">
              <div className="text-2xl mb-2">{tpl.icon}</div>
              <h4 className="text-xs font-semibold text-foreground mb-1">{tpl.title}</h4>
              <p className="text-[10px] text-muted-foreground">{tpl.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}