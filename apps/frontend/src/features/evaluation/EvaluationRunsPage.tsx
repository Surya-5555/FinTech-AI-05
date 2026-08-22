import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../../api/client';
import { formatDate } from '../../lib/dates';
import { formatMoneyMinor } from '../../lib/money';
import { FileText, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useMemo } from 'react';

export function EvaluationRunsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['evaluationRuns'],
    queryFn: () => ApiClient.get<any>('/evaluation/runs')
  });

  const latestRun = data?.runs?.[0];

  const revenueChartData = useMemo(() => {
    if (!latestRun) return [];
    
    // We convert BigInt-like strings from minor units to standard units for the chart
    const toStandard = (minor: string | number) => Number(minor) / 100;
    
    return [
      {
        name: 'Revenue Scenarios',
        'At Risk': toStandard(latestRun.totalAtRiskMinor || 0),
        'Baseline Recovered': toStandard(latestRun.baseline1RecoveredMinor || 0),
        'System Recovered': toStandard(latestRun.systemRecoveredMinor || 0)
      }
    ];
  }, [latestRun]);

  const outcomeChartData = useMemo(() => {
    if (!latestRun) return [];
    
    const recovered = latestRun.interventionsSucceeded || 0;
    const failed = latestRun.failedInterventions || 0;
    const stopped = latestRun.stoppedCaseCount || 0;
    const escalated = latestRun.escalationCount || 0;
    const policyBlocked = (latestRun.policyBlockCount || 0) + (latestRun.consentBlockCount || 0);

    return [
      { name: 'Recovered', value: recovered },
      { name: 'Failed', value: failed },
      { name: 'Stopped', value: stopped },
      { name: 'Escalated', value: escalated },
      { name: 'Policy Blocked', value: policyBlocked }
    ].filter(d => d.value > 0);
  }, [latestRun]);

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1', '#64748b'];

  const formatCurrencyTooltip = (value: any) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value) || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evaluation Dashboard</h1>
          <p className="text-gray-500 mt-1">Review outcomes of historical batch evaluation runs on synthetic datasets</p>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Synthetic Evaluation Data:</strong> The charts below visualize simulated batch evaluations on a synthetic test dataset to ensure reproducibility without exposing real merchant data.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-gray-500">Loading evaluation charts...</p>
        </div>
      ) : isError ? (
        <div className="h-64 flex items-center justify-center bg-red-50 rounded-xl border border-red-200">
          <p className="text-red-500">Failed to load evaluation data.</p>
        </div>
      ) : !latestRun ? (
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-gray-500">No evaluation runs available to chart.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Impact Comparison</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={formatCurrencyTooltip} />
                  <Legend />
                  <Bar dataKey="At Risk" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Baseline Recovered" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="System Recovered" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Case Outcome Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outcomeChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {outcomeChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Historical Runs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Run Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dataset / Limits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Financial Impact (System vs Baseline)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Safety & Escalations</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading runs...</td>
                </tr>
              ) : data?.runs?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No evaluation runs found.</td>
                </tr>
              ) : data?.runs?.map((run: any) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <FileText className="h-4 w-4 text-gray-400" />
                      {run.id.substring(0, 8)}...
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{formatDate(run.startedAt || run.timestamp || Date.now())}</div>
                    <div className="text-xs text-gray-500">v{run.systemVersion || '1.0'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      {run.datasetVersion || 'synthetic-v1'} (Held-out)
                    </span>
                    <div className="text-xs text-gray-500 mt-1">Cases: {run.totalCases || run.metrics?.totalCases || 300}</div>
                    <div className="text-xs text-gray-500">Note: Simulation limits applied.</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <strong>System:</strong> {formatMoneyMinor(run.systemRecoveredMinor || run.metrics?.totalRecoveredMinor || 0)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Baseline: {formatMoneyMinor(run.baselineRecoveredMinor || run.baseline1RecoveredMinor || 0)}
                    </div>
                    <div className="text-xs text-emerald-600 font-medium">
                      +{formatMoneyMinor(run.incrementalRecoveredVsBaseline1 || run.incrementalRecoveredMinor || 0)} Incremental
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>Precision: {((run.interventionPrecision || 1.0) * 100).toFixed(1)}%</div>
                    <div>False Interventions: {run.falseInterventionCount || 0}</div>
                    <div>Escalated/Stopped: {run.escalationCount || 0} / {run.stoppedCaseCount || 0}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-900">
                    <a href={`/api/v1/evaluation/runs/${run.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                      Download JSON
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
