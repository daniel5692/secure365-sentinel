import { useState, useEffect } from "react";
import { Users, Save, Loader2 } from "lucide-react";
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
  const [workspaceName, setWorkspaceName] = useState('');

  useEffect(() => {
    base44.entities.Workspace.list('-created_date', 1).then(ws => {
      if (ws.length > 0) {
        setWorkspace(ws[0]);
        setWorkspaceName(ws[0].name || '');
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!workspace) return;
    setSaving(true);
    await base44.entities.Workspace.update(workspace.id, { name: workspaceName });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">הגדרות</h1>
          <p className="text-sm text-muted-foreground mt-1">ניהול הגדרות הארגון וסביבת העבודה</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">לא נמצאה סביבת עבודה</p>
        </div>
      </div>
    );
  }

  const scanUsed = workspace.scans_used || 0;
  const scanQuota = workspace.scan_quota || 10;
  const members = workspace.members || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">הגדרות</h1>
        <p className="text-sm text-muted-foreground mt-1">ניהול הגדרות הארגון וסביבת העבודה</p>
      </div>

      <Tabs defaultValue="workspace" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="workspace">סביבת עבודה</TabsTrigger>
          <TabsTrigger value="notifications">התראות</TabsTrigger>
          <TabsTrigger value="scanning">סריקה</TabsTrigger>
          <TabsTrigger value="members">חברי צוות</TabsTrigger>
          <TabsTrigger value="security">אבטחה</TabsTrigger>
        </TabsList>

        <TabsContent value="workspace">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <h3 className="text-sm font-semibold text-foreground">פרטי סביבת העבודה</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>שם הארגון</Label>
                <Input value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>מנוי</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="px-3 py-2 bg-primary/10 text-primary text-sm font-medium rounded-lg border border-primary/20 capitalize">
                    {workspace.plan || 'trial'}
                  </span>
                </div>
              </div>
              <div>
                <Label>מכסת סריקות</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="text-sm text-foreground">{scanUsed} / {scanQuota}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((scanUsed / scanQuota) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
              <div>
                <Label>בעלים</Label>
                <div className="mt-1.5 text-sm text-foreground">{workspace.owner_email}</div>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              שמור שינויים
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-foreground">הגדרות התראות</h3>
            {[
              { label: 'סריקה הושלמה', desc: 'קבל התראה כאשר סריקה מסתיימת' },
              { label: 'ממצא קריטי חדש', desc: 'התראה על ממצאים ברמת חומרה קריטית' },
              { label: 'ירידה בציון', desc: 'התראה כאשר ציון האבטחה יורד' },
              { label: 'דוח מוכן', desc: 'התראה כאשר דוח מוכן לצפייה' },
              { label: 'ניתוק טננט', desc: 'התראה כאשר חיבור לטננט נכשל' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium text-foreground">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
                <Switch defaultChecked={workspace.settings?.notifications_enabled !== false} />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scanning">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-foreground">הגדרות סריקה</h3>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <div className="text-sm font-medium text-foreground">סריקות אוטומטיות</div>
                <div className="text-xs text-muted-foreground">הפעל סריקות מתוזמנות באופן אוטומטי</div>
              </div>
              <Switch defaultChecked={workspace.settings?.auto_scan_enabled === true} />
            </div>
            <div>
              <Label>תדירות סריקה אוטומטית</Label>
              <select className="mt-1.5 w-full bg-secondary border border-border rounded-lg p-2 text-sm text-foreground">
                <option>שבועי</option>
                <option>דו-שבועי</option>
                <option>חודשי</option>
              </select>
            </div>
            <div>
              <Label>Benchmark ברירת מחדל</Label>
              <div className="mt-1.5 px-3 py-2 bg-secondary rounded-lg text-sm text-foreground">
                CIS Microsoft 365 Foundations Benchmark v6.0.1
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="members">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">חברי צוות</h3>
              <Button size="sm" className="gap-1.5" onClick={() => {
                const email = prompt('כתובת אימייל לחבר חדש:');
                if (email) base44.users.inviteUser(email, 'user').then(() => alert('הזמנה נשלחה!'));
              }}>
                <Users className="w-3.5 h-3.5" />
                הזמן חבר
              </Button>
            </div>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">אין חברי צוות</p>
            ) : (
              <div className="divide-y divide-border">
                {members.map(member => (
                  <div key={member.email} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">{member.email?.[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{member.email}</div>
                        {member.joined_date && (
                          <div className="text-xs text-muted-foreground">הצטרף: {new Date(member.joined_date).toLocaleDateString('he-IL')}</div>
                        )}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-md border border-primary/20">
                      {member.role === 'customer_admin' ? 'מנהל' : member.role === 'customer_reader' ? 'צופה' : member.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-foreground">אבטחת חשבון</h3>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <div className="text-sm font-medium text-foreground">אימות דו-שלבי (MFA)</div>
                <div className="text-xs text-muted-foreground">חייב אימות דו-שלבי לכל חברי הצוות</div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <div className="text-sm font-medium text-foreground">יומן פעילות</div>
                <div className="text-xs text-muted-foreground">תיעוד כל הפעולות בסביבת העבודה</div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-medium text-foreground">הגבלת כתובות IP</div>
                <div className="text-xs text-muted-foreground">הגבל גישה לכתובות IP ספציפיות בלבד</div>
              </div>
              <Switch />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}