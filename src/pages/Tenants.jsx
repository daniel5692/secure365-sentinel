import { Server, Plus, Wifi, WifiOff, Clock, Trash2, MoreVertical, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const STATUS_CONFIG = {
  connected: { label: 'מחובר', cls: 'text-green-400 bg-green-500/10 border-green-500/30', icon: Wifi },
  disconnected: { label: 'מנותק', cls: 'text-red-400 bg-red-500/10 border-red-500/30', icon: WifiOff },
  pending_consent: { label: 'ממתין לאישור', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: Clock },
  error: { label: 'שגיאה', cls: 'text-red-400 bg-red-500/10 border-red-500/30', icon: WifiOff },
};

export default function Tenants() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [consentResult, setConsentResult] = useState(null);

  const loadTenants = async () => {
    setLoading(true);
    const data = user ? await base44.entities.ConnectedTenant.filter({ created_by: user.email }, '-created_date') : [];
    setTenants(data);
    setLoading(false);
  };

  // Show error from redirect if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) {
      setConsentResult({ success: false, error: decodeURIComponent(error) });
      window.history.replaceState({}, '', '/tenants');
    }
  }, []);

  useEffect(() => { loadTenants(); }, []);

  const handleConnect = async () => {
    if (!tenantName.trim()) return;
    setConnecting(true);
    localStorage.setItem('pending_tenant_name', tenantName.trim());
    const res = await base44.functions.invoke('generateConsentUrl', {
      customer_tenant_id: 'common',
      redirect_uri: window.location.origin + '/',
    });
    const url = res?.data?.consent_url;
    if (url) {
      // Direct navigation to Microsoft login
      window.location.assign(url);
    } else {
      setConnecting(false);
      alert('שגיאה ביצירת קישור ההתחברות');
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.ConnectedTenant.delete(id);
    loadTenants();
  };

  const handleReConsent = async (tenant) => {
    localStorage.setItem('pending_tenant_name', tenant.tenant_name);
    const res = await base44.functions.invoke('generateConsentUrl', {
      customer_tenant_id: tenant.tenant_id || 'common',
      redirect_uri: window.location.origin + '/',
    });
    if (res.data?.consent_url) {
      window.location.href = res.data.consent_url;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ניהול טננטים</h1>
          <p className="text-sm text-muted-foreground mt-1">חיבור וניהול סביבות Microsoft 365</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />חבר טננט חדש</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>חיבור Microsoft 365 Tenant</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 mt-2">
              <div>
                <Label className="text-sm">שם הטננט</Label>
                <Input
                  className="mt-1.5"
                  placeholder="לדוגמה: Contoso Production"
                  value={tenantName}
                  onChange={e => setTenantName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConnect()}
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">שם לזיהוי הסביבה באפליקציה</p>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 space-y-1.5">
                <p className="text-xs font-semibold text-blue-400 mb-2">מה יקרה אחרי לחיצה:</p>
                <p className="text-xs text-muted-foreground">1. תועבר לדף ההתחברות של Microsoft</p>
                <p className="text-xs text-muted-foreground">2. תיכנס עם חשבון Admin של הטננט הלקוח</p>
                <p className="text-xs text-muted-foreground">3. תאשר הרשאות קריאה בלבד</p>
                <p className="text-xs text-muted-foreground">4. תוחזר אוטומטית לאפליקציה</p>
              </div>

              <Button
                className="w-full gap-2 text-base py-5"
                onClick={handleConnect}
                disabled={connecting || !tenantName.trim()}
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
                {connecting ? 'מעביר למיקרוסופט...' : 'חבר Microsoft 365 Tenant'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Consent result banner */}
      {consentResult && (
        <div className={cn(
          "flex items-center gap-3 p-4 rounded-xl border text-sm font-medium",
          consentResult.success
            ? "bg-green-500/10 border-green-500/30 text-green-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        )}>
          {consentResult.success
            ? <><CheckCircle2 className="w-5 h-5 flex-shrink-0" />הטננט חובר בהצלחה! ניתן להפעיל סריקה.</>
            : <><AlertCircle className="w-5 h-5 flex-shrink-0" />שגיאה בחיבור: {consentResult.error}</>
          }
          <button className="mr-auto text-xs opacity-60 hover:opacity-100" onClick={() => setConsentResult(null)}>✕</button>
        </div>
      )}

      {/* Tenants list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tenants.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Server className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">אין טננטים מחוברים</h3>
          <p className="text-sm text-muted-foreground mb-6">חבר את הטננט הראשון שלך כדי להתחיל הערכת אבטחה</p>
          <Button className="gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" />חבר טננט חדש
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tenants.map(tenant => {
            const statusCfg = STATUS_CONFIG[tenant.connection_status] || STATUS_CONFIG.pending_consent;
            const StatusIcon = statusCfg.icon;
            return (
              <div key={tenant.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Server className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{tenant.tenant_name}</h3>
                      <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{tenant.tenant_id || '—'}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 hover:bg-secondary rounded">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleReConsent(tenant)}>חדש Consent</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(tenant.id)}>
                        <Trash2 className="w-4 h-4 ml-2" />נתק טננט
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium", statusCfg.cls)}>
                    <StatusIcon className="w-3 h-3" />{statusCfg.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
                  <div>
                    <div className="text-[10px] text-muted-foreground">ציון אחרון</div>
                    <div className={cn("text-lg font-bold",
                      tenant.last_scan_score >= 80 ? "text-green-400" :
                      tenant.last_scan_score >= 60 ? "text-amber-400" :
                      tenant.last_scan_score ? "text-red-400" : "text-muted-foreground"
                    )}>{tenant.last_scan_score ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">סריקות</div>
                    <div className="text-lg font-bold text-foreground">{tenant.total_scans || 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">סריקה אחרונה</div>
                    <div className="text-xs text-foreground mt-1">
                      {tenant.last_scan_date ? new Date(tenant.last_scan_date).toLocaleDateString('he-IL') : '—'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permissions reference */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">הרשאות Microsoft Graph API נדרשות</h3>
        <p className="text-xs text-muted-foreground mb-4">קריאה בלבד — אין גישה לכתיבה או שינוי הגדרות.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { perm: 'Directory.Read.All', desc: 'מבנה ספרייה, תפקידים ומשתמשים' },
            { perm: 'Policy.Read.All', desc: 'מדיניות גישה מותנית ואבטחה' },
            { perm: 'SecurityEvents.Read.All', desc: 'אירועי אבטחה וסיכונים' },
            { perm: 'Reports.Read.All', desc: 'דוחות שימוש ואבטחה' },
            { perm: 'RoleManagement.Read.Directory', desc: 'הקצאות תפקידים' },
            { perm: 'AuditLog.Read.All', desc: 'יומן ביקורת' },
          ].map(p => (
            <div key={p.perm} className="flex items-center gap-2 p-2 rounded bg-secondary/30">
              <code className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0" dir="ltr">{p.perm}</code>
              <span className="text-xs text-muted-foreground">{p.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}