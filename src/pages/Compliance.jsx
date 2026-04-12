import { useState, useEffect } from "react";
import { Shield, CheckCircle2, XCircle, AlertTriangle, Eye } from "lucide-react";
import { DOMAIN_META } from "@/lib/security-checks";
import ScoreRing from "@/components/shared/ScoreRing";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Compliance() {
  const [results, setResults] = useState([]);
  const [scans, setScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState('latest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async user => {
      const allScans = await base44.entities.ScanJob.filter({ created_by: user.email }, '-created_date', 50);
      const completedScans = allScans.filter(sc => sc.status === 'completed');
      setScans(completedScans);
      if (completedScans.length === 0) { setLoading(false); return; }
      if (completedScans.length > 0) setSelectedScan(completedScans[0].id);
      const res = await base44.functions.invoke('getCheckResults', { scan_job_ids: completedScans.map(s => s.id) });
      setResults(res.data?.results || []);
      setLoading(false);
    });
  }, []);

  const latestScanId = scans[0]?.id;
  const activeScanId = selectedScan === 'latest' ? latestScanId : selectedScan;
  const filtered = activeScanId ? results.filter(r => r.scan_job_id === activeScanId) : results;

  const totalChecks = filtered.length;
  const passed = filtered.filter(r => r.status === 'passed').length;
  const failed = filtered.filter(r => r.status === 'failed').length;
  const warnings = filtered.filter(r => r.status === 'warning').length;
  const manual = filtered.filter(r => r.status === 'manual').length;
  const score = (passed + failed + warnings) > 0 ? Math.round((passed / (passed + failed + warnings)) * 100) : 0;

  const domainGroups = {};
  filtered.forEach(r => {
    if (!domainGroups[r.domain]) {
      domainGroups[r.domain] = { results: [], passed: 0, failed: 0, warning: 0, total: 0 };
    }
    domainGroups[r.domain].results.push(r);
    domainGroups[r.domain].total++;
    if (r.status === 'passed') domainGroups[r.domain].passed++;
    if (r.status === 'failed') domainGroups[r.domain].failed++;
    if (r.status === 'warning') domainGroups[r.domain].warning++;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">תאימות CIS Benchmark</h1>
          <p className="text-sm text-muted-foreground mt-1">CIS Microsoft 365 Foundations Benchmark v6.0.1</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">אין סריקות מושלמות עדיין — הפעל סריקה ראשונה כדי לראות תאימות</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">תאימות CIS Benchmark</h1>
          <p className="text-sm text-muted-foreground mt-1">CIS Microsoft 365 Foundations Benchmark v6.0.1</p>
        </div>
        <Select value={selectedScan} onValueChange={setSelectedScan}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">סריקה אחרונה</SelectItem>
            {scans.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.tenant_name} — {new Date(s.created_date).toLocaleDateString('he-IL')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-card border border-border rounded-xl p-6 flex items-center gap-6">
          <ScoreRing score={score} size={130} />
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-1">רמת תאימות</h2>
            <p className="text-3xl font-bold text-foreground">{score}%</p>
            <p className="text-xs text-muted-foreground mt-2">{passed} מתוך {totalChecks} בדיקות עברו</p>
          </div>
        </div>
        <div className="lg:col-span-8 grid grid-cols-4 gap-4">
          <SummaryCard icon={CheckCircle2} label="עבר" count={passed} color="green" />
          <SummaryCard icon={XCircle} label="נכשל" count={failed} color="red" />
          <SummaryCard icon={AlertTriangle} label="אזהרה" count={warnings} color="amber" />
          <SummaryCard icon={Eye} label="ידני" count={manual} color="blue" />
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(domainGroups).map(([domain, group]) => {
          const meta = DOMAIN_META[domain] || {};
          const pct = Math.round((group.passed / group.total) * 100);
          return (
            <div key={domain} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{meta.labelHe || domain}</h3>
                    <p className="text-xs text-muted-foreground">{group.total} בדיקות</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-green-400 font-bold">{group.passed} עבר</span>
                    <span className="text-red-400 font-bold">{group.failed} נכשל</span>
                    {group.warning > 0 && <span className="text-amber-400 font-bold">{group.warning} אזהרה</span>}
                  </div>
                  <div className="w-24 text-left">
                    <span className={cn("text-lg font-bold",
                      pct >= 80 ? "text-green-400" : pct >= 50 ? "text-amber-400" : "text-red-400"
                    )}>{pct}%</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-border divide-y divide-border">
                {group.results.map(r => (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/20 transition-colors">
                    <StatusIcon status={r.status} />
                    <code className="text-[10px] font-mono text-primary w-16 flex-shrink-0">{r.check_id}</code>
                    <span className="text-xs text-foreground flex-1">{r.check_title}</span>
                    <span className="text-[10px] text-muted-foreground max-w-xs truncate text-left">{r.actual_value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, count, color }) {
  const colorMap = {
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  return (
    <div className={cn("border rounded-xl p-4 text-center", colorMap[color])}>
      <Icon className="w-5 h-5 mx-auto mb-2" />
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs mt-1">{label}</div>
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === 'passed') return <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />;
  if (status === 'failed') return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
  if (status === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />;
  if (status === 'manual') return <Eye className="w-4 h-4 text-blue-400 flex-shrink-0" />;
  return <div className="w-4 h-4 rounded-full bg-slate-500/20 flex-shrink-0" />;
}