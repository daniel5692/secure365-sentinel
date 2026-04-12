import { useState, useEffect } from "react";
import { Users, Mail, Building2, AppWindow, Server, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Clock, Key } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

export default function Inventory() {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async user => {
      const t = await base44.entities.ConnectedTenant.filter({ created_by: user.email });
      const connected = t.filter(x => x.connection_status === 'connected');
      setTenants(connected);
      if (connected.length > 0) setSelectedTenant(connected[0]);
      setLoadingTenants(false);
    });
  }, []);

  const fetchInventory = async () => {
    if (!selectedTenant) return;
    setLoading(true);
    setData(null);
    const res = await base44.functions.invoke('getTenantInventory', {
      customer_tenant_id: selectedTenant.tenant_id,
    });
    setData(res.data);
    setLoading(false);
  };

  const stats = data?.stats;
  const appCreds = data?.appCredentials || [];

  const credStatus = (app) => {
    if (app.status === 'expired') return { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: XCircle, label: 'פג תוקף' };
    if (app.soonExpiring > 0) return { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: AlertTriangle, label: `פג תוקף בקרוב (${app.soonExpiring})` };
    if (app.status === 'active') return { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', icon: CheckCircle2, label: 'פעיל' };
    return { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30', icon: Key, label: 'ללא קרדנציאלים' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">מלאי טננט</h1>
          <p className="text-sm text-muted-foreground mt-1">נתונים אופרטיביים ישירים מ-Microsoft 365</p>
        </div>
        <div className="flex items-center gap-3">
          {loadingTenants ? null : (
            <Select
              value={selectedTenant?.id || ''}
              onValueChange={v => setSelectedTenant(tenants.find(t => t.id === v))}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="בחר טננט" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.tenant_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={fetchInventory} disabled={loading || !selectedTenant}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            {loading ? 'שולף...' : 'שלוף נתונים'}
          </Button>
        </div>
      </div>

      {/* No tenants */}
      {!loadingTenants && tenants.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">אין טננטים מחוברים — חבר טננט בדף ניהול טננטים</p>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={Users} label="סה״כ משתמשים" value={stats.totalUsers} />
          <StatCard icon={Users} label="משתמשי אורח" value={stats.guestUsers} color="amber" />
          <StatCard icon={Mail} label="תיבות פעילות" value={stats.activeMailboxes} color="green" />
          <StatCard icon={Mail} label="תיבות משותפות" value={stats.sharedMailboxes} color="blue" />
          <StatCard icon={Building2} label="חדרי ישיבות" value={stats.meetingRooms} color="purple" />
          <StatCard icon={AppWindow} label="Enterprise Apps" value={stats.enterpriseApps} color="cyan" />
        </div>
      )}

      {/* App credentials */}
      {appCreds.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <Key className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">אפליקציות וטוקנים</h2>
            <span className="text-xs text-muted-foreground mr-auto">{appCreds.length} אפליקציות</span>
            <span className="text-xs text-red-400">{appCreds.filter(a => a.status === 'expired').length} פגי תוקף</span>
            <span className="text-xs text-amber-400 mr-2">{appCreds.filter(a => a.soonExpiring > 0).length} פגים בקרוב</span>
          </div>
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
            {appCreds
              .sort((a, b) => {
                const order = { expired: 0, active: 1, no_credentials: 2 };
                if (a.soonExpiring > 0 && b.soonExpiring === 0) return -1;
                if (b.soonExpiring > 0 && a.soonExpiring === 0) return 1;
                return (order[a.status] ?? 3) - (order[b.status] ?? 3);
              })
              .map(app => {
                const s = credStatus(app);
                const Icon = s.icon;
                return (
                  <div key={app.id} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/20">
                    <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium", s.bg, s.color)}>
                      <Icon className="w-3 h-3" />
                      {s.label}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">{app.displayName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{app.appId}</div>
                    </div>
                    <div className="flex gap-3 text-[11px] text-muted-foreground">
                      {app.credentials.slice(0, 3).map((c, i) => (
                        <span key={i} className={cn(
                          "px-1.5 py-0.5 rounded border",
                          c.isExpired ? "text-red-400 border-red-500/30 bg-red-500/10" :
                          c.daysLeft <= 30 ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                          "text-green-400 border-green-500/30 bg-green-500/10"
                        )}>
                          {c.type === 'secret' ? '🔑' : '📜'} {c.isExpired ? 'פג' : `${c.daysLeft}י`}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Meeting Rooms */}
      {data?.rooms?.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">חדרי ישיבות</h2>
            <span className="text-xs text-muted-foreground mr-auto">{data.rooms.length} חדרים</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
            {data.rooms.map(room => (
              <div key={room.id} className="bg-secondary/30 rounded-lg p-3 text-xs">
                <div className="font-medium text-foreground truncate">{room.displayName}</div>
                <div className="text-muted-foreground truncate mt-0.5">{room.emailAddress}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared Mailboxes */}
      {data?.sharedMailboxes?.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">תיבות משותפות</h2>
            <span className="text-xs text-muted-foreground mr-auto">{data.sharedMailboxes.length} תיבות</span>
          </div>
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {data.sharedMailboxes.map(mb => (
              <div key={mb.id} className="flex items-center gap-4 px-5 py-3 text-xs hover:bg-secondary/20">
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", mb.accountEnabled ? "bg-green-400" : "bg-red-400")} />
                <span className="text-foreground font-medium">{mb.displayName}</span>
                <span className="text-muted-foreground mr-auto">{mb.mail || mb.userPrincipalName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!data && !loading && selectedTenant && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">לחץ על "שלוף נתונים" כדי לטעון את מלאי הטננט</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = 'default' }) {
  const colors = {
    default: 'text-primary bg-primary/10',
    green: 'text-green-400 bg-green-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/10',
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", colors[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-bold text-foreground">{value ?? '—'}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}