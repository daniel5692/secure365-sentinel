import { Bell, Search, ChevronDown, LogOut, User } from "lucide-react";
import { useState } from "react";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { DEMO_WORKSPACE, DEMO_TENANTS } from "@/lib/demoData";

export default function TopBar({ selectedTenant, onTenantChange }) {
  const connectedTenants = DEMO_TENANTS.filter(t => t.connection_status === 'connected');

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-6 justify-between">
      <div className="flex items-center gap-4">
        {/* Tenant Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-foreground font-medium">
              {selectedTenant ? connectedTenants.find(t => t.id === selectedTenant)?.tenant_name || 'כל הטננטים' : 'כל הטננטים'}
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
            <DropdownMenuSeparator />
            {connectedTenants.map(t => (
              <DropdownMenuItem key={t.id} onClick={() => onTenantChange?.(t.id)}>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{t.tenant_name}</span>
                  <span className="text-xs text-muted-foreground">{t.domain}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
          <Search className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">AT</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium text-foreground">{DEMO_WORKSPACE.name}</span>
              <span className="text-[10px] text-muted-foreground">Professional</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <User className="w-4 h-4 ml-2" />
              פרופיל
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="w-4 h-4 ml-2" />
              התנתק
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}