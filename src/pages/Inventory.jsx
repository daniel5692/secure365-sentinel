import { useState, useEffect } from "react";
import { Users, Mail, Building2, AppWindow, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Key, ChevronDown, ChevronUp, BookUser, Trash2, UserCheck } from "lucide-react";
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">מלאי טננט</h1>
          <p className="text-sm text-muted-foreground mt-1">נתונים אופרטיביים ישירים מ-Microsoft 365</p>
        </div>
        <div className="flex items-center gap-3">
          {!loadingTenants && (
            <Select value={selectedTenant?.id || ''} onValueChange={v => setSelectedTenant(tenants.find(t => t.id === v))}>
              <SelectTrigger className="w-56"><SelectValue placeholder="בחר טננט" /></SelectTrigger>
              <SelectContent>
                {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.tenant_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button onClick={fetchInventory} disabled={loading || !selectedTenant}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            {loading ? 'שולף...' : 'שלוף נתונים'}
          </Button>
        </div>
      </div>

      {!loadingTenants && tenants.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">אין טננטים מחוברים — חבר טננט בדף ניהול טננטים</p>
        </div>
      )}

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatCard icon={Users} label="סה״כ משתמשים" value={stats.totalUsers} color="default" />
          <StatCard icon={UserCheck} label="תיבות פעילות" value={stats.activeMailboxes} color="green" />
          <StatCard icon={Users} label="משתמשי אורח" value={stats.guestUsers} color="amber" />
          <StatCard icon={Mail} label="תיבות משותפות" value={stats.sharedMailboxes} color="blue" />
          <StatCard icon={Building2} label="חדרי ישיבות" value={stats.meetingRooms} color="purple" />
          <StatCard icon={AppWindow} label="Enterprise Apps" value={stats.enterpriseApps} color="cyan" />
          <StatCard icon={BookUser} label="Contacts" value={stats.contacts} color="default" />
          <StatCard icon={Trash2} label="משתמשים נמחקו" value={stats.deletedUsers} color="red" />
        </div>
      )}

      {/* Expandable sections */}
      {data && (
        <div className="space-y-3">
          <ExpandableSection
            icon={UserCheck}
            title="תיבות דואר פעילות"
            count={data.activeMembers?.length}
            color="green"
          >
            <UserTable users={data.activeMembers} />
          </ExpandableSection>

          <ExpandableSection
            icon={Users}
            title="משתמשי אורח (Guest)"
            count={data.guestUsers?.length}
            color="amber"
          >
            <UserTable users={data.guestUsers} showType={false} />
          </ExpandableSection>

          <ExpandableSection
            icon={Mail}
            title="תיבות משותפות (Shared Mailboxes)"
            count={data.sharedMailboxes?.length}
            color="blue"
          >
            <UserTable users={data.sharedMailboxes} showEnabled />
          </ExpandableSection>

          <ExpandableSection
            icon={Building2}
            title="חדרי ישיבות ומשאבים"
            count={data.rooms?.length}
            color="purple"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
              {data.rooms.map(room => (
                <div key={room.id} className="bg-secondary/30 rounded-lg p-3 text-xs border border-border">
                  <div className="font-medium text-foreground">{room.displayName}</div>
                  <div className="text-muted-foreground mt-0.5">{room.emailAddress}</div>
                  {room.building && <div className="text-muted-foreground mt-0.5">🏢 {room.building}{room.floorNumber ? ` קומה ${room.floorNumber}` : ''}</div>}
                  {room.capacity && <div className="text-muted-foreground mt-0.5">👥 קיבולת: {room.capacity}</div>}
                </div>
              ))}
            </div>
          </ExpandableSection>

          <ExpandableSection
            icon={BookUser}
            title="אנשי קשר (Exchange Contacts)"
            count={data.contacts?.length}
            color="default"
          >
            <div className="divide-y divide-border">
              {data.contacts.map(c => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3 text-xs hover:bg-secondary/20">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">{c.displayName}</div>
                    <div className="text-muted-foreground">{c.emailAddresses?.[0]?.address}</div>
                  </div>
                  {c.companyName && <span className="text-muted-foreground">{c.companyName}</span>}
                  {c.jobTitle && <span className="text-muted-foreground">{c.jobTitle}</span>}
                </div>
              ))}
            </div>
          </ExpandableSection>

          <ExpandableSection
            icon={Key}
            title="אפליקציות וטוקנים"
            count={data.appCredentials?.length}
            color="cyan"
            badge={`${data.appCredentials?.filter(a => a.status === 'expired').length} פגי תוקף · ${data.appCredentials?.filter(a => a.status === 'expiring_soon').length} פגים בקרוב`}
          >
            <AppCredsList apps={data.appCredentials} />
          </ExpandableSection>

          <ExpandableSection
            icon={Trash2}
            title="משתמשים שנמחקו"
            count={data.deletedUsers?.length}
            color="red"
          >
            <div className="divide-y divide-border">
              {data.deletedUsers.map(u => (
                <div key={u.id} className="flex items-center gap-4 px-5 py-3 text-xs hover:bg-secondary/20">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">{u.displayName}</div>
                    <div className="text-muted-foreground font-mono">{u.userPrincipalName}</div>
                  </div>
                  {u.deletedDateTime && (
                    <span className="text-muted-foreground">נמחק: {new Date(u.deletedDateTime).toLocaleDateString('he-IL')}</span>
                  )}
                </div>
              ))}
            </div>
          </ExpandableSection>
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

function ExpandableSection({ icon: Icon, title, count, color = 'default', badge, children }) {
  const [open, setOpen] = useState(false);
  const colors = {
    default: 'text-primary bg-primary/10',
    green: 'text-green-400 bg-green-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/10',
    red: 'text-red-400 bg-red-500/10',
  };

  if (!count) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        className="w-full p-5 flex items-center gap-3 hover:bg-secondary/20 transition-colors text-right"
        onClick={() => setOpen(!open)}
      >
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", colors[color])}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 text-right">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge && <span className="text-xs text-muted-foreground mr-3">{badge}</span>}
        </div>
        <span className={cn("text-lg font-bold ml-2", colors[color].split(' ')[0])}>{count}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border max-h-[500px] overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

function UserTable({ users = [], showEnabled = false }) {
  return (
    <div className="divide-y divide-border">
      {users.map(u => (
        <div key={u.id} className="flex items-center gap-4 px-5 py-3 text-xs hover:bg-secondary/20">
          {showEnabled && (
            <span className={cn("w-2 h-2 rounded-full flex-shrink-0", u.accountEnabled ? "bg-green-400" : "bg-slate-500")} />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground">{u.displayName}</div>
            <div className="text-muted-foreground font-mono truncate">{u.userPrincipalName}</div>
          </div>
          {u.mail && u.mail !== u.userPrincipalName && (
            <span className="text-muted-foreground truncate max-w-[200px]">{u.mail}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function AppCredsList({ apps = [] }) {
  const now = new Date();
  const sorted = [...apps].sort((a, b) => {
    const order = { expired: 0, expiring_soon: 1, active: 2, no_credentials: 3 };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4);
  });

  return (
    <div className="divide-y divide-border">
      {sorted.map(app => {
        const statusMap = {
          expired: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: XCircle, label: 'פג תוקף' },
          expiring_soon: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: AlertTriangle, label: `פג בקרוב (${app.soonExpiringCount})` },
          active: { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', icon: CheckCircle2, label: 'פעיל' },
          no_credentials: { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30', icon: Key, label: 'ללא קרדנציאלים' },
        };
        const s = statusMap[app.status] || statusMap.no_credentials;
        const StatusIcon = s.icon;
        return (
          <div key={app.id} className="flex items-start gap-4 px-5 py-3 hover:bg-secondary/20">
            <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium flex-shrink-0 mt-0.5", s.bg, s.color)}>
              <StatusIcon className="w-3 h-3" />
              {s.label}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-foreground">{app.displayName}</div>
              <div className="text-[10px] text-muted-foreground font-mono">{app.appId}</div>
              {app.credentials.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {app.credentials.map((c, i) => (
                    <span key={i} className={cn(
                      "px-1.5 py-0.5 rounded border text-[10px]",
                      c.isExpired ? "text-red-400 border-red-500/30 bg-red-500/10" :
                      c.daysLeft <= 30 ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                      "text-green-400 border-green-500/30 bg-green-500/10"
                    )}>
                      {c.type === 'secret' ? '🔑' : '📜'} {c.isExpired ? `פג לפני ${Math.abs(c.daysLeft)}י` : `${c.daysLeft} ימים`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
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
    red: 'text-red-400 bg-red-500/10',
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center mb-2", colors[color])}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="text-xl font-bold text-foreground">{value ?? '—'}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</div>
    </div>
  );
}