import { useState, useEffect } from "react";
import { Users, Save, Loader2, Shield, Bell, Scan, Key, Info, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

export default function Settings() {
  const [workspace, setWorkspace] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Workspace.list('-created_date', 1),
      base44.entities.User.list('-created_date', 50),
      base44.auth.me(),
    ]).then(([ws, u, me]) => {
      if (ws.length > 0) {
        setWorkspace(ws[0]);
        setWorkspaceName(ws[0].name || '');
      }
      setUsers(u);
      setCurrentUser(me);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!workspace) return;
    setSaving(true);
    await base44.entities.Workspace.update(workspace.id, { name: workspaceName });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    await base44.users.inviteUser(inviteEmail, 'user');
    setInviteEmail('');
    setInviting(false);
    setInviteSuccess(true);
    setTimeout(() => setInviteSuccess(false), 3000);
    const u = await base44.entities.User.list('-created_date', 50);
    setUsers(u);
  };

  const copyToClipboard = (text) => navigator.clipboard.writeText(text);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const scanUsed = workspace?.scans_used || 0;
  const scanQuota = workspace?.scan_quota || 10;
  const pct = Math.min((scanUsed / scanQuota) * 100, 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">הגדרות</h1>
        <p className="text-sm text-muted-foreground mt-1">ניהול הגדרות הארגון, חיבורים וסביבת העבודה</p>
      </div>

      <Tabs defaultValue="workspace" className="space-y-6">
        <TabsList className="bg-secondary flex-wrap h-auto gap-1">
          <TabsTrigger value="workspace">סביבת עבודה</TabsTrigger>
          <TabsTrigger value="connection">חיבור M365</TabsTrigger>
          <TabsTrigger value="scanning">סריקה</TabsTrigger>
          <TabsTrigger value="notifications">התראות</TabsTrigger>
          <TabsTrigger value="members">חברי צוות</TabsTrigger>
        </TabsList>

        {/* ── Workspace ── */}
        <TabsContent value="workspace">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <h3 className="text-sm font-semibold text-foreground">פרטי סביבת העבודה</h3>

            {workspace ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>שם הארגון</Label>
                    <Input value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} className="mt-1.5" placeholder="שם הארגון" />
                  </div>
                  <div>
                    <Label>בעלים</Label>
                    <div className="mt-1.5 px-3 py-2 bg-secondary rounded-lg text-sm text-foreground">{workspace.owner_email}</div>
                  </div>
                  <div>
                    <Label>מנוי</Label>
                    <div className="mt-1.5 flex items-center gap-3">
                      <span className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg border border-primary/20 capitalize">{workspace.plan || 'trial'}</span>
                      <span className={cn("px-2.5 py-1 rounded text-xs border",
                        workspace.status === 'active' ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                      )}>{workspace.status === 'active' ? 'פעיל' : workspace.status}</span>
                    </div>
                  </div>
                  <div>
                    <Label>מכסת סריקות ({scanUsed} / {scanQuota})</Label>
                    <div className="mt-2 h-2.5 bg-secondary rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", pct > 80 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-primary")} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{scanQuota - scanUsed} סריקות נותרו</p>
                  </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saved ? 'נשמר!' : 'שמור שינויים'}
                </Button>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">לא נמצאה סביבת עבודה</p>
                <Button onClick={async () => {
                  const ws = await base44.entities.Workspace.create({ name: currentUser?.full_name || 'My Workspace', owner_email: currentUser?.email || '', plan: 'trial', status: 'active' });
                  setWorkspace(ws);
                  setWorkspaceName(ws.name);
                }}>צור סביבת עבודה</Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── M365 Connection ── */}
        <TabsContent value="connection">
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                פרטי חיבור Azure App Registration
              </h3>
              <p className="text-xs text-muted-foreground">
                הגדרות אלו מנוהלות דרך משתני הסביבה של הפלטפורמה ומשמשות לחיבור לכל הטננטים.
              </p>
              {[
                { label: 'AZURE_CLIENT_ID', desc: 'מזהה האפליקציה ב-Azure', key: 'AZURE_CLIENT_ID' },
                { label: 'AZURE_TENANT_ID', desc: 'מזהה הטננט של האפליקציה', key: 'AZURE_TENANT_ID' },
                { label: 'AZURE_CLIENT_SECRET', desc: 'סוד האפליקציה (מוסתר)', key: 'AZURE_CLIENT_SECRET', secret: true },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
                  <div>
                    <div className="text-xs font-mono font-medium text-primary">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</div>
                  </div>
                  <span className={cn("px-2.5 py-1 rounded text-xs border", "bg-green-500/10 text-green-400 border-green-500/30")}>
                    מוגדר ✓
                  </span>
                </div>
              ))}
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                <div className="text-xs font-medium text-blue-400 mb-1.5 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  הרשאות Graph API נדרשות
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['Policy.Read.All','Directory.Read.All','SecurityEvents.Read.All','Reports.Read.All','Domain.Read.All','User.Read.All','AuditLog.Read.All'].map(p => (
                    <span key={p} className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">{p}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">URL הסכמת Admin לטננט חדש</h3>
              <p className="text-xs text-muted-foreground">שלח קישור זה למנהל IT של הלקוח כדי לאשר גישה ל-tenant שלו:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-secondary rounded-lg text-xs font-mono text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap" dir="ltr">
                  https://login.microsoftonline.com/TENANT_ID/adminconsent?client_id=CLIENT_ID&redirect_uri=...
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={() => window.open('/tenants', '_self')}>
                  עבור לטננטים
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Scanning ── */}
        <TabsContent value="scanning">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Scan className="w-4 h-4 text-primary" />
              הגדרות סריקה
            </h3>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <div className="text-sm font-medium text-foreground">סריקות אוטומטיות</div>
                <div className="text-xs text-muted-foreground">הפעל סריקות מתוזמנות באופן אוטומטי</div>
              </div>
              <Switch defaultChecked={workspace?.settings?.auto_scan_enabled === true} />
            </div>
            <div>
              <Label>תדירות סריקה</Label>
              <select className="mt-1.5 w-full bg-secondary border border-border rounded-lg p-2.5 text-sm text-foreground">
                <option>שבועי</option>
                <option>דו-שבועי</option>
                <option>חודשי</option>
              </select>
            </div>
            <div>
              <Label>Benchmark</Label>
              <div className="mt-1.5 px-3 py-2.5 bg-secondary rounded-lg text-sm text-foreground flex items-center justify-between">
                <span>CIS Microsoft 365 Foundations Benchmark v6.0.1</span>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">עדכני</span>
              </div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
              <div className="text-xs font-medium text-foreground">תחומים שנסרקים</div>
              {['Entra ID', 'Conditional Access', 'Exchange Online', 'Microsoft Defender', 'SharePoint & OneDrive', 'Microsoft Teams', 'Purview & Compliance'].map(d => (
                <div key={d} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-xs text-foreground">{d}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              הגדרות התראות
            </h3>
            {[
              { label: 'סריקה הושלמה', desc: 'קבל התראה כאשר סריקה מסתיימת בהצלחה' },
              { label: 'ממצא קריטי חדש', desc: 'התראה על ממצאים ברמת חומרה קריטית' },
              { label: 'ירידה בציון אבטחה', desc: 'התראה כאשר ציון האבטחה יורד ביותר מ-5 נקודות' },
              { label: 'דוח מוכן לצפייה', desc: 'התראה כאשר דוח AI מוכן' },
              { label: 'ניתוק טננט', desc: 'התראה כאשר חיבור לטננט נכשל' },
              { label: 'סריקה נכשלה', desc: 'התראה כאשר סריקה נכשלת' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium text-foreground">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Members ── */}
        <TabsContent value="members">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                חברי צוות ({users.length})
              </h3>
            </div>

            {/* Invite */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
              <div className="text-xs font-medium text-foreground mb-3">הזמן חבר צוות חדש</div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="כתובת אימייל..."
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="flex-1"
                  dir="ltr"
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                />
                <Button onClick={handleInvite} disabled={!inviteEmail || inviting} size="sm" className="gap-1.5 flex-shrink-0">
                  {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                  הזמן
                </Button>
              </div>
              {inviteSuccess && <p className="text-xs text-green-400 mt-2">✓ הזמנה נשלחה בהצלחה!</p>}
            </div>

            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">אין משתמשים במערכת</p>
            ) : (
              <div className="divide-y divide-border">
                {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">{(user.full_name || user.email || '?')[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{user.full_name || user.email}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentUser?.email === user.email && (
                        <span className="text-[10px] text-muted-foreground">(אני)</span>
                      )}
                      <span className={cn("px-2.5 py-1 text-xs font-medium rounded-md border",
                        user.role === 'admin' ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary text-muted-foreground border-border"
                      )}>
                        {user.role === 'admin' ? 'מנהל' : 'משתמש'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}