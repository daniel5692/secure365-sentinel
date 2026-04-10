import { Scan, Play, Clock, CheckCircle2, XCircle, Loader2, Server, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import moment from "moment";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, label: 'הושלם', cls: 'text-green-400 bg-green-500/10 border-green-500/30' },
  running: { icon: Loader2, label: 'בביצוע', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  failed: { icon: XCircle, label: 'נכשל', cls: 'text-red-400 bg-red-500/10 border-red-500/30' },
  queued: { icon: Clock, label: 'בתור', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
  cancelled: { icon: XCircle, label: 'בוטל', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
};

export default function Scans() {
  const { user } = useAuth();
  const [scans, setScans] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState('all');
  const [scanTenant, setScanTenant] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.ScanJob.list('-created_date', 50),
      base44.entities.ConnectedTenant.list(),
    ]).then(([s, t]) => {
      setScans(s);
      setTenants(t);
      if (t.length > 0) setScanTenant(t[0].id);
      setLoading(false);
    });
  }, []);

  const connectedTenants = tenants.filter(t => t.connection_status === 'connected');

  const handleStartScan = async () => {
    const tenant = tenants.find(t => t.id === scanTenant);
    if (!tenant) return;
    setStarting(true);
    // Create scan job
    const scan = await base44.entities.ScanJob.create({
      workspace_id: user?.id || 'default',
      tenant_id: tenant.id,
      tenant_name: tenant.tenant_name,
      status: 'queued',
      progress: 0,
      total_checks: 0,
      completed_checks: 0,
      benchmark_version: 'CIS Microsoft 365 v3.1.0',
      framework: 'cis_m365',
    });
    // Run the scan (async - don't await, refresh list)
    base44.functions.invoke('runScan', {
      scan_job_id: scan.id,
      tenant_record_id: tenant.id,
      customer_tenant_id: tenant.tenant_id,
      workspace_id: user?.id || 'default',
    });
    // Refresh list immediately to show queued, then again after a moment
    const updated = await base44.entities.ScanJob.list('-created_date', 50);
    setScans(updated);
    setStarting(false);
    // Poll for updates
    setTimeout(async () => {
      const r = await base44.entities.ScanJob.list('-created_date', 50);
      setScans(r);
    }, 5000);
  };

  const filteredScans = selectedTenant === 'all'
    ? scans
    : scans.filter(s => s.tenant_id === selectedTenant);

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
          <h1 className="text-2xl font-bold text-foreground">מרכז סריקות</h1>
          <p className="text-sm text-muted-foreground mt-1">ניהול והפעלת סריקות אבטחה</p>
        </div>
        <Select value={selectedTenant} onValueChange={setSelectedTenant}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="כל הטננטים" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הטננטים</SelectItem>
            {tenants.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.tenant_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* New Scan Panel */}
      {connectedTenants.length > 0 ? (
        <div className="bg-card border border-primary/20 rounded-xl p-5 glow-blue">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Scan className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">הפעלת סריקת אבטחה חדשה</h3>
              <p className="text-xs text-muted-foreground mt-0.5">בחר טננט והפעל סריקה מבוססת CIS Microsoft 365 Benchmark v3.1.0</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={scanTenant} onValueChange={setScanTenant}>
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {connectedTenants.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.tenant_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="gap-2" onClick={handleStartScan} disabled={starting}>
                <Play className="w-4 h-4" />
                {starting ? 'מפעיל...' : 'הפעל'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">אין טננטים מחוברים. חבר טננט קודם כדי להפעיל סריקה.</p>
          <Link to="/tenants">
            <Button variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              חבר טננט
            </Button>
          </Link>
        </div>
      )}

      {/* Scans List */}
      {filteredScans.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">אין סריקות עדיין. הפעל סריקה ראשונה למעלה.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredScans.map(scan => {
            const cfg = STATUS_CONFIG[scan.status] || STATUS_CONFIG.queued;
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
                        <span>{moment(scan.created_date).format('DD/MM/YYYY HH:mm')}</span>
                        {scan.benchmark_version && <span>{scan.benchmark_version}</span>}
                        {duration != null && <span>{duration} דקות</span>}
                        {scan.total_checks > 0 && <span>{scan.total_checks} בדיקות</span>}
                      </div>
                      {scan.status === 'running' && (
                        <Progress value={scan.progress} className="mt-2 h-1.5" />
                      )}
                    </div>
                    <div className="flex items-center gap-6">
                      {scan.summary && (
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <div className="text-sm font-bold text-green-400">{scan.summary.passed || 0}</div>
                            <div className="text-[10px] text-muted-foreground">עבר</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-bold text-red-400">{scan.summary.failed || 0}</div>
                            <div className="text-[10px] text-muted-foreground">נכשל</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-bold text-amber-400">{scan.summary.warning || 0}</div>
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
      )}
    </div>
  );
}