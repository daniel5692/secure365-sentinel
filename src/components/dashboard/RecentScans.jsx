import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, label: 'הושלם', cls: 'text-green-400' },
  running: { icon: Loader2, label: 'בביצוע', cls: 'text-blue-400 animate-spin' },
  failed: { icon: XCircle, label: 'נכשל', cls: 'text-red-400' },
  queued: { icon: Clock, label: 'בתור', cls: 'text-muted-foreground' },
};

export default function RecentScans({ scans = [] }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">סריקות אחרונות</h3>
      {scans.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">אין סריקות עדיין — הפעל סריקה ראשונה</p>
      ) : (
        <div className="space-y-3">
          {scans.slice(0, 5).map(scan => {
            const cfg = STATUS_CONFIG[scan.status] || STATUS_CONFIG.queued;
            const Icon = cfg.icon;
            return (
              <div key={scan.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors">
                <Icon className={cn("w-4 h-4 flex-shrink-0", cfg.cls)} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{scan.tenant_name}</div>
                  <div className="text-[10px] text-muted-foreground">{moment(scan.created_date).format('DD/MM/YYYY HH:mm')}</div>
                </div>
                <div className="flex flex-col items-end">
                  {scan.overall_score != null && (
                    <span className={cn("text-sm font-bold",
                      scan.overall_score >= 80 ? "text-green-400" :
                      scan.overall_score >= 60 ? "text-amber-400" : "text-red-400"
                    )}>
                      {scan.overall_score}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}