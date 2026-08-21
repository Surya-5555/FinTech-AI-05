import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../../api/client';
import { formatMoneyMinor } from '../../lib/money';
import { Activity, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Console</h1>
          <p className="text-gray-500 mt-1">Real-time revenue recovery metrics</p>
        </div>
        <div className="text-sm text-gray-400">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Revenue at Risk" 
          value={formatMoneyMinor(summary?.totalAtRiskMinor || 0)} 
          icon={<AlertCircle className="h-5 w-5 text-amber-500" />} 
        />
        <MetricCard 
          title="Total Recovered" 
          value={formatMoneyMinor(summary?.totalRecoveredMinor || 0)} 
          icon={<CheckCircle className="h-5 w-5 text-emerald-500" />} 
        />
        <MetricCard 
          title="Recovery Rate" 
          value={`${((summary?.recoveryRate || 0) * 100).toFixed(1)}%`} 
          icon={<Activity className="h-5 w-5 text-blue-500" />} 
        />
        <MetricCard 
          title="Active Escalations" 
          value={summary?.activeEscalations || 0} 
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />} 
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-medium text-gray-900">Recovery Funnel</h2>
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
