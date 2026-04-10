import { Shield, AlertTriangle, CheckCircle2, Server, Scan } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import ScoreRing from "@/components/shared/ScoreRing";
import DomainBreakdown from "@/components/dashboard/DomainBreakdown";
import FindingsSummaryChart from "@/components/dashboard/FindingsSummaryChart";
import TrendChart from "@/components/dashboard/TrendChart";
import RecentScans from "@/components/dashboard/RecentScans";
import { DEMO_WORKSPACE, DEMO_TENANTS, DEMO_SCANS, DEMO_RESULTS } from "@/lib/demoData";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const latestScan = DEMO_SCANS[0];
  const failedResults = DEMO_RESULTS.filter(r => r.status === 'failed');
  const criticalFailed = failedResults.filter(r => r.severity === 'critical');
  const connectedTenants = DEMO_TENANTS.filter(t => t.connection_status === 'connected');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">דשבורד אבטחה</h1>
          <p className="text-sm text-muted-foreground mt-1">
            סקירה כללית של מצב האבטחה בסביבות Microsoft 365
          </p>
        </div>
        <Link to="/scans">
          <Button className="gap-2">
            <Scan className="w-4 h-4" />
            הפעל סריקה חדשה
          </Button>
        </Link>
      </div>

      {/* Score + Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Score Card */}
        <div className="lg:col-span-4 bg-card border border-border rounded-xl p-6 flex items-center gap-6">
          <ScoreRing score={latestScan?.overall_score || 0} size={130} />
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-1">ציון אבטחה כולל</h2>
            <p className="text-lg font-bold text-foreground">{latestScan?.tenant_name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              סריקה אחרונה: {latestScan?.completed_at ? new Date(latestScan.completed_at).toLocaleDateString('he-IL') : 'לא זמין'}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-green-400 font-medium">↑ +7</span>
              <span className="text-xs text-muted-foreground">מהסריקה הקודמת</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="טננטים מחוברים"
            value={connectedTenants.length}
            subtitle={`מתוך ${DEMO_TENANTS.length}`}
            icon={Server}
            variant="info"
          />
          <StatCard
            title="בדיקות שעברו"
            value={latestScan?.summary?.passed || 0}
            subtitle={`מתוך ${latestScan?.total_checks || 0}`}
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            title="ממצאים שנכשלו"
            value={failedResults.length}
            subtitle="דורשים טיפול"
            icon={AlertTriangle}
            variant="danger"
          />
          <StatCard
            title="ממצאים קריטיים"
            value={criticalFailed.length}
            subtitle="עדיפות גבוהה"
            icon={Shield}
            variant="danger"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <TrendChart />
        </div>
        <div className="lg:col-span-4">
          <FindingsSummaryChart />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DomainBreakdown />
        <RecentScans />
      </div>

      {/* Critical Findings Alert */}
      {criticalFailed.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-400">ממצאים קריטיים הדורשים טיפול מיידי</h3>
              <p className="text-xs text-muted-foreground">נמצאו {criticalFailed.length} ממצאים קריטיים בסריקה האחרונה</p>
            </div>
          </div>
          <div className="space-y-2">
            {criticalFailed.map(f => (
              <Link key={f.id} to={`/findings?check=${f.check_id}`} className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 hover:bg-red-500/10 transition-colors">
                <span className="text-xs font-mono text-red-400">{f.check_id}</span>
                <span className="text-xs text-foreground">{f.check_title}</span>
                <span className="text-[10px] text-muted-foreground mr-auto">{f.explanation_he}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}