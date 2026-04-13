import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { CheckCircle2 } from 'lucide-react';

export default function QuickOverrideButton({ scanId, onOverrideApplied }) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedCheckId, setSelectedCheckId] = useState('');
  const [overrideStatus, setOverrideStatus] = useState('remediated');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOpenDialog = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getCheckResults', { scan_job_ids: [scanId] });
      const failedResults = (res.data?.results || []).filter(r => r.status === 'failed');
      setResults(failedResults);
      setOpen(true);
    } catch (err) {
      console.error('Error loading results:', err);
    }
    setLoading(false);
  };

  const handleApplyOverride = async () => {
    if (!selectedCheckId) return;
    setLoading(true);
    try {
      const result = results.find(r => r.id === selectedCheckId);
      if (result) {
        await base44.entities.CheckResult.update(selectedCheckId, {
          override_status: overrideStatus,
          override_note: note,
          override_date: new Date().toISOString(),
        });
        
        // Refresh scan job score
        const allResults = await base44.functions.invoke('getCheckResults', { scan_job_ids: [scanId] });
        const checks = allResults.data?.results || [];
        const scored = checks.filter(c => !c.override_status || c.override_status === 'accepted_risk').length;
        const newScore = scored > 0 ? Math.round((checks.filter(c => c.status === 'passed' || c.override_status === 'remediated').length / scored) * 100) : 0;
        
        await base44.entities.ScanJob.update(scanId, { overall_score: newScore });
        
        setOpen(false);
        setSelectedCheckId('');
        setNote('');
        if (onOverrideApplied) onOverrideApplied();
      }
    } catch (err) {
      console.error('Error applying override:', err);
    }
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={handleOpenDialog}
        disabled={loading}
        className="p-2 rounded-lg hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400 transition-colors disabled:opacity-50"
        title="הוסף override"
      >
        <CheckCircle2 className="w-4 h-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>הוסף Override לבדיקה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">בדיקה</label>
              <Select value={selectedCheckId} onValueChange={setSelectedCheckId}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר בדיקה שנכשלה" />
                </SelectTrigger>
                <SelectContent>
                  {results.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.check_id} — {r.check_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">סטטוס Override</label>
              <Select value={overrideStatus} onValueChange={setOverrideStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remediated">תוקן</SelectItem>
                  <SelectItem value="compensating_control">בקרה משלימה</SelectItem>
                  <SelectItem value="accepted_risk">סיכון מקובל</SelectItem>
                  <SelectItem value="not_applicable">לא רלוונטי</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">הערה (אופציונלי)</label>
              <Textarea
                placeholder="הסבירו את ה-override..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-20 text-xs"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading} className="flex-1">
                ביטול
              </Button>
              <Button onClick={handleApplyOverride} disabled={loading || !selectedCheckId} className="flex-1">
                {loading ? 'שומר...' : 'שמור'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}