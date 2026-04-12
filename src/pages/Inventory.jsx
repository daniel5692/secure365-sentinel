import { useState, useEffect, useRef } from "react";
import { Users, Mail, Building2, AppWindow, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Key, BookUser, Trash2, UserCheck, ArrowRight, Search, ShieldAlert, Shield, ShieldCheck, ChevronDown, ChevronUp, Clock, History } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: 'allMembers',      icon: Users,      label: 'סה״כ חשבונות',                color: 'default', statKey: 'totalUsers' },
  { key: 'activeMembers',   icon: UserCheck,  label: 'תיבות דואר פעילות',           color: 'green',   statKey: 'activeMailboxes' },
  { key: 'guestUsers',      icon: Users,      label: 'משתמשי אורח',                 color: 'amber',   statKey: 'guestUsers' },
  { key: 'sharedMailboxes', icon: Mail,       label: 'תיבות משותפות',               color: 'blue',    statKey: 'sharedMailboxes' },
  { key: 'rooms',           icon: Building2,  label: 'חדרי ישיבות',                 color: 'purple',  statKey: 'meetingRooms' },
  { key: 'contacts',        icon: BookUser,   label: 'אנשי קשר',                   color: 'default', statKey: 'contacts' },
  { key: 'appCredentials',  icon: Key,        label: 'אפליקציות',                  color: 'cyan',    statKey: 'enterpriseApps' },
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
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [snapshots, setSnapshots] = useState([]);
  const [activeSnapshotId, setActiveSnapshotId] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [runningSnapshotId, setRunningSnapshotId] = useState(null);
  const pollRef = useRef(null);

  const activeSnapshot = snapshots.find(s => s.id === activeSnapshotId);
  const data = activeSnapshot?.data;
  const stats = activeSnapshot?.stats;

  useEffect(() => {
    base44.auth.me().then(async user => {
      const t = await base44.entities.ConnectedTenant.filter({ created_by: user.email });
      const connected = t.filter(x => x.connection_status === 'connected');
      setTenants(connected);
      if (connected.length > 0) setSelectedTenant(connected[0]);

      // Load existing snapshots
      const existing = await base44.entities.InventorySnapshot.filter({ created_by: user.email }, '-created_date', 20);
      setSnapshots(existing);

      // Check if any are still running
      const running = existing.find(s => s.status === 'running');
      if (running) {
        setRunningSnapshotId(running.id);
        setActiveSnapshotId(running.id);
        startPolling(running.id);
      } else if (existing.length > 0) {
        setActiveSnapshotId(existing[0].id);
      }

      setLoadingTenants(false);
    });

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startPolling = (snapshotId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const snap = await base44.entities.InventorySnapshot.filter({ id: snapshotId });
      const updated = snap[0];
      if (updated && updated.status !== 'running') {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setRunningSnapshotId(null);
        setSnapshots(prev => prev.map(s => s.id === snapshotId ? updated : s));
      }
    }, 5000);
  };

  const startInventory = async () => {
    if (!selectedTenant) return;
    const now = new Date();
    const label = now.toLocaleDateString('he-IL') + ' ' + now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    // Create snapshot record
    const snap = await base44.entities.InventorySnapshot.create({
      tenant_id: selectedTenant.tenant_id,
      tenant_name: selectedTenant.tenant_name,
      status: 'running',
      snapshot_label: label,
    });

    setSnapshots(prev => [snap, ...prev]);
    setActiveSnapshotId(snap.id);
    setRunningSnapshotId(snap.id);
    setActiveCategory(null);
    startPolling(snap.id);

    // Fire and forget — runs in background
    base44.functions.invoke('runInventory', {
      customer_tenant_id: selectedTenant.tenant_id,
      tenant_name: selectedTenant.tenant_name,
      snapshot_id: snap.id,
    }).catch(err => {
      console.error('Inventory failed:', err);
      base44.entities.InventorySnapshot.update(snap.id, { status: 'failed', error_message: String(err) });
      setRunningSnapshotId(null);
    });
  };

  if (activeCategory && data) {
    const cat = CATEGORIES.find(c => c.key === activeCategory);
    return <DetailView category={cat} items={data[activeCategory] || []} onBack={() => setActiveCategory(null)} />;
  }

  const isRunning = runningSnapshotId != null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">מלאי טננט</h1>
          <p className="text-sm text-muted-foreground mt-1">נתונים אופרטיביים ישירים מ-Microsoft 365</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!loadingTenants && (
            <Select value={selectedTenant?.id || ''} onValueChange={v => setSelectedTenant(tenants.find(t => t.id === v))}>
              <SelectTrigger className="w-48"><SelectValue placeholder="בחר טננט" /></SelectTrigger>
              <SelectContent>{tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.tenant_name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Button onClick={startInventory} disabled={isRunning || !selectedTenant}>
            <RefreshCw className={cn("w-4 h-4", isRunning && "animate-spin")} />
            {isRunning ? 'שולף ברקע...' : 'שלוף נתונים'}
          </Button>
        </div>
      </div>

      {/* Running banner */}
      {isRunning && (
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-xl p-4">
          <RefreshCw className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-primary">שליפת מלאי רצה ברקע</div>
            <div className="text-xs text-muted-foreground">תוכל לנווט בין דפים — הנתונים יישמרו אוטומטית</div>
          </div>
        </div>
      )}

      {/* History selector */}
      {snapshots.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <History className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground">היסטוריה:</span>
          <div className="flex gap-2 flex-wrap">
            {snapshots.map(s => (
              <button key={s.id} onClick={() => { setActiveSnapshotId(s.id); setActiveCategory(null); }}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all",
                  s.id === activeSnapshotId
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-card border-border text-muted-foreground hover:border-border hover:text-foreground"
                )}>
                {s.status === 'running' ? <RefreshCw className="w-3 h-3 animate-spin" /> :
                 s.status === 'failed' ? <XCircle className="w-3 h-3 text-red-400" /> :
                 <CheckCircle2 className="w-3 h-3 text-green-400" />}
                {s.snapshot_label || new Date(s.created_date).toLocaleDateString('he-IL')}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loadingTenants && tenants.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">אין טננטים מחוברים — חבר טננט בדף ניהול טננטים</p>
        </div>
      )}

      {activeSnapshot?.status === 'running' && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">שולף נתונים... הסריקה רצה ברקע</p>
        </div>
      )}

      {activeSnapshot?.status === 'failed' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-sm text-red-400">{activeSnapshot.error_message || 'השליפה נכשלה'}</p>
        </div>
      )}

      {!activeSnapshot && !isRunning && !loadingTenants && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">לחץ על "שלוף נתונים" כדי לטעון את מלאי הטננט</p>
        </div>
      )}

      {/* Category cards */}
      {data && stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {CATEGORIES.map(cat => {
            const c = COLORS[cat.color];
            const count = stats[cat.statKey] ?? (data[cat.key]?.length ?? 0);
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
                  <div className="mt-2 flex gap-1.5 flex-wrap text-[10px]">
                    {data.appCredentials.filter(a => a.maxThreat === 'high').length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30">
                        {data.appCredentials.filter(a => a.maxThreat === 'high').length} סיכון גבוה
                      </span>
                    )}
                    {data.appCredentials.filter(a => a.credStatus === 'expired').length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30">
                        {data.appCredentials.filter(a => a.credStatus === 'expired').length} פגי תוקף
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

function DetailView({ category, items, onBack }) {
  const [search, setSearch] = useState('');
  const c = COLORS[category.color];
  const Icon = category.icon;

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowRight className="w-4 h-4" />
        חזרה למלאי
      </button>
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", c.bg)}>
          <Icon className={cn("w-5 h-5", c.text)} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{category.label}</h1>
          <p className="text-sm text-muted-foreground">{items.length} רשומות</p>
        </div>
      </div>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={`חיפוש ב${category.label}...`} className="pr-9" />
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
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
  const filtered = users.filter(u => !search ||
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.userPrincipalName?.toLowerCase().includes(search.toLowerCase()) ||
    u.mail?.toLowerCase().includes(search.toLowerCase()));
  if (filtered.length === 0) return <EmptyState />;
  return (
    <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
      {filtered.map(u => (
        <div key={u.id} className="flex items-center gap-3 px-5 py-3 text-xs hover:bg-secondary/20">
          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", u.accountEnabled === false ? "bg-slate-500" : "bg-green-400")} />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground">{u.displayName}</div>
            <div className="text-muted-foreground font-mono truncate">{u.userPrincipalName}</div>
            {showLicenses && (
              <div className="flex flex-wrap gap-1 mt-1">
                {u.licenseNames?.length > 0
                  ? u.licenseNames.map((l, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">{l}</span>)
                  : <span className="px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px]">ללא רישיון</span>}
              </div>
            )}
          </div>
          <div className="text-muted-foreground text-right shrink-0">
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
  const filtered = rooms.filter(r => !search || r.displayName?.toLowerCase().includes(search.toLowerCase()) || r.emailAddress?.toLowerCase().includes(search.toLowerCase()));
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
  const filtered = contacts.filter(c => !search ||
    c.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(search.toLowerCase()));
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
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded border shrink-0",
            c.source === 'org' ? "text-blue-400 border-blue-500/30 bg-blue-500/10" : "text-green-400 border-green-500/30 bg-green-500/10")}>
            {c.source === 'org' ? 'Org' : 'Exchange'}
          </span>
        </div>
      ))}
    </div>
  );
}

const THREAT = {
  high:   { label: 'גבוה',   icon: ShieldAlert,  text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30' },
  medium: { label: 'בינוני', icon: Shield,        text: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30' },
  low:    { label: 'נמוך',   icon: ShieldCheck,  text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30' },
  none:   { label: '—',      icon: ShieldCheck,  text: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-500/30' },
};

const CRED_STATUS = {
  expired:        { label: 'פג תוקף',      icon: XCircle,       text: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/30' },
  expiring_soon:  { label: 'פג בקרוב',     icon: AlertTriangle, text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  active:         { label: 'פעיל',          icon: CheckCircle2,  text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  no_credentials: { label: 'ללא קרדנציאלים',icon: Key,           text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
};

function AppCredsDetail({ apps, search }) {
  const [expandedApp, setExpandedApp] = useState(null);
  const filtered = apps.filter(a => !search ||
    a.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    a.appId?.toLowerCase().includes(search.toLowerCase()));
  if (filtered.length === 0) return <EmptyState />;

  return (
    <div className="overflow-x-auto">
      {/* Table header */}
      <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-secondary/30 text-[11px] font-semibold text-muted-foreground border-b border-border min-w-[600px]">
        <div className="col-span-4">שם אפליקציה</div>
        <div className="col-span-2">רמת סיכון</div>
        <div className="col-span-2">טוקן</div>
        <div className="col-span-3">הרשאות</div>
        <div className="col-span-1"></div>
      </div>
      <div className="divide-y divide-border max-h-[600px] overflow-y-auto min-w-[600px]">
        {filtered.map(app => {
          const threat = THREAT[app.maxThreat] || THREAT.none;
          const cred = CRED_STATUS[app.credStatus] || CRED_STATUS.no_credentials;
          const ThreatIcon = threat.icon;
          const CredIcon = cred.icon;
          const isExpanded = expandedApp === app.id;
          const highCount = app.permissions?.filter(p => p.threat === 'high').length || 0;
          const medCount = app.permissions?.filter(p => p.threat === 'medium').length || 0;
          const lowCount = app.permissions?.filter(p => p.threat === 'low').length || 0;

          return (
            <div key={app.id}>
              <div
                className="grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-secondary/20 cursor-pointer text-xs"
                onClick={() => setExpandedApp(isExpanded ? null : app.id)}
              >
                <div className="col-span-4 min-w-0">
                  <div className="font-medium text-foreground truncate">{app.displayName}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">{app.appId}</div>
                </div>
                <div className="col-span-2">
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium", threat.bg, threat.border, threat.text)}>
                    <ThreatIcon className="w-3 h-3" />{threat.label}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px]", cred.bg, cred.border, cred.text)}>
                    <CredIcon className="w-3 h-3" />{cred.label}
                  </span>
                </div>
                <div className="col-span-3 flex gap-1.5 flex-wrap">
                  {highCount > 0 && <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px]">{highCount} גבוה</span>}
                  {medCount > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">{medCount} בינוני</span>}
                  {lowCount > 0 && <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-[10px]">{lowCount} נמוך</span>}
                  {app.permissions?.length === 0 && <span className="text-muted-foreground">ללא הרשאות</span>}
                </div>
                <div className="col-span-1 flex justify-end">
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-4 bg-secondary/10 border-t border-border">
                  {/* Credentials */}
                  {app.credentials.length > 0 && (
                    <div className="py-3">
                      <div className="text-[11px] font-semibold text-muted-foreground mb-2">קרדנציאלים</div>
                      <div className="flex flex-wrap gap-2">
                        {app.credentials.map((c, i) => (
                          <span key={i} className={cn("flex items-center gap-1 px-2 py-1 rounded border text-[11px]",
                            c.isExpired ? "text-red-400 border-red-500/30 bg-red-500/10" :
                            c.daysLeft <= 30 ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                            "text-green-400 border-green-500/30 bg-green-500/10")}>
                            {c.type === 'secret' ? '🔑' : '📜'}
                            {c.isExpired ? `פג לפני ${Math.abs(c.daysLeft)} ימים` : `${c.daysLeft} ימים`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Permissions */}
                  {app.permissions?.length > 0 && (
                    <div className="py-3">
                      <div className="text-[11px] font-semibold text-muted-foreground mb-2">
                        הרשאות ({app.permissionsSource === 'granted' ? 'מאושרות' : 'מוצהרות'}) — {app.permissions.length} סה״כ
                      </div>
                      {['high','medium','low'].map(level => {
                        const perms = app.permissions.filter(p => p.threat === level);
                        if (perms.length === 0) return null;
                        const t = THREAT[level];
                        const TIcon = t.icon;
                        return (
                          <div key={level} className="mb-2">
                            <div className={cn("flex items-center gap-1.5 text-[11px] font-semibold mb-1.5", t.text)}>
                              <TIcon className="w-3 h-3" />
                              סיכון {t.label} ({perms.length})
                            </div>
                            <div className="flex flex-wrap gap-1.5 mr-4">
                              {perms.map((p, i) => (
                                <span key={i} title={`${p.type} · ${p.resource}`}
                                  className={cn("px-2 py-0.5 rounded border text-[10px] font-mono", t.bg, t.border, t.text)}>
                                  {p.name}
                                  <span className="opacity-60 mr-1">({p.type === 'Application' ? 'App' : 'Del'})</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return <div className="p-12 text-center text-sm text-muted-foreground">אין נתונים להצגה</div>;
}