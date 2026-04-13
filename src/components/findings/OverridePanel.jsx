import { useState } from "react";
import { ShieldCheck, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const OVERRIDE_OPTIONS = [
  { value: "remediated",           label: "טופל / תוקן",              desc: "הבעיה תוקנה ידנית" },
  { value: "compensating_control", label: "כלי צד שלישי מכסה",        desc: "פתרון חלופי מספק הגנה מקבילה" },
  { value: "accepted_risk",        label: "סיכון מקובל",              desc: "הסיכון הוערך ואושר על ידי הנהלה" },
  { value: "not_applicable",       label: "לא רלוונטי לסביבה זו",     desc: "הבדיקה לא חלה על סביבה זו" },
];

export default function OverridePanel({ finding, onSave, onClear, saving }) {
  const [selectedOverride, setSelectedOverride] = useState(finding.override_status || '');
  const [note, setNote] = useState(finding.override_note || '');

  const hasExistingOverride = !!finding.override_status;
  const selectedOption = OVERRIDE_OPTIONS.find(o => o.value === selectedOverride);

  return (
    <div className={cn(
      "rounded-xl border p-5 space-y-4",
      hasExistingOverride
        ? "bg-purple-500/5 border-purple-500/30"
        : "bg-secondary/20 border-border"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className={cn("w-4 h-4", hasExistingOverride ? "text-purple-400" : "text-muted-foreground")} />
          <h3 className={cn("text-sm font-semibold", hasExistingOverride ? "text-purple-400" : "text-foreground")}>
            {hasExistingOverride ? "Override פעיל" : "הגדר Override"}
          </h3>
        </div>
        {hasExistingOverride && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={saving}
            className="text-xs text-muted-foreground hover:text-destructive h-7"
          >
            <X className="w-3 h-3 ml-1" />
            בטל Override
          </Button>
        )}
      </div>

      {hasExistingOverride && (
        <div className="text-xs text-muted-foreground">
          הוגדר על ידי <span className="text-foreground font-medium">{finding.override_by}</span>
          {finding.override_date && ` • ${new Date(finding.override_date).toLocaleDateString('he-IL')}`}
        </div>
      )}

      <div className="space-y-3">
        <Select value={selectedOverride} onValueChange={setSelectedOverride}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="בחר סיבת Override..." />
          </SelectTrigger>
          <SelectContent>
            {OVERRIDE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                <div>
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedOption && (
          <div className="text-xs text-muted-foreground bg-purple-500/5 border border-purple-500/20 rounded-lg px-3 py-2">
            {selectedOption.desc}
          </div>
        )}

        <textarea
          className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="הוסף הערה (אופציונלי) — למשל: שם הכלי החלופי, תיקט, תאריך טיפול..."
          rows={3}
          value={note}
          onChange={e => setNote(e.target.value)}
          dir="rtl"
        />
      </div>

      <Button
        size="sm"
        onClick={() => onSave(selectedOverride, note)}
        disabled={!selectedOverride || saving}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
      >
        <Save className="w-3 h-3 ml-1" />
        {saving ? 'שומר...' : hasExistingOverride ? 'עדכן Override' : 'שמור Override'}
      </Button>
    </div>
  );
}