import { Server, Plus, MoreVertical, ExternalLink, Wifi, WifiOff, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_TENANTS } from "@/lib/demoData";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

const STATUS_CONFIG = {
  connected: { label: 'מחובר', cls: 'text-green-400 bg-green-500/10 border-green-500/30', icon: Wifi },
  disconnected: { label: 'מנותק', cls: 'text-red-400 bg-red-500/10 border-red-500/30', icon: WifiOff },
  pending_consent: { label: 'ממתין לאישור', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: Clock },
  error: { label: 'שגיאה', cls: 'text-red-400 bg-red-500/10 border-red-500/30', icon: WifiOff },
};

export default function Tenants() {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ניהול טננטים</h1>
          <p className="text-sm text-muted-foreground mt-1">חיבור וניהול סביבות Microsoft 365</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              חבר טננט חדש
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>חיבור טננט Microsoft 365 חדש</DialogTitle>
              <DialogDescription>
                הזן את פרטי הטננט כדי להתחיל את תהליך ה-Consent. הלקוח יתבקש לאשר הרשאות קריאה בלבד.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>שם הטננט</Label>
                <Input placeholder="לדוגמה: Production Environment" className="mt-1.5" />
              </div>
              <div>
                <Label>דומיין ראשי</Label>
                <Input placeholder="example.onmicrosoft.com" className="mt-1.5" dir="ltr" />
              </div>
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-blue-400 mb-2">הרשאות נדרשות (Read-Only)</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• Directory.Read.All</div>
                  <div>• Policy.Read.All</div>
                  <div>• SecurityEvents.Read.All</div>
                  <div>• Reports.Read.All</div>
                  <div>• SharePoint.Read.All</div>
                  <div>• Exchange.ManageAsApp (Read)</div>
                </div>
              </div>
              <Button className="w-full gap-2" onClick={() => setShowAdd(false)}>
                <ExternalLink className="w-4 h-4" />
                התחל תהליך Consent
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {DEMO_TENANTS.map(tenant => {
          const statusCfg = STATUS_CONFIG[tenant.connection_status];
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
                    <p className="text-xs text-muted-foreground font-mono" dir="ltr">{tenant.domain}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 hover:bg-secondary rounded">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>הפעל סריקה</DropdownMenuItem>
                    <DropdownMenuItem>צפה בדוחות</DropdownMenuItem>
                    <DropdownMenuItem>חדש Consent</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="w-4 h-4 ml-2" />
                      נתק טננט
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium", statusCfg.cls)}>
                  <StatusIcon className="w-3 h-3" />
                  {statusCfg.label}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
                <div>
                  <div className="text-[10px] text-muted-foreground">ציון אחרון</div>
                  <div className={cn(
                    "text-lg font-bold",
                    tenant.last_scan_score >= 80 ? "text-green-400" :
                    tenant.last_scan_score >= 60 ? "text-amber-400" :
                    tenant.last_scan_score ? "text-red-400" : "text-muted-foreground"
                  )}>
                    {tenant.last_scan_score ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">סריקות</div>
                  <div className="text-lg font-bold text-foreground">{tenant.total_scans}</div>
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

      {/* Required Permissions Info */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">הרשאות Microsoft Graph API נדרשות</h3>
        <p className="text-xs text-muted-foreground mb-4">
          האפליקציה מבקשת הרשאות קריאה בלבד (Read-Only) כדי להעריך את מצב האבטחה של הטננט. אין גישה לכתיבה או שינוי הגדרות.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { perm: 'Directory.Read.All', desc: 'קריאת מבנה הספרייה, תפקידים ומשתמשים' },
            { perm: 'Policy.Read.All', desc: 'קריאת מדיניות גישה מותנית ואבטחה' },
            { perm: 'SecurityEvents.Read.All', desc: 'קריאת אירועי אבטחה וזיהוי סיכונים' },
            { perm: 'Reports.Read.All', desc: 'קריאת דוחות שימוש ואבטחה' },
            { perm: 'SharePoint.Read.All', desc: 'קריאת הגדרות SharePoint ושיתוף' },
            { perm: 'RoleManagement.Read.Directory', desc: 'קריאת הקצאות תפקידים' },
            { perm: 'MailboxSettings.Read', desc: 'קריאת הגדרות תיבות דואר' },
            { perm: 'InformationProtectionPolicy.Read.All', desc: 'קריאת מדיניות הגנת מידע' },
          ].map(p => (
            <div key={p.perm} className="flex items-start gap-2 p-2 rounded bg-secondary/30">
              <code className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0" dir="ltr">{p.perm}</code>
              <span className="text-xs text-muted-foreground">{p.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}