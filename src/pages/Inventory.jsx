import { useState, useEffect } from "react";
import { Users, Mail, Building2, AppWindow, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Key, BookUser, Trash2, UserCheck, ArrowRight, Search, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: 'allMembers',      icon: Users,      label: 'סה״כ חשבונות',                color: 'default', statKey: 'totalUsers' },
  { key: 'activeMembers',   icon: UserCheck,  label: 'תיבות דואר פעילות',           color: 'green',   statKey: 'activeMailboxes' },
  { key: 'guestUsers',      icon: Users,      label: 'משתמשי אורח (Guest)',          color: 'amber',   statKey: 'guestUsers' },
  { key: 'sharedMailboxes', icon: Mail,       label: 'תיבות משותפות',               color: 'blue',    statKey: 'sharedMailboxes' },
  { key: 'rooms',           icon: Building2,  label: 'חדרי ישיבות ומשאבים',         color: 'purple',  statKey: 'meetingRooms' },
  { key: 'contacts',        icon: BookUser,   label: 'אנשי קשר (Exchange Contacts)', color: 'default', statKey: 'contacts' },
  { key: 'appCredentials',  icon: Key,        label: 'אפליקציות וטוקנים',           color: 'cyan',    statKey: 'enterpriseApps' },
  { key: 'deletedUsers',    icon: Trash2,     label: 'משתמשים שנמחקו',              color: 'red',     statKey: 'deletedUsers' },
];

const COLORS = {
  default: { text: 'text-primary',    bg: 'bg-primary/10',    border: 'border-primary/30',    hover: 'hover:border-primary/60' },
  green:   { text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  hover: 'hover:border-green-500/60' },
  amber:   { text: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  hover: 'hover:border-amber-500/60' },
  blue:    { text: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   hover: 'hover:border-blue-500/60' },
  purple:  { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', hover: 'hover:border-purple-500/60' },
  cyan:    { text: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   hover: 'hover:border-cyan-500/60' },
  red:     { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    hover: 'hover:border-red-500/60' },
};

export default function Inventory() {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);

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
    setActiveCategory(null);
    const res = await base44.functions.invoke('getTenantInventory', { customer_tenant_id: selectedTenant.tenant_id });
    setData(res.data);
    setLoading(false);
  };

  if (activeCategory && data) {
    const cat = CATEGORIES.find(c => c.key === activeCategory);
    return <DetailView category={cat} items={data[activeCategory] || []} data={data} onBack={() => setActiveCategory(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">מלאי טננט</h1>
          <p className="text-sm text-muted-foreground mt-1">נתונים אופרטיביים ישירים מ-Microsoft 365</p>
        </div>
        <div className="flex items-center gap-3">
          {!loadingTenants && (
            <Select value={selectedTenant?.id || ''} onValueChange={v => setSelectedTenant(tenants.find(t => t.id === v))}>
              <SelectTrigger className="w-56"><SelectValue placeholder="בחר טננט" /></SelectTrigger>
              <SelectContent>{tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.tenant_name}</SelectItem>)}</SelectContent>
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
      {!data && !loading && selectedTenant && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">לחץ על "שלוף נתונים" כדי לטעון את מלאי הטננט</p>
        </div>
      )}
      {loading && (
        <div className="flex items-center justify-center h-40 gap-3 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">שולף נתונים מ-Microsoft 365...</span>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {CATEGORIES.map(cat => {
            const c = COLORS[cat.color];
            const count = data.stats?.[cat.statKey] ?? (data[cat.key]?.length ?? 0);
            const Icon = cat.icon;
            return (
              <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                className={cn("bg-card border rounded-xl p-5 text-right transition-all group cursor-pointer", c.border, c.hover, "hover:bg-secondary/30 hover:shadow-lg hover:scale-[1.02]")}>
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", c.bg)}>
                    <Icon className={cn("w-5 h-5", c.text)} />
                  </div>
                  <ArrowRight className={cn("w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity mt-1", c.text)} />
                </div>
                <div className={cn("text-3xl font-bold mb-1", c.text)}>{count}</div>
                <div className="text-sm text-muted-foreground leading-tight">{cat.label}</div>
                {cat.key === 'appCredentials' && data.appCredentials && (
                  <div className="mt-2 flex gap-2 text-[10px] flex-wrap">
                    {data.appCredentials.filter(a => a.status === 'expired').length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30">
                        {data.appCredentials.filter(a => a.status === 'expired').length} פגי תוקף
                      </span>
                    )}
                    {data.appCredentials.filter(a => a.maxThreat === 'high').length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30">
                        {data.appCredentials.filter(a => a.maxThreat === 'high').length} הרשאות גבוהות
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || 'חיפוש...'} className="pr-9" />
    </div>
  );
}

function DetailView({ category, items, data, onBack }) {
  const [search, setSearch] = useState('');
  const c = COLORS[category.color];
  const Icon = category.icon;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight className="w-4 h-4" />
          חזרה למלאי
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", c.bg)}>
          <Icon className={cn("w-5 h-5", c.text)} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{category.label}</h1>
          <p className="text-sm text-muted-foreground">{items.length} רשומות</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <SearchBar value={search} onChange={setSearch} placeholder={`חיפוש ב${category.label}...`} />
        </div>
        {(category.key === 'allMembers' || category.key === 'activeMembers' || category.key === 'guestUsers' || category.key === 'sharedMailboxes' || category.key === 'deletedUsers') && (
          <UserDetailTable users={items} search={search} showLicenses={category.key === 'allMembers' || category.key === 'activeMembers'} showDeleted={category.key === 'deletedUsers'} />
        )}
        {category.key === 'rooms' && <RoomsDetail rooms={items} search={search} />}
        {category.key === 'contacts' && <ContactsDetail contacts={items} search={search} />}
        {category.key === 'appCredentials' && <AppCredsDetail apps={items} search={search} />}
      </div>
    </div>
  );
}

function UserDetailTable({ users, search, showLicenses, showDeleted }) {
  const filtered = users.filter(u =>
    !search ||
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.userPrincipalName?.toLowerCase().includes(search.toLowerCase()) ||
    u.mail?.toLowerCase().includes(search.toLowerCase())
  );
  if (filtered.length === 0) return <EmptyState />;
  return (
    <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
      {filtered.map(u => (
        <div key={u.id} className="flex items-center gap-4 px-5 py-3 text-xs hover:bg-secondary/20">
          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", u.accountEnabled === false ? "bg-slate-500" : "bg-green-400")} />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground">{u.displayName}</div>
            <div className="text-muted-foreground font-mono truncate">{u.userPrincipalName}</div>
            {showLicenses && u.licenseNames?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {u.licenseNames.map((l, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">{l}</span>
                ))}
              </div>
            )}
            {showLicenses && (!u.licenseNames || u.licenseNames.length === 0) && (
              <span className="px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] mt-1 inline-block">ללא רישיון</span>
            )}
          </div>
          <div className="text-muted-foreground truncate max-w-[200px]">
            {showDeleted
              ? (u.deletedDateTime ? new Date(u.deletedDateTime).toLocaleDateString('he-IL') : '—')
              : (u.mail || '—')}
          </div>
        </div>
      ))}
    </div>
  );
}

function RoomsDetail({ rooms, search }) {
  const filtered = rooms.filter(r =>
    !search ||
    r.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    r.emailAddress?.toLowerCase().includes(search.toLowerCase())
  );
  if (filtered.length === 0) return <EmptyState />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
      {filtered.map(room => (
        <div key={room.id || room.emailAddress} className="bg-secondary/30 rounded-lg p-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-foreground">{room.displayName}</span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>{room.emailAddress}</div>
            {room.building && <div>🏢 {room.building}{room.floorNumber ? ` — קומה ${room.floorNumber}` : ''}</div>}
            {room.capacity && <div>👥 קיבולת: {room.capacity}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactsDetail({ contacts, search }) {
  const filtered = contacts.filter(c =>
    !search ||
    c.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(search.toLowerCase())
  );
  if (filtered.length === 0) return <EmptyState />;
  return (
    <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
      {filtered.map(c => (
        <div key={c.id} className="flex items-center gap-4 px-5 py-3 text-xs hover:bg-secondary/20">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground">{c.displayName}</div>
            <div className="text-muted-foreground">{c.email || '—'}</div>
          </div>
          {c.companyName && <span className="text-muted-foreground shrink-0">{c.companyName}</span>}
          {c.jobTitle && <span className="text-muted-foreground shrink-0">{c.jobTitle}</span>}
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded border shrink-0",
            c.source === 'org' ? "text-blue-400 border-blue-500/30 bg-blue-500/10" : "text-green-400 border-green-500/30 bg-green-500/10")}>
            {c.source === 'org' ? 'Org' : 'Exchange'}
          </span>
        </div>
      ))}
    </div>
  );
}

const THREAT_CONFIG = {
  high:   { label: 'גבוה',   color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30',    icon: ShieldAlert },
  medium: { label: 'בינוני', color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/30', icon: Shield },
  low:    { label: 'נמוך',   color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30', icon: ShieldCheck },
  none:   { label: 'ללא',    color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/30', icon: ShieldCheck },
};

function AppCredsDetail({ apps, search }) {
  const filtered = apps.filter(a =>
    !search ||
    a.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    a.appId?.toLowerCase().includes(search.toLowerCase())
  );
  const sorted = [...filtered].sort((a, b) => {
    const threatOrder = { high: 0, medium: 1, low: 2, none: 3 };
    const credOrder = { expired: 0, expiring_soon: 1, active: 2, no_credentials: 3 };
    const tDiff = (threatOrder[a.maxThreat] ?? 4) - (threatOrder[b.maxThreat] ?? 4);
    if (tDiff !== 0) return tDiff;
    return (credOrder[a.status] ?? 4) - (credOrder[b.status] ?? 4);
  });

  if (sorted.length === 0) return <EmptyState />;

  const credStatusMap = {
    expired:        { color: 'text-red-400',   bg: 'bg-red-500/10 border-red-500/30',     icon: XCircle,       label: 'פג תוקף' },
    expiring_soon:  { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: AlertTriangle, label: 'פג בקרוב' },
    active:         { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', icon: CheckCircle2,  label: 'פעיל' },
    no_credentials: { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30', icon: Key,           label: 'ללא קרדנציאלים' },
  };

  return (
    <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
      {sorted.map(app => {
        const threat = THREAT_CONFIG[app.maxThreat] || THREAT_CONFIG.none;
        const cred = credStatusMap[app.status] || credStatusMap.no_credentials;
        const CredIcon = cred.icon;
        const ThreatIcon = threat.icon;
        const highPerms = app.permissions?.filter(p => p.threat === 'high') || [];
        const medPerms = app.permissions?.filter(p => p.threat === 'medium') || [];
        const lowPerms = app.permissions?.filter(p => p.threat === 'low') || [];

        return (
          <div key={app.id} className="px-5 py-4 hover:bg-secondary/20">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {/* Threat badge */}
              <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium", threat.bg, threat.color)}>
                <ThreatIcon className="w-3 h-3" />
                סיכון {threat.label}
              </div>
              {/* Cred status badge */}
              <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium", cred.bg, cred.color)}>
                <CredIcon className="w-3 h-3" />
                {cred.label}{app.soonExpiringCount > 0 ? ` (${app.soonExpiringCount})` : ''}
              </div>
              <span className="text-xs font-semibold text-foreground">{app.displayName}</span>
              <span className="text-[10px] text-muted-foreground font-mono mr-auto truncate max-w-[200px]">{app.appId}</span>
            </div>

            {/* Credentials */}
            {app.credentials.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {app.credentials.map((c, i) => (
                  <span key={i} className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px]",
                    c.isExpired ? "text-red-400 border-red-500/30 bg-red-500/10" :
                    c.daysLeft <= 30 ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                    "text-green-400 border-green-500/30 bg-green-500/10")}>
                    {c.type === 'secret' ? '🔑' : '📜'}
                    {c.isExpired ? `פג לפני ${Math.abs(c.daysLeft)} ימים` : `${c.daysLeft} ימים`}
                  </span>
                ))}
              </div>
            )}

            {/* Permissions grouped by threat */}
            {app.permissions?.length > 0 && (
              <div className="space-y-1.5">
                {highPerms.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[10px] text-red-400 font-semibold w-12">גבוה:</span>
                    {highPerms.map((p, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-mono">{p.name}</span>
                    ))}
                  </div>
                )}
                {medPerms.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[10px] text-amber-400 font-semibold w-12">בינוני:</span>
                    {medPerms.map((p, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono">{p.name}</span>
                    ))}
                  </div>
                )}
                {lowPerms.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[10px] text-green-400 font-semibold w-12">נמוך:</span>
                    {lowPerms.map((p, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-mono">{p.name}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return <div className="p-12 text-center text-sm text-muted-foreground">אין נתונים להצגה</div>;
}