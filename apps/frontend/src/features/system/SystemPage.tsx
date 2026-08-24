import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../../api/client';
import { Server, Zap, Database } from 'lucide-react';

export function SystemPage() {
  const { data: status, isLoading } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: () => ApiClient.get<any>('/system/resilience/status')
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Status</h1>
          <p className="text-gray-500 mt-1">Infrastructure and resilience metrics</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-500">Loading system status...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-gray-400" />
              Circuit Breakers
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Razorpay API</span>
                <StatusBadge status={status?.circuitBreakers?.razorpayApi} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">LLM Provider</span>
                <StatusBadge status={status?.circuitBreakers?.llmProvider} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Redis</span>
                <StatusBadge status={status?.circuitBreakers?.redis} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-gray-400" />
              Queue Depths
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Outbox Processing</span>
                <span className="font-mono text-gray-900 font-bold">{status?.queueDepths?.outbox || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Interventions Queue</span>
                <span className="font-mono text-gray-900 font-bold">{status?.queueDepths?.interventions || 0}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4">
              <Server className="h-5 w-5 text-gray-400" />
              Environment
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Node</span>
                <span className="font-mono">v20+</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mode</span>
                <span className="font-mono text-amber-600 font-bold">BENCHMARK DATA</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isClosed = status === 'CLOSED';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isClosed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
      {status || 'UNKNOWN'}
    </span>
  );
}
