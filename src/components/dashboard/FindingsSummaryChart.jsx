import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { DEMO_SCANS } from "@/lib/demoData";

const COLORS = {
  passed: '#22c55e',
  failed: '#ef4444',
  warning: '#f59e0b',
  manual: '#3b82f6',
  not_applicable: '#64748b',
  error: '#dc2626',
};

const LABELS = {
  passed: 'עבר',
  failed: 'נכשל',
  warning: 'אזהרה',
  manual: 'ידני',
  not_applicable: 'לא רלוונטי',
  error: 'שגיאה',
};

export default function FindingsSummaryChart({ scanId }) {
  const scan = DEMO_SCANS.find(s => s.id === (scanId || 'scan-001'));
  if (!scan) return null;
  
  const data = Object.entries(scan.summary)
    .filter(([_, v]) => v > 0)
    .map(([key, value]) => ({ name: LABELS[key], value, key }));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-2">סיכום ממצאים</h3>
      <p className="text-xs text-muted-foreground mb-4">{scan.tenant_name}</p>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={data}
              innerRadius={40}
              outerRadius={65}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={COLORS[entry.key]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                background: 'hsl(222, 40%, 9%)', 
                border: '1px solid hsl(222, 30%, 16%)',
                borderRadius: '8px',
                fontSize: '12px',
                direction: 'rtl'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-2">
          {data.map(item => (
            <div key={item.key} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[item.key] }} />
              <span className="text-xs text-muted-foreground">{item.name}</span>
              <span className="text-xs font-bold text-foreground mr-auto">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}