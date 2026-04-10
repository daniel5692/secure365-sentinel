import { Building2, Users, Server, Scan, FileText, Activity, Shield, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/utils";

const DEMO_PLATFORM_STATS = {
  totalWorkspaces: 47,
  totalTenants: 89,
  totalScans: 312,
  totalReports: 156,
  activeUsers: 134,
  scanThisMonth: 45,
};

const DEMO_AUDIT_LOGS = [
  { id: 1, action: 'scan_completed', user: 'admin@acme-tech.co.il', details: 'סריקה הושלמה - Acme Technologies Production', time: '2025-04-08 10:12' },
  { id: 2, action: 'tenant_connected', user: 'admin@acme-tech.co.il', details: 'טננט חדש מחובר - Acme Subsidiary Corp', time: '2025-04-07 15:30' },
  { id: 3, action: 'report_generated', user: 'security@acme-tech.co.il', details: 'דוח נוצר - דוח הערכת אבטחה', time: '2025-04-08 10:15' },
  { id: 4, action: 'settings_changed', user: 'admin@acme-tech.co.il', details: 'הגדרות התראות עודכנו', time: '2025-04-06 09:22' },
  { id: 5, action: 'scan_started', user: 'admin@acme-tech.co.il', details: 'סריקה התחילה - Acme Technologies Dev/Test', time: '2025-04-05 09:00' },
  { id: 6, action: 'member_added', user: 'admin@acme-tech.co.il', details: 'חבר צוות חדש הוזמן - security@acme-tech.co.il', time: '2025-04-02 11:45' },
  { id: 7, action: 'login', user: 'admin@acme-tech.co.il', details: 'כניסה מוצלחת', time: '2025-04-08 09:55' },
];

const ACTION_ICONS = {
  scan_completed: { icon: Scan, cls: 'text-green-400 bg-green-500/10' },
  scan_started: { icon: Scan, cls: 'text-blue-400 bg-blue-500/10' },
  tenant_connected: { icon: Server, cls: 'text-purple-400 bg-purple-500/10' },
  report_generated: { icon: FileText, cls: 'text-cyan-400 bg-cyan-500/10' },
  settings_changed: { icon: Shield, cls: 'text-amber-400 bg-amber-500/10' },
  member_added: { icon: Users, cls: 'text-blue-400 bg-blue-500/10' },
  login: { icon: Activity, cls: 'text-slate-400 bg-slate-500/10' },
};

export default function Admin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ניהול פלטפורמה</h1>
        <p className="text-sm text-muted-foreground mt-1">ניהול ופיקוח על הפלטפורמה (Platform Admin)</p>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="סביבות עבודה" value={DEMO_PLATFORM_STATS.totalWorkspaces} icon={Building2} variant="info" />
        <StatCard title="טננטים" value={DEMO_PLATFORM_STATS.totalTenants} icon={Server} variant="info" />
        <StatCard title="סריקות (סה״כ)" value={DEMO_PLATFORM_STATS.totalScans} icon={Scan} />
        <StatCard title="דוחות" value={DEMO_PLATFORM_STATS.totalReports} icon={FileText} />
        <StatCard title="משתמשים פעילים" value={DEMO_PLATFORM_STATS.activeUsers} icon={Users} variant="success" />
        <StatCard title="סריקות החודש" value={DEMO_PLATFORM_STATS.scanThisMonth} icon={Activity} variant="warning" />
      </div>

      <Tabs defaultValue="audit" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="audit">יומן ביקורת</TabsTrigger>
          <TabsTrigger value="workspaces">סביבות עבודה</TabsTrigger>
          <TabsTrigger value="checks">בדיקות מערכת</TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">יומן פעולות אחרון</h3>
            </div>
            <div className="divide-y divide-border">
              {DEMO_AUDIT_LOGS.map(log => {
                const cfg = ACTION_ICONS[log.action] || ACTION_ICONS.login;
                const Icon = cfg.icon;
                return (
                  <div key={log.id} className="flex items-center gap-4 p-4 hover:bg-secondary/20 transition-colors">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", cfg.cls)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground">{log.details}</div>
                      <div className="text-[10px] text-muted-foreground">{log.user}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground flex-shrink-0">{log.time}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="workspaces">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">סביבות עבודה פעילות</h3>
            <div className="space-y-3">
              {[
                { name: 'אקמה טכנולוגיות בע"מ', plan: 'Professional', tenants: 3, scans: 12, score: 72 },
                { name: 'חברת הייטק בע"מ', plan: 'Enterprise', tenants: 5, scans: 34, score: 85 },
                { name: 'בנק דיגיטל', plan: 'Enterprise', tenants: 8, scans: 67, score: 91 },
                { name: 'סטארטאפ חדש', plan: 'Trial', tenants: 1, scans: 2, score: 45 },
              ].map(ws => (
                <div key={ws.name} className="flex items-center gap-4 p-4 rounded-lg bg-secondary/20">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{ws.name}</div>
                    <div className="text-xs text-muted-foreground">{ws.plan} • {ws.tenants} טננטים • {ws.scans} סריקות</div>
                  </div>
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                    ws.score >= 80 ? "bg-green-500/10 text-green-400" :
                    ws.score >= 60 ? "bg-amber-500/10 text-amber-400" :
                    "bg-red-500/10 text-red-400"
                  )}>
                    {ws.score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="checks">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">מנוע בדיקות</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="text-xs text-muted-foreground mb-1">Benchmark נוכחי</div>
                <div className="text-sm font-medium text-foreground">CIS Microsoft 365 Foundations v3.1.0</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="text-xs text-muted-foreground mb-1">סה"כ בדיקות רשומות</div>
                <div className="text-sm font-medium text-foreground">18 בדיקות</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="text-xs text-muted-foreground mb-1">בדיקות אוטומטיות</div>
                <div className="text-sm font-medium text-foreground">17</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="text-xs text-muted-foreground mb-1">בדיקות ידניות</div>
                <div className="text-sm font-medium text-foreground">1</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
              <div className="text-xs font-medium text-blue-400 mb-1">ארכיטקטורת Check Registry</div>
              <div className="text-xs text-muted-foreground">
                כל בדיקה מוגדרת כמודול עצמאי. להוספת בדיקה חדשה, צור קובץ חדש בתיקיית domains/ והשתמש ב-registerCheck(). אין צורך בשינוי קוד אחר.
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}