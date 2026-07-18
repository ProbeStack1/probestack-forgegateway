import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle, XCircle, Clock, Loader2, AlertCircle, FileCode, Server, ChevronRight,
  Shield, Info, ThumbsUp, ThumbsDown, MessageSquare, BarChart, AlertTriangle, GitBranch,
  Code, FileText
} from 'lucide-react';
import { peerReviewService } from '../services/peerReviewService';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import Toast from '../components/ui/toast';
import Editor from '@monaco-editor/react';

const STATUS_DISPLAY = {
  SENT: 'Requested',
  IN_PROGRESS: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PENDING: 'Pending',
};

const StatusBadge = ({ status }) => {
  const config = {
    APPROVED:    { icon: CheckCircle, className: 'bg-green-500/20 text-green-400' },
    REJECTED:    { icon: XCircle,     className: 'bg-red-500/20 text-red-400' },
    IN_PROGRESS: { icon: Clock,       className: 'bg-yellow-500/20 text-yellow-400' },
    SENT:        { icon: Clock,       className: 'bg-blue-500/20 text-blue-400' },
    PENDING:     { icon: Clock,       className: 'bg-slate-500/20 text-slate-300' },
  };
  const item = config[status] || config.SENT;
  const Icon = item.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', item.className)}>
      <Icon className="h-3 w-3" />
      {STATUS_DISPLAY[status] || status || 'Not initiated'}
    </span>
  );
};

/**
 * Peer Review detail page – displays full review with:
 *  • Specification (full OpenAPI)
 *  • Code Analysis (overall score + issue list)
 *  • Tool-wise Breakdown (Checkstyle, PMD, Custom)
 *  • Reviewers (individual decisions)
 */
export default function PeerReviewDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  void searchParams; // type is implicit — this page is only routed for PEER_REVIEW

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveMessage, setApproveMessage] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState('specification');

  const loggedInUserEmail = (localStorage.getItem('userEmail') || '').toLowerCase();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Use the auto-promoting endpoint so SENT → IN_PROGRESS on first open.
      const result = await peerReviewService.getApprovalForReview(id);
      if (result.success) {
        const data = result.data?.data || result.data;
        setDetail(data);
      } else {
        // Fall back to read-only details (architect viewing their own).
        const fallback = await peerReviewService.getApprovalDetails(id);
        if (fallback.success) {
          setDetail(fallback.data?.data || fallback.data);
        } else {
          setToast({ message: result.error || fallback.error || 'Failed to load peer review', type: 'error' });
        }
      }
    } catch (err) {
      console.error('Error loading peer review:', err);
      setToast({ message: 'Failed to load peer review', type: 'error' });
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    setActionLoading(true);
    const result = await peerReviewService.approveApproval(id, approveMessage);
    setActionLoading(false);
    if (result.success) {
      setToast({ message: 'Peer review approved!', type: 'success' });
      setShowApproveModal(false);
      setTimeout(() => navigate('/manage-approvals'), 1200);
    } else {
      setToast({ message: result.error || 'Approve failed', type: 'error' });
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setToast({ message: 'Rejection reason is required', type: 'error' });
      return;
    }
    setActionLoading(true);
    const result = await peerReviewService.rejectApproval(id, rejectionReason);
    setActionLoading(false);
    if (result.success) {
      setToast({ message: 'Peer review rejected', type: 'success' });
      setShowRejectModal(false);
      setRejectionReason('');
      setTimeout(() => navigate('/manage-approvals'), 1200);
    } else {
      setToast({ message: result.error || 'Reject failed', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-400" />
          <p className="mt-4">Peer review not found.</p>
          <Button onClick={() => navigate('/manage-approvals')} className="mt-4">Back</Button>
        </div>
      </div>
    );
  }

  const status = detail.status;
  const isApprover = detail.approverEmail && detail.approverEmail.toLowerCase() === loggedInUserEmail;
  const canAct = isApprover && status !== 'APPROVED' && status !== 'REJECTED';
  const car = detail.codeAnalysisReport || {};
  const summary = car.summary || {};
  const allIssues = car.allIssues || [];
  const siblings = Array.isArray(detail.siblingDecisions) ? detail.siblingDecisions : [];
  const toolBreakdowns = car.toolBreakdowns || [];

  return (
    <div className="min-h-screen">
      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
      )}

      <div className="container mx-auto px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/manage-approvals')}
            className="text-sm text-primary hover:underline"
            data-testid="peer-review-back-btn"
          >
            ← Back to Manage Approvals
          </button>
          <StatusBadge status={status} />
        </div>

        {/* Header card with repo & deployed URLs */}
        <div className="mb-6 rounded-xl border border-purple-500/30 bg-purple-500/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white" data-testid="peer-review-heading">
                Peer Review · {detail.microserviceId}
              </h1>
              <p className="mt-1 text-xs text-gray-400">
                Sent by <span className="text-purple-300">{detail.sentBy}</span>
                {detail.sentAt && ` · ${new Date(detail.sentAt).toLocaleString()}`}
              </p>
              <p className="text-xs text-gray-400">
                Approver: <span className="text-purple-300">{detail.approverEmail}</span>
              </p>
              {detail.commitSha && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                  <GitBranch className="h-3 w-3" /> {detail.commitSha.substring(0, 12)}
                </p>
              )}
              {/* Repository & Deployed URLs */}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {detail.repositoryUrl && (
                  <a
                    href={detail.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                  >
                    <GitBranch className="h-3.5 w-3.5" />
                    Repository
                  </a>
                )}
                {detail.deployedServiceUrl && (
                  <a
                    href={detail.deployedServiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20"
                  >
                    <Server className="h-3.5 w-3.5" />
                    Deployed URL
                  </a>
                )}
              </div>
            </div>
            {canAct && (
              <div className="flex gap-2">
                <Button onClick={() => setShowApproveModal(true)} className="bg-green-600 hover:bg-green-700" data-testid="peer-review-approve-btn">
                  <ThumbsUp className="mr-1 h-4 w-4" /> Approve
                </Button>
                <Button onClick={() => setShowRejectModal(true)} variant="destructive" data-testid="peer-review-reject-btn">
                  <ThumbsDown className="mr-1 h-4 w-4" /> Reject
                </Button>
              </div>
            )}
          </div>
          {detail.message && (
            <div className="mt-3 rounded-md border border-purple-500/20 bg-purple-500/5 p-3">
              <p className="text-xs font-semibold text-purple-300 mb-1">Architect&apos;s note</p>
              <p className="text-sm text-gray-200">{detail.message}</p>
            </div>
          )}
          {status === 'APPROVED' && detail.approverMessage && (
            <div className="mt-3 rounded-md border border-green-500/20 bg-green-500/5 p-3">
              <p className="text-xs font-semibold text-green-300 mb-1 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> Approver&apos;s comment
              </p>
              <p className="text-sm text-gray-200">{detail.approverMessage}</p>
            </div>
          )}
          {status === 'REJECTED' && detail.rejectionReason && (
            <div className="mt-3 rounded-md border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-xs font-semibold text-red-300 mb-1">Rejection reason</p>
              <p className="text-sm text-gray-200">{detail.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Tabs – removed "Code Review" and renamed "Snapshots" to "Tool-wise Breakdown" */}
        <div className="mb-4 flex flex-wrap gap-2 border-b border-dark-700">
          {[
            { id: 'specification', label: 'Specification', icon: FileCode },
            { id: 'code-analysis', label: 'Code Analysis', icon: BarChart },
            // { id: 'tool-breakdown', label: 'Tool-wise Breakdown', icon: Code },
            { id: 'reviewers', label: 'Reviewers', icon: Shield },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'flex items-center gap-1 border-b-2 px-3 py-2 text-sm transition-colors',
                  activeTab === t.id ? 'border-primary text-white' : 'border-transparent text-gray-400 hover:text-white'
                )}
                data-testid={`peer-review-tab-${t.id}`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'specification' && (
          <div className="rounded-xl border border-dark-700 bg-dark-900/30 p-4">
            {detail.specContent ? (
              <Editor
                height="60vh"
                language={detail.specContent.trim().startsWith('{') ? 'json' : 'yaml'}
                value={detail.specContent}
                theme="vs-dark"
                options={{ readOnly: true, minimap: { enabled: false } }}
              />
            ) : (
              <p className="text-center text-sm text-gray-500 py-8">No spec attached.</p>
            )}
          </div>
        )}

        {activeTab === 'code-analysis' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <p className="text-gray-400 text-sm">Overall Code Health Score</p>
                  <p className="text-4xl font-bold text-white">
                    {car.overallScore ?? '-'}<span className="text-lg text-gray-400">/100</span>
                  </p>
                </div>
                <div>
                  <span
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-semibold',
                      car.qualityGate === 'PASSED' ? 'bg-green-500/20 text-green-400'
                      : car.qualityGate === 'WARNING' ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                    )}
                  >
                    Quality Gate: {car.qualityGate || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div><p className="text-xs text-gray-400">Critical</p><p className="text-xl font-bold text-red-400">{summary.critical ?? 0}</p></div>
                <div><p className="text-xs text-gray-400">High</p><p className="text-xl font-bold text-orange-400">{summary.high ?? 0}</p></div>
                <div><p className="text-xs text-gray-400">Medium</p><p className="text-xl font-bold text-yellow-400">{summary.medium ?? 0}</p></div>
                <div><p className="text-xs text-gray-400">Low</p><p className="text-xl font-bold text-blue-400">{summary.low ?? 0}</p></div>
              </div>
            </div>
            {allIssues.length > 0 ? (
              <div className="rounded-xl border border-dark-700 bg-dark-900/30 p-4 space-y-2 max-h-[50vh] overflow-y-auto">
                <h4 className="text-sm font-semibold text-white mb-2">All Issues ({allIssues.length})</h4>
                {allIssues.map((issue, idx) => (
                  <div key={idx} className="flex gap-2 p-2 rounded bg-dark-900/50 border border-dark-700">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-white">{issue.message}</p>
                      <p className="text-xs text-gray-400">
                        Rule: {issue.ruleName} • {issue.file}{issue.line ? `:${issue.line}` : ''} • {issue.severity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dark-700 bg-dark-900/30 p-8 text-center text-gray-400">
                <CheckCircle className="mx-auto h-10 w-10 text-green-400" />
                <p className="mt-2">No issues found. Code looks clean.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tool-breakdown' && (
          <div className="rounded-xl border border-dark-700 bg-dark-900/30 p-4">
            {toolBreakdowns.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-8">No tool breakdown available.</p>
            ) : (
              <div className="space-y-4">
                {toolBreakdowns.map((tb, idx) => {
                  const icon = tb.tool === 'CHECKSTYLE' ? FileCode : tb.tool === 'PMD' ? FileText : Shield;
                  return (
                    <div key={idx} className="rounded-xl border border-dark-700 bg-dark-800/40 p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {React.createElement(icon, { className: 'w-5 h-5 text-primary' })}
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{tb.tool}</h4>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                            <span>Score: <span className="font-bold text-white">{tb.score}/100</span></span>
                            <span>•</span>
                            <span className="text-emerald-300">Passed: {tb.rulesPassed}</span>
                            <span className="text-red-300">Failed: {tb.rulesFailed}</span>
                            <span>•</span>
                            <span className="text-yellow-300">Violations: {tb.violationCount}</span>
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded-full font-medium',
                              tb.status === 'PASSED' && 'bg-green-500/20 text-green-400',
                              tb.status === 'WARNING' && 'bg-yellow-500/20 text-yellow-400',
                              tb.status === 'SKIPPED' && 'bg-gray-500/20 text-gray-400',
                              tb.status === 'FAILED' && 'bg-red-500/20 text-red-400'
                            )}>
                              {tb.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Per-rule details (expandable) */}
                      {tb.rules && tb.rules.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {tb.rules.map((rule, rIdx) => (
                            <div key={rIdx} className="rounded border border-dark-700 bg-dark-900/30 p-2 text-xs">
                              <div className="flex items-center gap-2">
                                {rule.status === 'PASS' ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                                )}
                                <span className="font-medium text-white">{rule.name}</span>
                                {rule.ruleId && (
                                  <span className="font-mono text-gray-400 bg-dark-800 px-1 rounded">{rule.ruleId}</span>
                                )}
                                <span className={cn('px-1 rounded', severityClass(rule.severity))}>
                                  {rule.severity}
                                </span>
                                {rule.violationCount > 0 && (
                                  <span className="text-red-300">{rule.violationCount} violations</span>
                                )}
                              </div>
                              {rule.violations && rule.violations.length > 0 && (
                                <ul className="mt-1 ml-4 list-disc list-inside space-y-0.5">
                                  {rule.violations.slice(0, 3).map((v, vi) => (
                                    <li key={vi} className="text-gray-300">
                                      <span className="font-mono text-gray-400">{v.file}{v.line ? `:${v.line}` : ''}</span>
                                      {' '}— {v.message}
                                    </li>
                                  ))}
                                  {rule.violations.length > 3 && (
                                    <li className="text-gray-500 italic">… and {rule.violations.length - 3} more</li>
                                  )}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviewers' && (
          <div className="rounded-xl border border-dark-700 bg-dark-900/30 p-4 space-y-2">
            <h4 className="text-sm font-semibold text-white mb-2">All Reviewers</h4>
            {siblings.length === 0 ? (
              <p className="text-sm text-gray-500">Only one reviewer on this peer review.</p>
            ) : siblings.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded bg-dark-900/50 border border-dark-700">
                <div>
                  <p className="text-sm text-white">{s.approverEmail}</p>
                  {s.approverMessage && (
                    <p className="text-xs text-gray-400 mt-1">
                      <MessageSquare className="inline h-3 w-3 mr-1" /> {s.approverMessage}
                    </p>
                  )}
                  {s.rejectionReason && (
                    <p className="text-xs text-red-300 mt-1">Rejected — {s.rejectionReason}</p>
                  )}
                </div>
                <div className="text-right">
                  <StatusBadge status={s.status} />
                  {s.statusChangedAt && (
                    <p className="text-xs text-gray-500 mt-1">{new Date(s.statusChangedAt).toLocaleString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approve modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-dark-700 bg-dark-900 p-5">
            <h3 className="text-lg font-semibold text-white">Approve Peer Review</h3>
            <p className="text-sm text-gray-400 mt-1">Add an optional comment (visible to architect).</p>
            <textarea
              value={approveMessage}
              onChange={(e) => setApproveMessage(e.target.value)}
              className="mt-3 w-full h-24 rounded-lg border border-dark-700 bg-dark-800 p-2 text-sm text-white"
              placeholder="Looks good, ready to merge."
              data-testid="peer-review-approve-comment"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={() => setShowApproveModal(false)} variant="outline">Cancel</Button>
              <Button onClick={handleApprove} disabled={actionLoading} className="bg-green-600 hover:bg-green-700" data-testid="peer-review-approve-confirm">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Approve'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-dark-700 bg-dark-900 p-5">
            <h3 className="text-lg font-semibold text-white">Reject Peer Review</h3>
            <p className="text-sm text-gray-400 mt-1">A rejection reason is required.</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-3 w-full h-24 rounded-lg border border-dark-700 bg-dark-800 p-2 text-sm text-white"
              placeholder="Explain why this cannot be approved..."
              data-testid="peer-review-reject-reason"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={() => setShowRejectModal(false)} variant="outline">Cancel</Button>
              <Button onClick={handleReject} disabled={actionLoading} variant="destructive" data-testid="peer-review-reject-confirm">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper for severity styling
const severityClass = (sev) =>
  ({
    CRITICAL: 'bg-red-500/20 text-red-400',
    HIGH:     'bg-orange-500/20 text-orange-400',
    MEDIUM:   'bg-yellow-500/20 text-yellow-400',
    LOW:      'bg-blue-500/20 text-blue-400',
  }[String(sev || '').toUpperCase()] || 'bg-gray-500/20 text-gray-400');
