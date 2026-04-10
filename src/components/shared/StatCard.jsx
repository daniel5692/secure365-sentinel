import { cn } from "@/lib/utils";

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, variant = "default" }) {
  const variants = {
    default: "border-border",
    success: "border-green-500/20 glow-green",
    danger: "border-red-500/20 glow-red",
    warning: "border-amber-500/20 glow-amber",
    info: "border-blue-500/20 glow-blue",
  };

  return (
    <div className={cn(
      "bg-card border rounded-xl p-5 transition-all hover:border-primary/30",
      variants[variant]
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-medium text-muted-foreground">{title}</div>
        {Icon && (
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center",
            variant === "success" ? "bg-green-500/10" : 
            variant === "danger" ? "bg-red-500/10" :
            variant === "warning" ? "bg-amber-500/10" :
            "bg-primary/10"
          )}>
            <Icon className={cn(
              "w-4.5 h-4.5",
              variant === "success" ? "text-green-400" :
              variant === "danger" ? "text-red-400" :
              variant === "warning" ? "text-amber-400" :
              "text-primary"
            )} />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {(subtitle || trendValue) && (
        <div className="flex items-center gap-2 mt-1">
          {trendValue && (
            <span className={cn(
              "text-xs font-medium",
              trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-muted-foreground"
            )}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : ""} {trendValue}
            </span>
          )}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}