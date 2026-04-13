import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { base44 } from '@/api/base44Client';
import { ChevronDown, Loader2 } from 'lucide-react';

export default function QuickOverrideMenu({ finding, onOverrideChange }) {
  const [loading, setLoading] = useState(false);

  const handleOverride = async (status) => {
    setLoading(true);
    try {
      await base44.entities.CheckResult.update(finding.id, {
        override_status: status,
        override_date: new Date().toISOString(),
      });
      onOverrideChange({ ...finding, override_status: status });
    } catch (err) {
      console.error('Error applying override:', err);
    }
    setLoading(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          title="Override אפשרויות"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => handleOverride('remediated')}
          className={finding.override_status === 'remediated' ? 'bg-primary/10' : ''}
        >
          <span className="text-xs">תוקן</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleOverride('compensating_control')}
          className={finding.override_status === 'compensating_control' ? 'bg-primary/10' : ''}
        >
          <span className="text-xs">בקרה משלימה</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleOverride('accepted_risk')}
          className={finding.override_status === 'accepted_risk' ? 'bg-primary/10' : ''}
        >
          <span className="text-xs">סיכון מקובל</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleOverride('not_applicable')}
          className={finding.override_status === 'not_applicable' ? 'bg-primary/10' : ''}
        >
          <span className="text-xs">לא רלוונטי</span>
        </DropdownMenuItem>
        {finding.override_status && (
          <>
            <div className="border-t my-1" />
            <DropdownMenuItem
              onClick={() => handleOverride(null)}
              className="text-destructive"
            >
              <span className="text-xs">הסר Override</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}