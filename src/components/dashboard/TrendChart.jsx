import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DEMO_SCORE_HISTORY } from "@/lib/demoData";

export default function TrendChart() {
  const data = DEMO_SCORE_HISTORY.map(d => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString('he-IL', { month: 'short', year: '2-digit' }),
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1">מגמת ציון אבטחה</h3>
      <p className="text-xs text-muted-foreground mb-4">Acme Technologies Production</p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 14%)" />
          <XAxis 
            dataKey="dateLabel" 
            tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} 
            axisLine={{ stroke: 'hsl(222, 30%, 14%)' }}
            tickLine={false}
          />
          <YAxis 
            domain={[0, 100]} 
            tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} 
            axisLine={{ stroke: 'hsl(222, 30%, 14%)' }}
            tickLine={false}
            orientation="right"
          />
          <Tooltip 
            contentStyle={{ 
              background: 'hsl(222, 40%, 9%)', 
              border: '1px solid hsl(222, 30%, 16%)',
              borderRadius: '8px',
              fontSize: '12px',
              direction: 'rtl'
            }}
            formatter={(value) => [`${value}`, 'ציון']}
          />
          <Area 
            type="monotone" 
            dataKey="score" 
            stroke="hsl(217, 91%, 60%)" 
            strokeWidth={2}
            fill="url(#scoreGradient)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}