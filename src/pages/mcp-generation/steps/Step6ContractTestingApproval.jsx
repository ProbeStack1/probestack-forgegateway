import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, UserCircle, Users, History, Eye, Send, Loader2, CheckCircle,
  XCircle, AlertCircle, ChevronRight, ArrowLeft, FileCode, Server, FlaskConical,
  Clock, MessageSquare, ThumbsUp, ThumbsDown, Info, Check, Download,
  ChevronDown, ChevronUp, Wrench, Layers, MessageSquare as MsgIcon
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { contractTestingService } from '../../../services/contractTestingService';
import { apiDesignService } from '../../../services/apiDesignService';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import Editor from '@monaco-editor/react';
import { Spectral } from '@stoplight/spectral-core';
import { oas } from '@stoplight/spectral-rulesets';

// ─── Main Component ────────────────────────────────────────────────────
export default function Step6ContractTestingApproval({ state, dispatch, setToast }) {
  const [loading, setLoading] = useState(false);
  const [contractHistory, setContractHistory] = useState([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLoadingSpec, setPreviewLoadingSpec] = useState(false);
  const [previewSpecContent, setPreviewSpecContent] = useState('');
  const [previewLintResults, setPreviewLintResults] = useState([]);
  const [previewSending, setPreviewSending] = useState(false);
  const [previewArchitectEmail, setPreviewArchitectEmail] = useState('');
  const [autoFilledConsumerEmail, setAutoFilledConsumerEmail] = useState('');
  const [previewActiveTab, setPreviewActiveTab] = useState('spec');
  const [expandedEndpoint, setExpandedEndpoint] = useState(null);
  const [showHistoryDetailModal, setShowHistoryDetailModal] = useState(false);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);
  const [historyDetailData, setHistoryDetailData] = useState(null);
  const [loadingHistoryDetail, setLoadingHistoryDetail] = useState(false);
  const [architectStatus, setArchitectStatus] = useState('');
  const [consumerStatus, setConsumerStatus] = useState('');

  const projectId = state?.projectId;
  const selectedSpec = state?.selectedSpec;
  const mockServerUrl = state?.mockServerUrl || '';
  const capabilities = state?.capabilities || { tools: [], resources: [], prompts: [] };
  const specContent = selectedSpec?.content || selectedSpec?.specContent || '';
  const microserviceMirrorId = state?.microserviceMirrorId;

  // ── Fetch approval statuses ──────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    const fetchStatuses = async () => {
      try {
        const msId = microserviceMirrorId || projectId;
        const result = await contractTestingService.getMicroservice(msId);
        if (result.success) {
          const data = result.data?.data || result.data;
          const architect = data?.architectReview || {};
          const consumer = data?.consumerReview || {};
          setArchitectStatus(architect.status || '');
          setConsumerStatus(consumer.status || '');
        }
      } catch (e) {
        // silent
      }
    };
    fetchStatuses();
  }, [projectId, microserviceMirrorId]);

  // ── Open preview modal ──────────────────────────────────────
  const openPreviewModal = async () => {
    if (!selectedSpec) {
      setToast?.({ message: 'No specification selected.', type: 'error' });
      return;
    }
    setShowPreviewModal(true);
    setPreviewLoadingSpec(true);
    let content = selectedSpec.content || selectedSpec.specContent;
    if (!content && selectedSpec.specMetadataId) {
      try {
        const res = await apiDesignService.getSpecContent(selectedSpec.specMetadataId);
        if (res.success && res.content) content = res.content;
      } catch (e) {
        setToast?.({ message: 'Failed to load spec', type: 'error' });
      }
    }
    setPreviewSpecContent(content || '');
    if (content) {
      try {
        const spectral = new Spectral();
        spectral.setRuleset(oas);
        const results = await spectral.run(content);
        setPreviewLintResults(results);
      } catch (e) {
        setPreviewLintResults([]);
      }
    }
    setPreviewLoadingSpec(false);
    if (state?.onboarding?.consumerIds?.length && state?.savedConsumers) {
      const consumers = state.savedConsumers || [];
      const firstConsumer = consumers.find(c => state.onboarding.consumerIds.includes(c.id));
      if (firstConsumer) {
        setAutoFilledConsumerEmail(firstConsumer.consumerPocEmail || '');
      }
    }
  };

  // ── Send approval ────────────────────────────────────────────
  const handlePreviewSendApproval = async (type) => {
    if (!projectId) {
      setToast?.({ message: 'Project not found', type: 'error' });
      return;
    }
    const approverEmail = type === 'architect' ? previewArchitectEmail : autoFilledConsumerEmail;
    if (!approverEmail.trim()) {
      setToast?.({ message: `Please enter ${type} email`, type: 'error' });
      return;
    }
    setPreviewSending(true);
    const approvalData = {
      microserviceId: microserviceMirrorId || projectId,
      type: type === 'architect' ? 'ARCHITECT' : 'CONSUMER',
      requestJson: JSON.stringify({ method: 'tools/call', params: { name: 'sample_tool' } }),
      responseJson: JSON.stringify({ content: { message: 'Mock response' } }),
      approverEmail,
      openApiSpec: selectedSpec?.name || 'MCP Spec',
      mockServerUrl: mockServerUrl || '',
      specificationUrl: mockServerUrl || '',
      mockServiceName: 'mcp-mock',
      consumerInformation: 'Consumer details',
      specContent: previewSpecContent,
      specEndpoints: capabilities.tools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
      lintResults: previewLintResults,
    };
    const result = await contractTestingService.sendApprovalRequest(approvalData);
    setPreviewSending(false);
    if (result.success) {
      setToast?.({ message: `Approval sent to ${approverEmail}`, type: 'success' });
      setShowPreviewModal(false);
      fetchHistory();
    } else {
      setToast?.({ message: result.error || 'Failed to send approval', type: 'error' });
    }
  };

  // ── Fetch history ────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    if (!projectId) return;
    setIsFetchingHistory(true);
    try {
      const msId = microserviceMirrorId || projectId;
      const result = await contractTestingService.getHistory(msId, 0, 20);
      let historyData = [];
      if (result.success) {
        const raw = result.data?.data || result.data;
        if (Array.isArray(raw)) {
          historyData = raw;
        } else if (raw && typeof raw === 'object') {
          historyData = raw.content || raw.items || [];
          if (!Array.isArray(historyData)) historyData = [];
        }
      }
      setContractHistory(historyData);
    } catch (e) {
      console.warn('Failed to fetch history:', e);
      setContractHistory([]);
    }
    setIsFetchingHistory(false);
  }, [projectId, microserviceMirrorId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ── Render history list ──────────────────────────────────────
  const renderHistoryList = () => {
    if (isFetchingHistory) {
      return <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
    }
    if (!Array.isArray(contractHistory) || contractHistory.length === 0) {
      return <div className="text-center py-6 text-gray-400">No approval history found.</div>;
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-dark-700">
            <tr className="text-left text-xs font-semibold text-gray-400">
              <th className="pb-2">Type</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Sent By</th>
              <th className="pb-2">Approver</th>
              <th className="pb-2">Sent At</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {contractHistory.map((record) => (
              <tr key={record.id} className="hover:bg-white/[0.03]">
                <td className="py-2 capitalize">{record.type?.toLowerCase()}</td>
                <td className="py-2">
                  <span className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    record.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                    record.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                    record.status === 'IN_PROGRESS' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  )}>
                    {record.status === 'SENT' ? 'Requested' : record.status}
                  </span>
                </td>
                <td className="py-2">{record.sentBy || '-'}</td>
                <td className="py-2">{record.approverEmail || '-'}</td>
                <td className="py-2">{record.sentAt ? new Date(record.sentAt).toLocaleString() : '-'}</td>
                <td className="py-2">
                  <button onClick={() => openHistoryDetail(record)} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const openHistoryDetail = async (record) => {
    setSelectedHistoryRecord(record);
    setShowHistoryDetailModal(true);
    setLoadingHistoryDetail(true);
    try {
      const result = await contractTestingService.getApprovalDetails(record.id);
      if (result.success) {
        setHistoryDetailData(result.data?.data || result.data);
      }
    } catch (e) {}
    setLoadingHistoryDetail(false);
  };

  // ── Main render ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-white">Contract Testing & Approval</h2>
          </div>
          <button
            onClick={openPreviewModal}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium flex items-center gap-2"
          >
            <Eye className="w-4 h-4" /> Preview & Send Approval
          </button>
        </div>

        {/* Approval Status Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-dark-700 bg-[#0f172a]/40 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">API Architect Review</p>
                <p className="text-xs text-gray-400">
                  {architectStatus === 'APPROVED' ? 'Approved' :
                   architectStatus === 'REJECTED' ? 'Rejected' :
                   architectStatus === 'SENT' ? 'Requested' :
                   architectStatus === 'IN_PROGRESS' ? 'Under Review' : 'Not Initiated'}
                </p>
              </div>
            </div>
          </div>
          {/* Consumer card is removed as requested */}
        </div>
      </Card>

      {/* History */}
      <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-primary" /> Approval History
          </h3>
          <button onClick={fetchHistory} className="text-xs text-gray-400 hover:text-white">
            Refresh
          </button>
        </div>
        {renderHistoryList()}
      </Card>

      {/* Preview Modal */}
      {showPreviewModal && (
        <PreviewModal
          onClose={() => setShowPreviewModal(false)}
          specContent={previewSpecContent}
          lintResults={previewLintResults}
          capabilities={capabilities}
          mockServerUrl={mockServerUrl}
          architectEmail={previewArchitectEmail}
          setArchitectEmail={setPreviewArchitectEmail}
          consumerEmail={autoFilledConsumerEmail}
          sending={previewSending}
          onSend={handlePreviewSendApproval}
          loadingSpec={previewLoadingSpec}
          expandedEndpoint={expandedEndpoint}
          setExpandedEndpoint={setExpandedEndpoint}
        />
      )}

      {/* History Detail Modal */}
      {showHistoryDetailModal && historyDetailData && (
        <HistoryDetailModal
          data={historyDetailData}
          record={selectedHistoryRecord}
          loading={loadingHistoryDetail}
          onClose={() => setShowHistoryDetailModal(false)}
        />
      )}
    </div>
  );
}

// ─── Preview Modal ──────────────────────────────────────────────────
function PreviewModal({
  onClose,
  specContent,
  lintResults,
  capabilities,
  mockServerUrl,
  architectEmail,
  setArchitectEmail,
  consumerEmail,
  sending,
  onSend,
  loadingSpec,
}) {
  const [activeTab, setActiveTab] = useState('spec');
  const [expandedToolId, setExpandedToolId] = useState(null);

  const toggleTool = (id) => {
    setExpandedToolId(expandedToolId === id ? null : id);
  };

  const renderTool = (tool) => {
    const isExpanded = expandedToolId === tool.id;
    return (
      <div key={tool.id} className="border border-dark-700 rounded-lg mb-2 overflow-hidden bg-[#0f172a]/30">
        <button
          onClick={() => toggleTool(tool.id)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#0f172a]/60 transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Wrench className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{tool.name}</p>
              {tool.description && <p className="text-xs text-gray-400 truncate">{tool.description}</p>}
            </div>
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>
        {isExpanded && (
          <div className="border-t border-dark-700 px-4 py-3 space-y-3">
            {tool.inputSchema && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Input Schema</p>
                <pre className="text-[11px] font-mono bg-dark-900/70 p-2 rounded overflow-auto max-h-40 text-gray-300">
                  {JSON.stringify(tool.inputSchema, null, 2)}
                </pre>
              </div>
            )}
            {tool.outputType && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Output Type</p>
                <p className="text-sm text-gray-300">{tool.outputType}</p>
              </div>
            )}
            {tool.sideEffects && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Side Effects</p>
                <p className="text-sm text-gray-300">{tool.sideEffects}</p>
              </div>
            )}
            {tool.implementationHint && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Implementation Hint</p>
                <p className="text-sm text-gray-300">{tool.implementationHint}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-dark-900 flex flex-col" style={{ backgroundColor: '#0e172a' }}>
      <div className="px-6 py-4 border-b border-dark-700 bg-[#0f172a]/50 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-700">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="h-6 w-px bg-dark-700" />
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" /> MCP Contract Preview
              </h2>
              <p className="text-sm text-gray-400">Review specification, capabilities, and mock details before sending approval.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-700 px-6 pt-3">
        {[
          { id: 'spec', label: 'Specification', icon: FileCode },
          { id: 'capabilities', label: 'Capabilities', icon: Server },
          { id: 'mock', label: 'Mock Server', icon: FlaskConical },
          { id: 'linting', label: 'Linting', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {activeTab === 'spec' && (
            <Card className="p-5 bg-dark-800/60 border-dark-700">
              <h3 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-primary" /> Specification (Read-only)
              </h3>
              {loadingSpec ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="h-[500px] rounded-lg overflow-hidden border border-dark-700">
                  <Editor
                    height="100%"
                    defaultLanguage="yaml"
                    value={specContent}
                    options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
                    theme="vs-dark"
                  />
                </div>
              )}
            </Card>
          )}

          {activeTab === 'capabilities' && (
            <Card className="p-5 bg-dark-800/60 border-dark-700">
              <h3 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" /> MCP Capabilities
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-blue-400" /> Tools ({capabilities.tools?.length || 0})
                  </p>
                  <div className="mt-2 space-y-2">
                    {capabilities.tools?.map(renderTool)}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-green-400" /> Resources ({capabilities.resources?.length || 0})
                  </p>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {capabilities.resources?.map((res, i) => (
                      <div key={i} className="border border-dark-700 rounded-lg p-2 bg-[#0f172a]/30">
                        <p className="text-sm font-medium text-white">{res.name}</p>
                        {res.description && <p className="text-xs text-gray-400">{res.description}</p>}
                        {res.mimeType && <span className="text-[10px] text-blue-400">{res.mimeType}</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <MsgIcon className="w-4 h-4 text-purple-400" /> Prompts ({capabilities.prompts?.length || 0})
                  </p>
                  <div className="mt-2 space-y-2">
                    {capabilities.prompts?.map((prompt, i) => (
                      <div key={i} className="border border-dark-700 rounded-lg p-2 bg-[#0f172a]/30">
                        <p className="text-sm font-medium text-white">{prompt.name}</p>
                        {prompt.description && <p className="text-xs text-gray-400">{prompt.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'mock' && (
            <Card className="p-5 bg-dark-800/60 border-dark-700">
              <h3 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-primary" /> Mock Server
              </h3>
              {mockServerUrl ? (
                <div>
                  <p className="text-sm text-gray-400">URL</p>
                  <a href={mockServerUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                    {mockServerUrl}
                  </a>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No mock server generated yet. Go to Step 5 to generate.</p>
              )}
            </Card>
          )}

          {activeTab === 'linting' && (
            <Card className="p-5 bg-dark-800/60 border-dark-700">
              <h3 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Linting Results
              </h3>
              {lintResults?.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {lintResults.map((result, idx) => (
                    <div key={idx} className="rounded-lg border border-dark-700 bg-dark-900/50 p-3">
                      <div className="flex items-start gap-2">
                        {result.severity === 0 ? (
                          <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        ) : result.severity === 1 ? (
                          <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn(
                              'text-[10px] font-mono px-1.5 py-0.5 rounded',
                              result.severity === 0 ? 'bg-red-500/20 text-red-300' :
                              result.severity === 1 ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-blue-500/20 text-blue-300'
                            )}>
                              {result.code || 'lint'}
                            </span>
                            <span className="text-sm text-white">{result.message}</span>
                          </div>
                          {result.path && result.path.length > 0 && (
                            <p className="mt-1 text-xs text-gray-400">
                              Path: {result.path.join(' → ')}
                              {result.range && ` (lines ${result.range.start?.line + 1}-${result.range.end?.line + 1})`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No linting issues found.</p>
              )}
            </Card>
          )}

          {/* Send Approval Form */}
          <Card className="p-5 bg-dark-800/60 border-dark-700 mt-4">
            <h3 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> Send Approval Request
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-gray-300">Architect Email</Label>
                <Input
                  type="email"
                  placeholder="architect@company.com"
                  value={architectEmail}
                  onChange={(e) => setArchitectEmail(e.target.value)}
                  className="bg-dark-900 border-dark-700"
                />
                <Button
                  onClick={() => onSend('architect')}
                  disabled={sending}
                  className="mt-2 bg-primary self-end"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send to Architect
                </Button>
              </div>
              {/* Consumer section removed */}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── History Detail Modal ────────────────────────────────────────────
function HistoryDetailModal({ data, record, loading, onClose }) {
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/70">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!data) return null;

  // Extract fields from data (the approval request)
  const req = data.approvalRequest || data;
  const status = req.status || 'SENT';
  const type = data.type || req.type || 'ARCHITECT';
  const sentBy = data.sentBy || req.sentBy || '—';
  const approverEmail = req.approverEmail || data.approverEmail || '—';
  const sentAt = data.sentAt || req.sentAt || null;
  const inProgressAt = req.inProgressAt || null;
  const approvedAt = req.approvedAt || null;
  const rejectedAt = req.rejectedAt || null;
  const reviewComment = req.reviewComment || null;
  const specName = req.openApiSpec || data.openApiSpec || 'MCP Spec';
  const mockUrl = req.mockServerUrl || data.mockServerUrl || '—';
  const totalSpecEndpoints = req.specEndpoints?.length || 0;
  const totalMockEndpoints = req.mockEndpoints?.length || 0;

  const isApproved = status === 'APPROVED';
  const isRejected = status === 'REJECTED';
  const isInProgress = status === 'IN_PROGRESS';
  const isSent = status === 'SENT';

  const finalAt = isApproved ? approvedAt : isRejected ? rejectedAt : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col bg-dark-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" /> Approval Request Details
            </h3>
            <p className="text-sm text-gray-400">
              {type} approval for {specName}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className={cn(
                'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                isApproved ? 'bg-green-500/20 text-green-400' :
                isRejected ? 'bg-red-500/20 text-red-400' :
                isInProgress ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-blue-500/20 text-blue-400'
              )}>
                {isApproved ? 'Approved' :
                 isRejected ? 'Rejected' :
                 isInProgress ? 'Under Review' :
                 'Requested'}
              </span>
              {isApproved && finalAt && (
                <span className="text-xs text-gray-400">on {new Date(finalAt).toLocaleString()}</span>
              )}
            </div>

            {/* Timeline */}
            <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-4">
              <h4 className="text-sm font-semibold text-white mb-4">Approval Timeline</h4>
              <div className="relative">
                {/* Step 1: Sent */}
                <div className="relative pb-8">
                  {(isInProgress || isApproved || isRejected) && (
                    <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-emerald-500/50 -translate-x-1/2" />
                  )}
                  <div className="flex items-start gap-4">
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 ring-4 ring-dark-800">
                      <CheckCircle className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-white">Request Sent</p>
                        <p className="text-xs text-gray-400">
                          {sentAt ? new Date(sentAt).toLocaleString() : '—'}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Sent by <span className="font-medium text-gray-300">{sentBy}</span> to{' '}
                        <span className="font-medium text-gray-300">{approverEmail}</span>
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        {type === 'ARCHITECT'
                          ? 'API Architect has been requested to review the MCP contract.'
                          : 'Consumer has been requested to review the MCP contract.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2: Under Review */}
                <div className="relative pb-8">
                  {(isApproved || isRejected) && (
                    <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-emerald-500/50 -translate-x-1/2" />
                  )}
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-dark-800',
                      isInProgress || isApproved || isRejected
                        ? isApproved || isRejected
                          ? 'bg-emerald-500/20'
                          : 'bg-yellow-500/20'
                        : 'bg-gray-500/20'
                    )}>
                      {isInProgress ? (
                        <Clock className="h-4 w-4 text-yellow-400" />
                      ) : isApproved || isRejected ? (
                        isApproved ? <CheckCircle className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-red-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className={cn(
                          'text-sm font-semibold',
                          isInProgress || isApproved || isRejected ? 'text-white' : 'text-gray-500'
                        )}>
                          Under Review
                        </p>
                        {inProgressAt && (
                          <p className="text-xs text-gray-400">
                            {new Date(inProgressAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      {isInProgress ? (
                        <p className="mt-1 text-xs text-yellow-300">
                          ⏳ Awaiting final decision
                        </p>
                      ) : isApproved || isRejected ? (
                        <p className="mt-1 text-xs text-gray-400">
                          Review completed
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-gray-500">
                          The approver has not yet started the review.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 3: Final decision */}
                <div className="relative">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-dark-800',
                      isApproved ? 'bg-green-500/20' :
                      isRejected ? 'bg-red-500/20' :
                      'bg-gray-500/20'
                    )}>
                      {isApproved ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : isRejected ? (
                        <XCircle className="h-4 w-4 text-red-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className={cn(
                          'text-sm font-semibold',
                          isApproved ? 'text-green-400' :
                          isRejected ? 'text-red-400' :
                          'text-gray-500'
                        )}>
                          {isApproved ? 'Approved' :
                           isRejected ? 'Rejected' :
                           'Pending Decision'}
                        </p>
                        {finalAt && (
                          <p className="text-xs text-gray-400">
                            {new Date(finalAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      {(isApproved || isRejected) && (
                        <p className="mt-1 text-xs text-gray-400">
                          {isApproved
                            ? `Approved by ${approverEmail}`
                            : `Rejected by ${approverEmail}`}
                        </p>
                      )}
                      {reviewComment && (
                        <div className={cn(
                          'mt-3 p-3 rounded-lg border',
                          isApproved ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                        )}>
                          <p className="text-xs font-medium flex items-center gap-1">
                            {isApproved ? (
                              <MessageSquare className="w-3 h-3 text-green-300" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-red-300" />
                            )}
                            {isApproved ? "Approver's comment" : 'Rejection reason'}
                          </p>
                          <p className="mt-1 text-sm text-gray-200">{reviewComment}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* API Contract Details */}
            <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-4">
              <h4 className="text-sm font-semibold text-white mb-4">API Contract Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Specification Name</p>
                  <p className="text-white font-medium">{specName}</p>
                </div>
                <div>
                  <p className="text-gray-400">Total Spec Endpoints</p>
                  <p className="text-white font-medium">{totalSpecEndpoints}</p>
                </div>
                <div>
                  <p className="text-gray-400">Mock Server URL</p>
                  <p className="text-white break-all">{mockUrl}</p>
                </div>
                <div>
                  <p className="text-gray-400">Total Mock Endpoints</p>
                  <p className="text-white font-medium">{totalMockEndpoints}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-dark-700 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}