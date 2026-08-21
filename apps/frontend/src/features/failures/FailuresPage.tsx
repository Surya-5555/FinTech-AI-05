import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../../api/client';
import { formatDate } from '../../lib/dates';
import { ShieldAlert } from 'lucide-react';

export function FailuresPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['failuresRuns'],
    queryFn: () => ApiClient.get<any>('/failures/runs')
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Failures & Resilience</h1>
          <p className="text-gray-500 mt-1">Review outcomes of historical failure simulation runs</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Run ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Summary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">Loading runs...</td>
                </tr>
              ) : data?.runs?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No failure simulation runs found.</td>
                </tr>
              ) : data?.runs?.map((run: any) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-gray-400" />
                    {run.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(run.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Total: {run.metrics?.totalSimulated} | Recovered: {run.metrics?.systemRecovered} | Failed: {run.metrics?.systemFailed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-900">
                    <a href={`/api/v1/failures/runs/${run.id}`} target="_blank" rel="noreferrer">
                      View JSON
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
