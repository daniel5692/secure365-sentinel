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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [currentUser, setCurrentUser] = useState(null);


  useEffect(() => {
    base44.auth.me().then(me => {
      setCurrentUser(me);
      base44.entities.Workspace.filter({ created_by: me.email }, '-created_date', 1).then(ws => {
        if (ws.length > 0) {
          setWorkspace(ws[0]);
          setWorkspaceName(ws[0].name || '');
        }
        setLoading(false);
      });
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
        <TabsList className="bg-secondary">
          <TabsTrigger value="workspace">סביבת עבודה</TabsTrigger>
          <TabsTrigger value="scanning">סריקה</TabsTrigger>
          <TabsTrigger value="notifications">התראות</TabsTrigger>
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

      </Tabs>
    </div>
  );
}