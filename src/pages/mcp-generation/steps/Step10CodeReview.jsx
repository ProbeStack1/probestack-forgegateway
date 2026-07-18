import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { peerReviewService } from '../../../services/peerReviewService';
import { apiDevelopmentService } from '../../../services/apiDevelopmentService';
import {
  Shield, CheckCircle, XCircle, AlertCircle, Loader2,
  Users, Send, GitPullRequest, Code, FileText,
  ArrowRight, ChevronDown, ChevronUp, Eye, Download,
  RefreshCw, Check, X, UserCircle, Clock, GitBranch
} from 'lucide-react';
import { cn } from '../../../lib/utils';

const cardStyle = { backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' };

export default function Step10CodeReview({ state, dispatch, setToast }) {
  const [reviewStatus, setReviewStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [reviewers, setReviewers] = useState(['']);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [mergeStatus, setMergeStatus] = useState('idle'); // idle, merging, success, error
  const [mergeBranch, setMergeBranch] = useState('main');
  const [showMergeModal, setShowMergeModal] = useState(false);

  // Get microserviceId from state
  const microserviceId = state?.microserviceMirrorId || state?.deployPrep?.microserviceId;

  const fetchReviewStatus = useCallback(async () => {
    if (!microserviceId) return;
    setLoading(true);
    try {
      const result = await peerReviewService.getByMicroservice(microserviceId);
      if (result.success) {
        setReviewStatus(result.data);
      }
      // Fetch history
      const historyRes = await peerReviewService.getApprovals(microserviceId);
      if (historyRes.success) {
        setApprovalHistory(historyRes.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch review status', err);
    } finally {
      setLoading(false);
    }
  }, [microserviceId]);

  useEffect(() => {
    fetchReviewStatus();
  }, [fetchReviewStatus]);

  const handleSendReview = async () => {
    const validReviewers = reviewers.filter(email => email.trim() !== '');
    if (validReviewers.length === 0) {
      setToast({ message: 'Please add at least one reviewer email.', type: 'error' });
      return;
    }
    setSending(true);
    try {
      const result = await peerReviewService.sendApprovalRequest({
        microserviceId,
        approverEmails: validReviewers,
        message: 'Please review the MCP server code.',
      });
      if (result.success) {
        setToast({ message: 'Peer review requests sent successfully.', type: 'success' });
        fetchReviewStatus();
        setReviewers(['']);
      } else {
        setToast({ message: result.error || 'Failed to send review request.', type: 'error' });
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to send review request.', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const handleMerge = async () => {
    if (!microserviceId) return;
    setMergeStatus('merging');
    try {
      // Simulate merge call – we'll use the existing apiDevelopmentService merge if available,
      // but for now we'll mock with a timeout.
      // In real implementation, you'd call something like:
      // const result = await apiDevelopmentService.mergeToMain(microserviceId, mergeBranch);
      // For now, we'll just simulate success.
      await new Promise(resolve => setTimeout(resolve, 2000));
      setMergeStatus('success');
      setToast({ message: `Successfully merged to ${mergeBranch} branch.`, type: 'success' });
      setTimeout(() => setShowMergeModal(false), 1500);
    } catch (err) {
      setMergeStatus('error');
      setToast({ message: err.message || 'Merge failed.', type: 'error' });
    } finally {
      setTimeout(() => setMergeStatus('idle'), 3000);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      APPROVED: { label: 'Approved', className: 'bg-green-500/20 text-green-400' },
      REJECTED: { label: 'Rejected', className: 'bg-red-500/20 text-red-400' },
      PENDING: { label: 'Pending', className: 'bg-yellow-500/20 text-yellow-400' },
      SENT: { label: 'Requested', className: 'bg-blue-500/20 text-blue-400' },
    };
    return config[status] || { label: status || 'Unknown', className: 'bg-gray-500/20 text-gray-400' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-gray-400">Loading review status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Static Code Analysis Summary (from Step9) – we can show a quick summary */}
      <Card className="p-6" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Code Analysis Summary
            </CardTitle>
            <p className="text-sm text-gray-400 mt-1">
              {state?.analysisResult ? `Score: ${state.analysisResult.overallScore}/100 • Gate: ${state.analysisResult.qualityGate}` : 'Not yet analyzed'}
            </p>
          </div>
          <span className={cn(
            "px-3 py-1 rounded-full text-xs font-medium",
            state?.analysisResult?.qualityGate === 'PASSED' ? "bg-green-500/20 text-green-400" :
            state?.analysisResult?.qualityGate === 'WARNING' ? "bg-yellow-500/20 text-yellow-400" :
            state?.analysisResult ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"
          )}>
            {state?.analysisResult ? (state.analysisResult.qualityGate === 'PASSED' ? 'Passed' : state.analysisResult.qualityGate === 'WARNING' ? 'Warning' : 'Failed') : 'N/A'}
          </span>
        </div>
      </Card>

      {/* Peer Review Card */}
      <Card className="p-6" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Peer Review
          </CardTitle>
          <span className="text-xs text-gray-400">
            {reviewStatus ? getStatusBadge(reviewStatus.status).label : 'Not initiated'}
          </span>
        </div>

        {reviewStatus && (
          <div className="mb-4 p-3 rounded-lg bg-[#0f172a]/50 border border-dark-700">
            <div className="flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-primary" />
              <span className="text-sm text-white">{reviewStatus.approverEmail || 'No approver assigned'}</span>
              <span className={cn(
                "ml-auto text-xs px-2 py-0.5 rounded-full",
                getStatusBadge(reviewStatus.status).className
              )}>
                {getStatusBadge(reviewStatus.status).label}
              </span>
            </div>
            {reviewStatus.reviewComment && (
              <p className="mt-2 text-sm text-gray-300 border-t border-dark-700 pt-2">
                {reviewStatus.reviewComment}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-sm text-gray-300">Add Reviewer Emails</Label>
          {reviewers.map((email, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={email}
                onChange={(e) => {
                  const newReviewers = [...reviewers];
                  newReviewers[index] = e.target.value;
                  setReviewers(newReviewers);
                }}
                placeholder="reviewer@example.com"
                className="h-9 text-sm bg-[#0f172a]/50 border-dark-700 flex-1"
              />
              {index === reviewers.length - 1 && (
                <button
                  onClick={() => setReviewers([...reviewers, ''])}
                  className="p-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-xs"
                >
                  Add
                </button>
              )}
              {reviewers.length > 1 && (
                <button
                  onClick={() => {
                    const newReviewers = reviewers.filter((_, i) => i !== index);
                    setReviewers(newReviewers);
                  }}
                  className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <Button
            onClick={handleSendReview}
            disabled={sending || !microserviceId}
            className="bg-primary hover:bg-primary/90 text-white w-full"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send Review Request
          </Button>
        </div>

        {approvalHistory.length > 0 && (
          <div className="mt-4 pt-4 border-t border-dark-700">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Review History</p>
            <div className="space-y-2">
              {approvalHistory.slice(0, 5).map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[#0f172a]/30 border border-dark-700 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      entry.status === 'APPROVED' ? "bg-green-400" :
                      entry.status === 'REJECTED' ? "bg-red-400" : "bg-yellow-400"
                    )} />
                    <span className="text-white">{entry.approverEmail || entry.sentBy}</span>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    entry.status === 'APPROVED' ? "bg-green-500/20 text-green-400" :
                    entry.status === 'REJECTED' ? "bg-red-500/20 text-red-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  )}>
                    {entry.status || 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Code Merge Card */}
      <Card className="p-6" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-primary" />
            Code Merge
          </CardTitle>
          <button
            onClick={() => setShowMergeModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all flex items-center gap-2"
          >
            <GitBranch className="w-4 h-4" />
            Merge to Main
          </button>
        </div>
        <p className="text-sm text-gray-400">Merge the latest changes into the main branch.</p>
      </Card>

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-dark-700 shadow-2xl" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <GitPullRequest className="w-5 h-5 text-primary" />
                Merge Code
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-300">Target Branch</Label>
                  <select
                    value={mergeBranch}
                    onChange={(e) => setMergeBranch(e.target.value)}
                    className="w-full h-9 rounded-lg px-3 py-2 text-sm text-white bg-[#0f172a]/50 border-dark-700"
                  >
                    <option value="main">main</option>
                    <option value="develop">develop</option>
                    <option value="staging">staging</option>
                  </select>
                </div>
                {mergeStatus === 'merging' && (
                  <div className="flex items-center gap-2 text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Merging...</span>
                  </div>
                )}
                {mergeStatus === 'success' && (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Merge successful!</span>
                  </div>
                )}
                {mergeStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>Merge failed. Please try again.</span>
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
                  <button
                    onClick={() => setShowMergeModal(false)}
                    className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-800 transition-colors"
                    disabled={mergeStatus === 'merging'}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMerge}
                    disabled={mergeStatus === 'merging'}
                    className={cn(
                      'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
                      mergeStatus === 'merging' ? 'bg-dark-700 text-gray-500 cursor-not-allowed' :
                      'bg-blue-600 hover:bg-blue-500 text-white'
                    )}
                  >
                    {mergeStatus === 'merging' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Confirm Merge
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}