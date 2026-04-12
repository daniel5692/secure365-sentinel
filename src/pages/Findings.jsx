import { useState, useEffect } from "react";
import { Search, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOMAIN_META } from "@/lib/security-checks";
import SeverityBadge from "@/components/shared/SeverityBadge";
import StatusBadge from "@/components/shared/StatusBadge";
import FindingDetail from "@/components/findings/FindingDetail";
import { base44 } from "@/api/base44Client";

export default function Findings() {
  const [results, setResults] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');
  const [expandedFinding, setExpandedFinding] = useState(null);

  // Read scan param from URL
  const urlParams = new URLSearchParams(window.location.search);
  const urlScanId = urlParams.get('scan');
  const [selectedScan, setSelectedScan] = useState(urlScanId || 'all');

  useEffect(() => {
    base44.auth.me().then(async user => {
      const allScans = await base44.entities.ScanJob.filter({ created_by: user.email }, '-created_date', 50);
      const completedScans = allScans.filter(sc => sc.status === 'completed');
      setScans(completedScans);
      if (completedScans.length === 0) { setLoading(false); return; }
      const res = await base44.functions.invoke('getCheckResults', { scan_job_ids: completedScans.map(s => s.id) });
      setResults(res.data?.results || []);
      setLoading(false);
    });
  }, []);

  const filtered = results.filter(r => {
    if (selectedScan !== 'all' && r.scan_job_id !== selectedScan) return false;
    if (search && !r.check_title?.toLowerCase().includes(search.toLowerCase()) && !r.check_id?.toLowerCase().includes(search.toLowerCase())) return false;
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (domainFilter !== 'all' && r.domain !== domainFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ממצאי אבטחה</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'טוען...' : `${filtered.length} ממצאים${selectedScan !== 'all' ? ` בסריקה זו` : ' בסך הכל'}`}
          </p>
        </div>
        <Select value={selectedScan} onValueChange={setSelectedScan}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="בחר סריקה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסריקות</SelectItem>
            {scans.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.tenant_name} — {s.created_date ? new Date(s.created_date).toLocaleDateString('he-IL') : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי כותרת או מזהה בדיקה..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="חומרה" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל החומרות</SelectItem>
            <SelectItem value="critical">קריטי</SelectItem>
            <SelectItem value="high">גבוה</SelectItem>
            <SelectItem value="medium">בינוני</SelectItem>
            <SelectItem value="low">נמוך</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="סטטוס" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="passed">עבר</SelectItem>
            <SelectItem value="failed">נכשל</SelectItem>
            <SelectItem value="warning">אזהרה</SelectItem>
            <SelectItem value="manual">ידני</SelectItem>
          </SelectContent>
        </Select>
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="תחום" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל התחומים</SelectItem>
            {Object.entries(DOMAIN_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>{meta.labelHe}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {results.length === 0 ? 'אין ממצאים עדיין — הפעל סריקה ראשונה' : 'לא נמצאו ממצאים התואמים לפילטרים'}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 bg-secondary/30 text-xs font-semibold text-muted-foreground border-b border-border">
            <div className="col-span-1">מזהה</div>
            <div className="col-span-4">בדיקה</div>
            <div className="col-span-2">תחום</div>
            <div className="col-span-2">חומרה</div>
            <div className="col-span-2">סטטוס</div>
            <div className="col-span-1"></div>
          </div>
          <div className="divide-y divide-border">
            {filtered.map(result => (
              <div key={result.id}>
                <div
                  className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-secondary/20 transition-colors cursor-pointer"
                  onClick={() => setExpandedFinding(expandedFinding === result.id ? null : result.id)}
                >
                  <div className="col-span-1">
                    <code className="text-[10px] font-mono text-primary">{result.check_id}</code>
                  </div>
                  <div className="col-span-4">
                    <div className="text-xs font-medium text-foreground">{result.check_title}</div>
                    {result.explanation_he && (
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{result.explanation_he}</div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground">{DOMAIN_META[result.domain]?.labelHe || result.domain || '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <SeverityBadge severity={result.severity} size="sm" />
                  </div>
                  <div className="col-span-2">
                    <StatusBadge status={result.status} size="sm" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <ChevronLeft className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expandedFinding === result.id ? '-rotate-90' : ''}`} />
                  </div>
                </div>
                {expandedFinding === result.id && (
                  <FindingDetail finding={result} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}