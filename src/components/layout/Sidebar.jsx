import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Server, Scan, FileWarning, FileText, 
  Settings, Shield, ChevronLeft, ChevronRight, Users,
  Activity, Building2
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", icon: LayoutDashboard, label: "דשבורד ראשי" },
  { path: "/tenants", icon: Server, label: "ניהול טננטים" },
  { path: "/scans", icon: Scan, label: "מרכז סריקות" },
  { path: "/findings", icon: FileWarning, label: "ממצאים" },
  { path: "/compliance", icon: Shield, label: "תאימות" },
  { path: "/reports", icon: FileText, label: "דוחות" },
  { path: "/history", icon: Activity, label: "היסטוריה" },
];

const ADMIN_ITEMS = [
  { path: "/admin", icon: Building2, label: "ניהול פלטפורמה" },
  { path: "/settings", icon: Settings, label: "הגדרות" },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "fixed top-0 right-0 h-screen border-l border-border bg-card z-40 transition-all duration-300 flex flex-col",
      collapsed ? "w-[68px]" : "w-[260px]"
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-foreground tracking-tight truncate">SecureGuard</span>
              <span className="text-[10px] text-muted-foreground tracking-wider">M365 SECURITY</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className={cn("text-[10px] font-semibold text-muted-foreground tracking-wider px-3 mb-2", collapsed && "sr-only")}>
          ניווט ראשי
        </div>
        {NAV_ITEMS.map(item => {
          const isActive = item.path === "/" 
            ? location.pathname === "/" 
            : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-primary")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {isActive && !collapsed && (
                <div className="mr-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}

        <div className="my-4 border-t border-border" />

        <div className={cn("text-[10px] font-semibold text-muted-foreground tracking-wider px-3 mb-2", collapsed && "sr-only")}>
          ניהול
        </div>
        {ADMIN_ITEMS.map(item => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-primary")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-xs"
        >
          {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {!collapsed && <span>כווץ תפריט</span>}
        </button>
      </div>
    </aside>
  );
}