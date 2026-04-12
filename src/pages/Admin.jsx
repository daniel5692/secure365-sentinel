import { useState, useEffect } from "react";
import { Building2, Users, Server, Scan, FileText, Activity, Shield, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import moment from "moment";

const ACTION_ICONS = {
  scan_completed: { icon: Scan, cls: 'text-green-400 bg-green-500/10' },
  scan_started: { icon: Scan, cls: 'text-blue-400 bg-blue-500/10' },
  scan_failed: { icon: AlertTriangle, cls: 'text-red-400 bg-red-500/10' },
  tenant_connected: { icon: Server, cls: 'text-purple-400 bg-purple-500/10' },
  tenant_disconnected: { icon: Server, cls: 'text-slate-400 bg-slate-500/10' },
  report_generated: { icon: FileText, cls: 'text-cyan-400 bg-cyan-500/10' },
  report_exported: { icon: FileText, cls: 'text-cyan-400 bg-cyan-500/10' },
  settings_changed: { icon: Shield, cls: 'text-amber-400 bg-amber-500/10' },
  member_added: { icon: Users, cls: 'text-blue-400 bg-blue-500/10' },
  login: { icon: Activity, cls: 'text-slate-400 bg-slate-500/10' },
  workspace_created: { icon: Building2, cls: 'text-primary bg-primary/10' },
};

export default function Admin() {
  const [stats, setStats] = useState({ tenants: 0, scans: 0, reports: 0, workspaces: 0 });
  const [auditLogs, setAuditLogs] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.ConnectedTenant.list('-created_date', 50),
      base44.entities.ScanJob.list('-created_date', 100),
      base44.entities.Report.list('-created_date', 50),
      base44.entities.AuditLog.list('-created_date', 30),
      base44.entities.Workspace.list('-created_date', 50),
    ]).then(([t, s, r, a, w]) => {
      setTenants(t);
      setWorkspaces(w);
      setAuditLogs(a);
      const thisMonth = new Date();
      thisMonth.setDate(1);
      setStats({
        tenants: t.length,
        scans: s.length,
        reports: r.length,
        workspaces: w.length,
        scansThisMonth: s.filter(sc => new Date(sc.created_date) >= thisMonth).length,
        completedScans: s.filter(sc => sc.status === 'completed').length,
      });
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ניהול פלטפורמה</h1>
        <p className="text-sm text-muted-foreground mt-1">ניהול ופיקוח על הפלטפורמה (Platform Admin)</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="סביבות עבודה" value={stats.workspaces} icon={Building2} variant="info" />
        <StatCard title="טננטים" value={stats.tenants} icon={Server} variant="info" />
        <StatCard title="סריקות (סה״כ)" value={stats.scans} icon={Scan} />
        <StatCard title="סריקות מושלמות" value={stats.completedScans} icon={Scan} variant="success" />
        <StatCard title="דוחות" value={stats.reports} icon={FileText} />
        <StatCard title="סריקות החודש" value={stats.scansThisMonth} icon={Activity} variant="warning" />
      </div>

      <Tabs defaultValue="audit" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="audit">יומן ביקורת</TabsTrigger>
          <TabsTrigger value="workspaces">סביבות עבודה</TabsTrigger>
          <TabsTrigger value="tenants">טננטים</TabsTrigger>
          <TabsTrigger value="checks">מנוע בדיקות</TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">יומן פעולות אחרון</h3>
            </div>
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">אין רשומות ביומן עדיין</div>
            ) : (
              <div className="divide-y divide-border">
                {auditLogs.map(log => {
                  const cfg = ACTION_ICONS[log.action] || ACTION_ICONS.login;
                  const Icon = cfg.icon;
                  return (
                    <div key={log.id} className="flex items-center gap-4 p-4 hover:bg-secondary/20 transition-colors">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", cfg.cls)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground">{log.details}</div>
                        <div className="text-[10px] text-muted-foreground">{log.user_email}</div>
                      </div>
                      <div className="text-[10px] text-muted-foreground flex-shrink-0">
                        {moment(log.created_date).format('DD/MM/YYYY HH:mm')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="workspaces">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">סביבות עבודה פעילות</h3>
            {workspaces.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">אין סביבות עבודה</p>
            ) : (
              <div className="space-y-3">
                {workspaces.map(ws => (
                  <div key={ws.id} className="flex items-center gap-4 p-4 rounded-lg bg-secondary/20">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{ws.name}</div>
                      <div className="text-xs text-muted-foreground">{ws.plan || 'trial'} • {ws.owner_email}</div>
                    </div>
                    <span className={cn("px-2.5 py-1 rounded text-xs font-medium border",
                      ws.status === 'active' ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                    )}>{ws.status === 'active' ? 'פעיל' : ws.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tenants">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">טננטים מחוברים</h3>
            {tenants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">אין טננטים מחוברים</p>
            ) : (
              <div className="space-y-3">
                {tenants.map(t => (
                  <div key={t.id} className="flex items-center gap-4 p-4 rounded-lg bg-secondary/20">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Server className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{t.tenant_name}</div>
                      <div className="text-xs text-muted-foreground">{t.domain || t.tenant_id}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {t.last_scan_score != null && (
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                          t.last_scan_score >= 80 ? "bg-green-500/10 text-green-400" :
                          t.last_scan_score >= 60 ? "bg-amber-500/10 text-amber-400" :
                          "bg-red-500/10 text-red-400"
                        )}>{t.last_scan_score}</div>
                      )}
                      <span className={cn("px-2 py-0.5 rounded text-[10px] border",
                        t.connection_status === 'connected' ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                      )}>{t.connection_status === 'connected' ? 'מחובר' : t.connection_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="checks">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">מנוע בדיקות</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="text-xs text-muted-foreground mb-1">Benchmark נוכחי</div>
                <div className="text-sm font-medium text-foreground">CIS Microsoft 365 Foundations v6.0.1</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="text-xs text-muted-foreground mb-1">סה"כ בדיקות</div>
                <div className="text-sm font-medium text-foreground">37 בדיקות</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="text-xs text-muted-foreground mb-1">בדיקות אוטומטיות</div>
                <div className="text-sm font-medium text-foreground">37</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="text-xs text-muted-foreground mb-1">תחומים מכוסים</div>
                <div className="text-sm font-medium text-foreground">7 תחומים</div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}