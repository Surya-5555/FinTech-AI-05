import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../../api/client';
import { formatMoneyMinor } from '../../lib/money';
import { formatDate } from '../../lib/dates';
import { ArrowLeft, Clock, ShieldAlert, Activity } from 'lucide-react';

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  
  const { data, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => ApiClient.get<any>(`/cases/${id}`)
  });

  if (isLoading) return <div className="p-8 text-center">Loading case details...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Case not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link to="/cases" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Case {data.id}</h1>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {data.state}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-400" />
                Audit Trail
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                {data.auditLogs?.map((log: any) => (
                  <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-blue-100 text-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-gray-900">{log.action}</span>
                        <span className="text-xs text-gray-500">{formatDate(log.timestamp)}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {log.previousState} &rarr; {log.nextState}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-medium text-gray-900">Overview</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-sm text-gray-500">Amount at Risk</div>
                <div className="text-2xl font-bold text-gray-900">{formatMoneyMinor(data.amountAtRiskMinor, data.currency)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Merchant ID</div>
                <div className="text-sm font-mono text-gray-900">{data.merchantId}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Source Event ID</div>
                <div className="text-sm font-mono text-gray-900">{data.sourceEventId}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Correlation ID</div>
                <div className="text-sm font-mono text-gray-900">{data.correlationId}</div>
              </div>
            </div>
          </div>

          {/* AI Diagnosis and Planning */}
          {data.plans && data.plans.length > 0 && (
            <div className="bg-blue-50/50 rounded-xl shadow-sm border border-blue-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-blue-100 bg-blue-100/50 flex justify-between items-center">
                <h2 className="text-lg font-medium text-blue-900">AI Diagnosis & Plan</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-200 text-blue-800">
                  ✨ AI-Generated
                </span>
              </div>
              <div className="p-6 space-y-4">
                {data.plans.map((plan: any, idx: number) => (
                  <div key={plan.id} className={idx > 0 ? "pt-4 border-t border-blue-100" : ""}>
                    <div className="flex justify-between">
                      <div className="text-sm font-medium text-gray-900">Plan: {plan.interventionType}</div>
                      <div className="text-xs text-gray-500">{formatDate(plan.createdAt)}</div>
                    </div>
                    <div className="mt-2 text-sm text-gray-700 bg-white p-3 rounded border border-blue-50">
                      <strong>Diagnosis:</strong> {plan.diagnosisJson || 'N/A'}
                    </div>
                    <div className="mt-2 text-sm text-gray-700 bg-white p-3 rounded border border-blue-50">
                      <strong>Policy Gate Decision:</strong> {plan.planStatus}
                      {plan.requiresHumanApproval && ' (Requires Human Approval)'}
                      <br/>
                      <strong>Reason Codes:</strong> {plan.reasonCodesJson || 'None'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-gray-400" />
                Interventions & Executions
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {data.interventions?.length === 0 && (
                <div className="p-4 text-sm text-gray-500 text-center">No interventions executed yet.</div>
              )}
              {data.interventions?.map((inv: any) => (
                <div key={inv.id} className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900">{inv.interventionType} (Attempt {inv.attemptNumber})</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      inv.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 
                      inv.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                  {inv.externalReference && (
                    <div className="text-xs text-gray-500 mt-1">
                      Adapter Ref: {inv.externalReference}
                    </div>
                  )}
                  {inv.failureCode && (
                    <div className="text-xs text-red-500 mt-1">
                      Failure Code: {inv.failureCode}
                    </div>
                  )}
                  {inv.outcome && (
                    <div className="text-sm text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                      <div><strong>Outcome Status:</strong> {inv.outcome.status}</div>
                      {inv.outcome.recoveredAmountMinor && (
                        <div><strong>Recovered:</strong> {formatMoneyMinor(inv.outcome.recoveredAmountMinor || 0, inv.outcome.currency)}</div>
                      )}
                      {inv.outcome.resultMetadataJson && (
                        <div className="text-xs mt-1"><strong>Details:</strong> {inv.outcome.resultMetadataJson}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
