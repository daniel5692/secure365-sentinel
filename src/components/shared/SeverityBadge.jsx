import { cn } from "@/lib/utils";
import { SEVERITY_META } from "@/lib/security-checks";

export default function SeverityBadge({ severity, size = "default" }) {
  const meta = SEVERITY_META[severity] || SEVERITY_META.informational;
  
  return (
    <span className={cn(
      "inline-flex items-center font-medium rounded-md border",
      meta.bgClass, meta.textClass, meta.borderClass,
      size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
    )}>
      {meta.label}
    </span>
  );
}