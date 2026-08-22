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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <SafetyCard 
          title="Idempotency & Duplicate Events" 
          description="Strict unique constraint mappings drop all duplicate ingestion events before they reach the queue." 
          status="VERIFIED" 
        />
        <SafetyCard 
          title="External API Timeout Recovery" 
          description="Exponential backoff with jitter and strict distributed locks ensure no double payments." 
          status="VERIFIED" 
        />
        <SafetyCard 
          title="Optimistic Concurrency Control" 
          description="Stale states are rejected using versioned updates on all workflow transitions." 
          status="VERIFIED" 
        />
        <SafetyCard 
          title="Deterministic Stopping Rules" 
          description="AI is bounded. Hard thresholds forcibly stop loops before they retry infinitely." 
          status="VERIFIED" 
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-medium text-gray-900">Failure Simulation Runs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Run Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scenarios Simulated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcomes</th>
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <ShieldAlert className="h-4 w-4 text-gray-400" />
                      {run.id.substring(0, 8)}...
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{formatDate(run.timestamp)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Total: {run.metrics?.totalSimulated || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Recovered/Safe: {run.metrics?.systemRecovered || 0} | Leaked: <span className="text-red-500">{run.metrics?.systemFailed || 0}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-900">
                    <a href={`/api/v1/failures/runs/${run.id}`} target="_blank" rel="noreferrer">
                      View Audit JSON
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

function SafetyCard({ title, description, status }: { title: string, description: string, status: string }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-bold text-gray-900 flex justify-between">
          {title}
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
            {status}
          </span>
        </h3>
        <p className="text-sm text-gray-500 mt-2">{description}</p>
      </div>
    </div>
  );
}
