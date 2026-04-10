import { Bell, Search, ChevronDown, LogOut, User } from "lucide-react";
import { useEffect, useState } from "react";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

export default function TopBar({ selectedTenant, onTenantChange }) {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    base44.entities.ConnectedTenant.filter({ connection_status: 'connected' }).then(setTenants).catch(() => {});
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?';

  const displayName = user?.full_name || user?.email || '';

  const handleLogout = () => base44.auth.logout();

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-6 justify-between">
      <div className="flex items-center gap-4">
        {/* Tenant Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-foreground font-medium">
              {selectedTenant ? tenants.find(t => t.id === selectedTenant)?.tenant_name || 'כל הטננטים' : 'כל הטננטים'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuItem onClick={() => onTenantChange?.(null)}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>כל הטננטים</span>
              </div>
            </DropdownMenuItem>
            {tenants.length > 0 && <DropdownMenuSeparator />}
            {tenants.map(t => (
              <DropdownMenuItem key={t.id} onClick={() => onTenantChange?.(t.id)}>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{t.tenant_name}</span>
                  <span className="text-xs text-muted-foreground" dir="ltr">{t.tenant_id || t.domain || ''}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
          <Search className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground relative">
          <Bell className="w-4 h-4" />
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium text-foreground max-w-[120px] truncate">{displayName}</span>
              <span className="text-[10px] text-muted-foreground">{user?.role === 'admin' ? 'מנהל' : 'משתמש'}</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border mb-1">{user?.email}</div>
            <DropdownMenuItem>
              <User className="w-4 h-4 ml-2" />פרופיל
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4 ml-2" />התנתק
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}