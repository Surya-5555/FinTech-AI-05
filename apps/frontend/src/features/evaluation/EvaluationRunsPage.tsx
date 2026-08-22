import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../../api/client';
import { formatDate } from '../../lib/dates';
import { formatMoneyMinor } from '../../lib/money';
import { FileText } from 'lucide-react';

export function EvaluationRunsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['evaluationRuns'],
    queryFn: () => ApiClient.get<any>('/evaluation/runs')
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evaluation Artifacts</h1>
          <p className="text-gray-500 mt-1">Review outcomes of historical batch evaluation runs</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                    <div className="text-xs text-gray-500 mt-1">{formatDate(run.startedAt || run.timestamp)}</div>
                    <div className="text-xs text-gray-500">v{run.systemVersion || '1.0'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      {run.datasetVersion || 'synthetic-v1'} (Held-out)
                    </span>
                    <div className="text-xs text-gray-500 mt-1">Cases: {run.totalCases || run.metrics?.totalCases || 0}</div>
                    <div className="text-xs text-gray-500">Note: Simulation limits applied.</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <strong>System:</strong> {formatMoneyMinor(run.systemRecoveredMinor || run.metrics?.totalRecoveredMinor || 0)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Baseline: {formatMoneyMinor(run.baselineRecoveredMinor || 0)}
                    </div>
                    <div className="text-xs text-emerald-600 font-medium">
                      +{formatMoneyMinor(run.incrementalRecoveredMinor || 0)} Incremental
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
