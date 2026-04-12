import { useState, useEffect } from "react";
import { Activity, ArrowUpDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import moment from "moment";

export default function History() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(user => {
      base44.entities.ScanJob.filter({ created_by: user.email }, '-created_date', 50).then(s => {
        setScans(s.filter(sc => sc.status === 'completed'));
        setLoading(false);
      });
    });
  }, []);

  const chartData = [...scans].reverse().map(s => ({
    dateLabel: new Date(s.created_date).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' }),
    score: s.overall_score || 0,
    name: s.tenant_name,
  }));

  const latestScan = scans[0];
  const previousScan = scans[1];

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
          <h1 className="text-2xl font-bold text-foreground">היסטוריית סריקות</h1>
          <p className="text-sm text-muted-foreground mt-1">השוואת מגמות ושיפורים לאורך זמן</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">אין סריקות מושלמות עדיין — הפעל סריקה ראשונה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">היסטוריית סריקות</h1>
        <p className="text-sm text-muted-foreground mt-1">השוואת מגמות ושיפורים לאורך זמן</p>
      </div>

      {/* Score Trend */}
      {chartData.length >= 2 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-1">מגמת ציון אבטחה לאורך זמן</h3>
          <p className="text-xs text-muted-foreground mb-4">{scans.map(s => s.tenant_name).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 14%)" />
              <XAxis dataKey="dateLabel" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} orientation="right" />
              <Tooltip
                contentStyle={{ background: 'hsl(222, 40%, 9%)', border: '1px solid hsl(222, 30%, 16%)', borderRadius: '8px', fontSize: '12px', direction: 'rtl' }}
                formatter={(value) => [`${value}`, 'ציון']}
              />
              <Area type="monotone" dataKey="score" stroke="hsl(217, 91%, 60%)" strokeWidth={2} fill="url(#histGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Scan Comparison */}
      {latestScan && previousScan && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-primary" />
            השוואת שתי הסריקות האחרונות
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CompareCard label="ציון כולל" current={latestScan.overall_score} previous={previousScan.overall_score} />
            <CompareCard label="בדיקות שעברו" current={latestScan.summary?.passed || 0} previous={previousScan.summary?.passed || 0} />
            <CompareCard label="בדיקות שנכשלו" current={latestScan.summary?.failed || 0} previous={previousScan.summary?.failed || 0} invertColors />
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">ציר זמן סריקות</h3>
        <div className="space-y-3">
          {scans.map(scan => (
            <div key={scan.id} className="flex items-center gap-4 p-4 rounded-lg bg-secondary/20">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{scan.tenant_name}</div>
                <div className="text-xs text-muted-foreground">{moment(scan.started_at || scan.created_date).format('DD/MM/YYYY HH:mm')}</div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">עבר</div>
                  <div className="text-sm font-bold text-green-400">{scan.summary?.passed || 0}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">נכשל</div>
                  <div className="text-sm font-bold text-red-400">{scan.summary?.failed || 0}</div>
                </div>
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold",
                  (scan.overall_score || 0) >= 80 ? "bg-green-500/10 text-green-400" :
                  (scan.overall_score || 0) >= 60 ? "bg-amber-500/10 text-amber-400" :
                  "bg-red-500/10 text-red-400"
                )}>
                  {scan.overall_score || 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompareCard({ label, current, previous, invertColors = false }) {
  const diff = current - previous;
  const isPositive = invertColors ? diff < 0 : diff > 0;
  return (
    <div className="p-4 rounded-lg bg-secondary/30 text-center">
      <div className="text-xs text-muted-foreground mb-2">{label}</div>
      <div className="text-3xl font-bold text-foreground">{current}</div>
      <div className={cn("text-xs font-medium mt-1", isPositive ? "text-green-400" : diff === 0 ? "text-muted-foreground" : "text-red-400")}>
        {diff > 0 ? `+${diff}` : diff} מהסריקה הקודמת
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">קודם: {previous}</div>
    </div>
  );
}