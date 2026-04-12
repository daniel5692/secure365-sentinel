import { Shield, AlertTriangle, CheckCircle2, Server, Scan, Plus } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import ScoreRing from "@/components/shared/ScoreRing";
import DomainBreakdown from "@/components/dashboard/DomainBreakdown";
import RecentScans from "@/components/dashboard/RecentScans";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [scans, setScans] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // Handle Microsoft consent callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const adminConsent = params.get('admin_consent');
    const returnedTenantId = params.get('tenant');
    const error = params.get('error');

    if (adminConsent === 'True' && returnedTenantId) {
      const savedName = localStorage.getItem('pending_tenant_name') || returnedTenantId;
      localStorage.removeItem('pending_tenant_name');
      base44.entities.ConnectedTenant.create({
        tenant_name: savedName,
        tenant_id: returnedTenantId,
        workspace_id: user?.id || 'default',
        connection_status: 'connected',
        consent_date: new Date().toISOString(),
        total_scans: 0,
      }).then(() => {
        window.history.replaceState({}, '', '/');
        navigate('/tenants');
      });
    } else if (error) {
      localStorage.removeItem('pending_tenant_name');
      window.history.replaceState({}, '', '/');
      navigate('/tenants?error=' + encodeURIComponent(params.get('error_description') || error));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      base44.entities.ConnectedTenant.filter({ created_by: user.email }),
      base44.entities.ScanJob.filter({ created_by: user.email }, '-created_date', 10),
      base44.entities.CheckResult.filter({ created_by: user.email }, '-created_date', 100),
    ]).then(([t, s, r]) => {
      setTenants(t);
      setScans(s);
      setResults(r);
      setLoading(false);
    });
  }, [user]);

  const latestScan = scans[0];
  const failedResults = results.filter(r => r.status === 'failed');
  const criticalFailed = failedResults.filter(r => r.severity === 'critical');
  const connectedTenants = tenants.filter(t => t.connection_status === 'connected');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Empty state - no tenants yet
  if (tenants.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">דשבורד אבטחה</h1>
          <p className="text-sm text-muted-foreground mt-1">סקירה כללית של מצב האבטחה בסביבות Microsoft 365</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">ברוכים הבאים!</h3>
          <p className="text-sm text-muted-foreground mb-2 max-w-md mx-auto">
            כדי להתחיל, חבר את הטננט הראשון שלך ב-Microsoft 365 והפעל סריקת אבטחה.
          </p>
          <p className="text-xs text-muted-foreground mb-8">הסריקה מבוססת על CIS Microsoft 365 Foundations Benchmark v3.1.0 ודורשת הרשאות קריאה בלבד.</p>
          <Link to="/tenants">
            <Button className="gap-2 px-8">
              <Plus className="w-4 h-4" />
              חבר טננט ראשון
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">דשבורד אבטחה</h1>
          <p className="text-sm text-muted-foreground mt-1">סקירה כללית של מצב האבטחה בסביבות Microsoft 365</p>
        </div>
        <Link to="/scans">
          <Button className="gap-2">
            <Scan className="w-4 h-4" />
            הפעל סריקה חדשה
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-card border border-border rounded-xl p-6 flex items-center gap-6">
          <ScoreRing score={latestScan?.overall_score || 0} size={130} />
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-1">ציון אבטחה כולל</h2>
            <p className="text-lg font-bold text-foreground">{latestScan?.tenant_name || '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {latestScan?.completed_at ? `סריקה אחרונה: ${new Date(latestScan.completed_at).toLocaleDateString('he-IL')}` : 'טרם בוצעה סריקה'}
            </p>
          </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="טננטים מחוברים" value={connectedTenants.length} subtitle={`מתוך ${tenants.length}`} icon={Server} variant="info" />
          <StatCard title="בדיקות שעברו" value={latestScan?.summary?.passed || 0} subtitle={`מתוך ${latestScan?.total_checks || 0}`} icon={CheckCircle2} variant="success" />
          <StatCard title="ממצאים שנכשלו" value={failedResults.length} subtitle="דורשים טיפול" icon={AlertTriangle} variant="danger" />
          <StatCard title="ממצאים קריטיים" value={criticalFailed.length} subtitle="עדיפות גבוהה" icon={Shield} variant="danger" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DomainBreakdown results={results} />
        <RecentScans scans={scans} />
      </div>

      {criticalFailed.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-400">ממצאים קריטיים הדורשים טיפול מיידי</h3>
              <p className="text-xs text-muted-foreground">נמצאו {criticalFailed.length} ממצאים קריטיים</p>
            </div>
          </div>
          <div className="space-y-2">
            {criticalFailed.slice(0, 5).map(f => (
              <Link key={f.id} to={`/findings?check=${f.check_id}`} className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 hover:bg-red-500/10 transition-colors">
                <span className="text-xs font-mono text-red-400">{f.check_id}</span>
                <span className="text-xs text-foreground">{f.check_title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}