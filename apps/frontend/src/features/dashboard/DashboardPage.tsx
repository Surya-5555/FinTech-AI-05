import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../../api/client';
import { formatMoneyMinor } from '../../lib/money';
import { Activity, CheckCircle, AlertTriangle, AlertCircle, TrendingUp, XCircle, ShieldOff } from 'lucide-react';

export function DashboardPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: () => ApiClient.get<any>('/dashboard/summary')
  });

  const { data: funnel } = useQuery({
    queryKey: ['dashboardFunnel'],
    queryFn: () => ApiClient.get<any>('/dashboard/recovery-funnel')
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
  }

  const falseInterventionRate = summary?.interventionsByStatus?.FAILED 
    ? (summary.interventionsByStatus.FAILED / (Object.values(summary.interventionsByStatus) as number[]).reduce((a, b) => a + b, 0) * 100).toFixed(1)
    : '0.0';

  const stoppedCount = funnel?.STOPPED?.count || 0;
  const escalatedCount = funnel?.ESCALATED?.count || summary?.activeEscalations || 0;
  const policyBlockedCount = funnel?.POLICY_BLOCKED?.count || 0; // Using funnel data or 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Recovery Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time AI revenue recovery metrics (Track 03)</p>
        </div>
        <div className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          ● Data Mode: {summary?.dataMode || 'LIVE'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Revenue at Risk" 
          value={formatMoneyMinor(summary?.totalAtRiskMinor || 0)} 
          icon={<AlertCircle className="h-5 w-5 text-amber-500" />} 
        />
        <MetricCard 
          title="Baseline Recovered" 
          value={formatMoneyMinor(summary?.baselineRecoveredMinor || 0)} 
          icon={<CheckCircle className="h-5 w-5 text-gray-400" />} 
        />
        <MetricCard 
          title="System Recovered" 
          value={formatMoneyMinor(summary?.totalRecoveredMinor || 0)} 
          icon={<CheckCircle className="h-5 w-5 text-emerald-500" />} 
        />
        <MetricCard 
          title="Incremental Recovery" 
          value={formatMoneyMinor(summary?.incrementalRecoveredMinor || 0)} 
          icon={<TrendingUp className="h-5 w-5 text-blue-500" />} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <MetricCard 
          title="Recovery Rate" 
          value={`${((summary?.recoveryRate || 0) * 100).toFixed(1)}%`} 
          icon={<Activity className="h-5 w-5 text-blue-500" />} 
        />
        <MetricCard 
          title="False Intervention Rate" 
          value={`${falseInterventionRate}%`} 
          icon={<XCircle className="h-5 w-5 text-red-500" />} 
        />
        <MetricCard 
          title="Active Escalations" 
          value={escalatedCount} 
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />} 
        />
        <MetricCard 
          title="Stopped / Policy Blocked" 
          value={`${stoppedCount} / ${policyBlockedCount}`} 
          icon={<ShieldOff className="h-5 w-5 text-red-600" />} 
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-medium text-gray-900">System Recovery Funnel</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {funnel && Object.entries(funnel).map(([stage, data]: [string, any]) => (
              <div key={stage} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="text-xs font-semibold text-gray-500 mb-1">{stage}</div>
                <div className="text-xl font-bold text-gray-900">{data.count}</div>
                <div className="text-xs text-gray-400 mt-1">{formatMoneyMinor(data.amountMinor)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
