import { Scan, Play, Clock, CheckCircle2, XCircle, Loader2, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_SCANS, DEMO_TENANTS } from "@/lib/demoData";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import moment from "moment";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, label: 'הושלם', cls: 'text-green-400 bg-green-500/10 border-green-500/30' },
  running: { icon: Loader2, label: 'בביצוע', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  failed: { icon: XCircle, label: 'נכשל', cls: 'text-red-400 bg-red-500/10 border-red-500/30' },
  queued: { icon: Clock, label: 'בתור', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
  cancelled: { icon: XCircle, label: 'בוטל', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
};

export default function Scans() {
  const [selectedTenant, setSelectedTenant] = useState('all');
  const connectedTenants = DEMO_TENANTS.filter(t => t.connection_status === 'connected');
  
  const filteredScans = selectedTenant === 'all' 
    ? DEMO_SCANS 
    : DEMO_SCANS.filter(s => s.tenant_id === selectedTenant);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">מרכז סריקות</h1>
          <p className="text-sm text-muted-foreground mt-1">ניהול והפעלת סריקות אבטחה</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedTenant} onValueChange={setSelectedTenant}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="כל הטננטים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הטננטים</SelectItem>
              {connectedTenants.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.tenant_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="gap-2">
            <Play className="w-4 h-4" />
            סריקה חדשה
          </Button>
        </div>
      </div>

      {/* New Scan Panel */}
      <div className="bg-card border border-primary/20 rounded-xl p-5 glow-blue">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Scan className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">הפעלת סריקת אבטחה חדשה</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              בחר טננט והפעל סריקה מבוססת CIS Microsoft 365 Benchmark v3.1.0
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select defaultValue={connectedTenants[0]?.id}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {connectedTenants.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.tenant_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="gap-2">
              <Play className="w-4 h-4" />
              הפעל
            </Button>
          </div>
        </div>
      </div>

      {/* Scans List */}
      <div className="space-y-3">
        {filteredScans.map(scan => {
          const cfg = STATUS_CONFIG[scan.status];
          const Icon = cfg.icon;
          const duration = scan.started_at && scan.completed_at 
            ? moment(scan.completed_at).diff(moment(scan.started_at), 'minutes')
            : null;

          return (
            <Link key={scan.id} to={`/findings?scan=${scan.id}`} className="block">
              <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Server className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-semibold text-foreground">{scan.tenant_name}</h3>
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium", cfg.cls)}>
                        <Icon className={cn("w-3 h-3", scan.status === 'running' && "animate-spin")} />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{moment(scan.started_at).format('DD/MM/YYYY HH:mm')}</span>
                      <span>{scan.benchmark_version}</span>
                      {duration != null && <span>{duration} דקות</span>}
                      <span>{scan.total_checks} בדיקות</span>
                    </div>
                    {scan.status === 'running' && (
                      <Progress value={scan.progress} className="mt-2 h-1.5" />
                    )}
                  </div>
                  <div className="flex items-center gap-6">
                    {scan.summary && (
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <div className="text-sm font-bold text-green-400">{scan.summary.passed}</div>
                          <div className="text-[10px] text-muted-foreground">עבר</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-red-400">{scan.summary.failed}</div>
                          <div className="text-[10px] text-muted-foreground">נכשל</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-amber-400">{scan.summary.warning}</div>
                          <div className="text-[10px] text-muted-foreground">אזהרה</div>
                        </div>
                      </div>
                    )}
                    {scan.overall_score != null && (
                      <div className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold",
                        scan.overall_score >= 80 ? "bg-green-500/10 text-green-400" :
                        scan.overall_score >= 60 ? "bg-amber-500/10 text-amber-400" :
                        "bg-red-500/10 text-red-400"
                      )}>
                        {scan.overall_score}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}