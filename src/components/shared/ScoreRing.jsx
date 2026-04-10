import { cn } from "@/lib/utils";

export default function ScoreRing({ score, size = 120, strokeWidth = 8, className }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  const getColor = () => {
    if (score >= 80) return { stroke: 'hsl(142, 71%, 45%)', text: 'text-green-400', bg: 'text-green-500/10' };
    if (score >= 60) return { stroke: 'hsl(38, 92%, 50%)', text: 'text-amber-400', bg: 'text-amber-500/10' };
    if (score >= 40) return { stroke: 'hsl(15, 75%, 55%)', text: 'text-orange-400', bg: 'text-orange-500/10' };
    return { stroke: 'hsl(0, 72%, 51%)', text: 'text-red-400', bg: 'text-red-500/10' };
  };

  const color = getColor();

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(222, 30%, 14%)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-ring transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-bold", color.text)}>{score}</span>
        <span className="text-[10px] text-muted-foreground font-medium">מתוך 100</span>
      </div>
    </div>
  );
}