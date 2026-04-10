import { cn } from "@/lib/utils";
import { STATUS_META } from "@/lib/security-checks";
import { CheckCircle2, XCircle, AlertTriangle, Eye, MinusCircle, AlertOctagon } from "lucide-react";

const STATUS_ICONS = {
  passed: CheckCircle2,
  failed: XCircle,
  warning: AlertTriangle,
  manual: Eye,
  not_applicable: MinusCircle,
  error: AlertOctagon,
};

export default function StatusBadge({ status, size = "default", showIcon = true }) {
  const meta = STATUS_META[status] || STATUS_META.error;
  const Icon = STATUS_ICONS[status] || AlertOctagon;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 font-medium rounded-md border",
      meta.bgClass, meta.textClass, meta.borderClass,
      size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
    )}>
      {showIcon && <Icon className={cn(size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")} />}
      {meta.label}
    </span>
  );
}