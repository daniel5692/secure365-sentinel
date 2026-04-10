import { DOMAIN_META } from "@/lib/security-checks";
import { DEMO_RESULTS } from "@/lib/demoData";
import { cn } from "@/lib/utils";

export default function DomainBreakdown({ results = DEMO_RESULTS }) {
  const domainStats = {};
  results.forEach(r => {
    if (!domainStats[r.domain]) {
      domainStats[r.domain] = { total: 0, passed: 0, failed: 0, warning: 0 };
    }
    domainStats[r.domain].total++;
    if (r.status === 'passed') domainStats[r.domain].passed++;
    if (r.status === 'failed') domainStats[r.domain].failed++;
    if (r.status === 'warning') domainStats[r.domain].warning++;
  });

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">ממצאים לפי תחום</h3>
      <div className="space-y-3">
        {Object.entries(domainStats).map(([domain, stats]) => {
          const meta = DOMAIN_META[domain] || {};
          const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
          return (
            <div key={domain} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground truncate">{meta.labelHe || domain}</span>
                  <span className="text-[10px] text-muted-foreground mr-2">{stats.passed}/{stats.total}</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      passRate >= 80 ? "bg-green-500" : passRate >= 50 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${passRate}%` }}
                  />
                </div>
              </div>
              <span className={cn(
                "text-xs font-bold w-10 text-left",
                passRate >= 80 ? "text-green-400" : passRate >= 50 ? "text-amber-400" : "text-red-400"
              )}>
                {passRate}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}