import { Activity, ArrowUpDown } from "lucide-react";
import { DEMO_SCANS, DEMO_SCORE_HISTORY } from "@/lib/demoData";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function History() {
  const chartData = DEMO_SCORE_HISTORY.map(d => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' }),
  }));

  // Compare last 2 scans
  const latestScan = DEMO_SCANS[0];
  const previousScan = DEMO_SCANS[1];
  const scoreDiff = latestScan && previousScan ? latestScan.overall_score - previousScan.overall_score : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">היסטוריית סריקות</h1>
        <p className="text-sm text-muted-foreground mt-1">השוואת מגמות ושיפורים לאורך זמן</p>
      </div>

      {/* Score Trend */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">מגמת ציון אבטחה לאורך זמן</h3>
        <p className="text-xs text-muted-foreground mb-4">Acme Technologies Production</p>
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

      {/* Scan Comparison */}
      {latestScan && previousScan && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-primary" />
            השוואת סריקות אחרונות
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CompareCard
              label="ציון כולל"
              current={latestScan.overall_score}
              previous={previousScan.overall_score}
              suffix=""
            />
            <CompareCard
              label="בדיקות שעברו"
              current={latestScan.summary.passed}
              previous={previousScan.summary.passed}
              suffix=""
            />
            <CompareCard
              label="בדיקות שנכשלו"
              current={latestScan.summary.failed}
              previous={previousScan.summary.failed}
              suffix=""
              invertColors
            />
          </div>
        </div>
      )}

      {/* All Scans Timeline */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">ציר זמן סריקות</h3>
        <div className="space-y-3">
          {DEMO_SCANS.map((scan, i) => (
            <div key={scan.id} className="flex items-center gap-4 p-4 rounded-lg bg-secondary/20">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{scan.tenant_name}</div>
                <div className="text-xs text-muted-foreground">{moment(scan.started_at).format('DD/MM/YYYY HH:mm')}</div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">עבר</div>
                  <div className="text-sm font-bold text-green-400">{scan.summary.passed}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">נכשל</div>
                  <div className="text-sm font-bold text-red-400">{scan.summary.failed}</div>
                </div>
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold",
                  scan.overall_score >= 80 ? "bg-green-500/10 text-green-400" :
                  scan.overall_score >= 60 ? "bg-amber-500/10 text-amber-400" :
                  "bg-red-500/10 text-red-400"
                )}>
                  {scan.overall_score}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompareCard({ label, current, previous, suffix = '', invertColors = false }) {
  const diff = current - previous;
  const isPositive = invertColors ? diff < 0 : diff > 0;

  return (
    <div className="p-4 rounded-lg bg-secondary/30 text-center">
      <div className="text-xs text-muted-foreground mb-2">{label}</div>
      <div className="text-3xl font-bold text-foreground">{current}{suffix}</div>
      <div className={cn(
        "text-xs font-medium mt-1",
        isPositive ? "text-green-400" : diff === 0 ? "text-muted-foreground" : "text-red-400"
      )}>
        {diff > 0 ? `+${diff}` : diff}{suffix} מהסריקה הקודמת
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">קודם: {previous}{suffix}</div>
    </div>
  );
}