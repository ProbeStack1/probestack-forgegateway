import React, { useState, useEffect } from 'react';
import { Card, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import {
  CheckCircle2, Check, Download, RefreshCw, Rocket, FileCode,
  Server, Key, Users, GitBranch, Cloud, Activity, Shield,
  FileText, Loader2, ArrowRight, ExternalLink, Package,
  BarChart, TrendingUp, CheckCircle, AlertCircle
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { mcpGenerationService } from '../../../services/mcpGenerationService';

const cardStyle = { backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' };

export default function Step11CompleteMcp({ state, dispatch, setToast, onReset, navigate }) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [deployStatus, setDeployStatus] = useState(null);

  const projectId = state?.projectId;
  const fileCount = state?.generated?.files?.length || 0;
  const identity = state?.identity || {};
  const runtime = state?.runtime || {};
  const transport = state?.transport || {};
  const capabilities = state?.capabilities || {};
  const auth = state?.auth || {};

  useEffect(() => {
    // Generate if not already done
    if (projectId && fileCount === 0 && !generating) {
      setGenerating(true);
      mcpGenerationService.generate(projectId).then((res) => {
        setGenerating(false);
        if (!res.success) {
          setGenError(res.error || 'Generation failed');
          setToast?.({ message: `Couldn't generate code: ${res.error}`, type: 'error' });
          return;
        }
        dispatch({ type: 'SET_GENERATED', generated: res.data?.generated || res.data });
        setToast?.({ message: 'Code generated successfully.', type: 'success' });
      });
    }
    // Set download URL
    if (projectId) {
      setDownloadUrl(mcpGenerationService.downloadUrl(projectId));
    }
    // Fetch latest deploy status if available
    if (projectId) {
      mcpGenerationService.getLatestWorkflowRun(projectId).then((res) => {
        if (res.success) setDeployStatus(res.data);
      }).catch(() => {});
    }
  }, [projectId, fileCount, generating, dispatch, setToast]);

  const handleGenerate = async () => {
    if (!projectId) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await mcpGenerationService.generate(projectId);
      if (!res.success) throw new Error(res.error);
      dispatch({ type: 'SET_GENERATED', generated: res.data?.generated || res.data });
      setToast({ message: 'Code regenerated successfully.', type: 'success' });
    } catch (err) {
      setGenError(err.message);
      setToast({ message: err.message, type: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    if (onReset) onReset();
    else {
      dispatch({ type: 'RESET_TO_INITIAL' });
      if (navigate) navigate('/generate');
    }
  };

  const toolCount = capabilities.tools?.length || 0;
  const resourceCount = capabilities.resources?.length || 0;
  const promptCount = capabilities.prompts?.length || 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
          {generating ? (
            <Loader2 className="w-8 h-8 text-emerald-300 animate-spin" />
          ) : genError ? (
            <AlertCircle className="w-8 h-8 text-red-300" />
          ) : (
            <CheckCircle2 className="w-8 h-8 text-emerald-300" />
          )}
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          {generating ? 'Generating your MCP server…' : genError ? 'Generation failed' : 'Your MCP server is ready!'}
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          {genError ? genError : `MCP server "${identity.displayName || identity.slug}" has been generated with ${fileCount} files.`}
        </p>
      </div>

      {/* Server Info */}
      {!genError && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="p-6" style={cardStyle}>
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2 mb-3">
              <Server className="w-4 h-4" /> Server Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Name</span>
                <span className="text-white font-medium">{identity.displayName || identity.slug || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Slug</span>
                <span className="text-white font-mono">{identity.slug || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Language</span>
                <span className="text-white">{runtime.language || 'typescript'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Transport</span>
                <span className="text-white">{transport.kind || 'streamable-http'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Auth</span>
                <span className="text-white">{auth.kind || 'none'}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6" style={cardStyle}>
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2 mb-3">
              <BarChart className="w-4 h-4" /> Capabilities
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-lg bg-[#0f172a]/50 border border-dark-700">
                <p className="text-2xl font-bold text-white">{toolCount}</p>
                <p className="text-xs text-gray-400">Tools</p>
              </div>
              <div className="p-3 rounded-lg bg-[#0f172a]/50 border border-dark-700">
                <p className="text-2xl font-bold text-white">{resourceCount}</p>
                <p className="text-xs text-gray-400">Resources</p>
              </div>
              <div className="p-3 rounded-lg bg-[#0f172a]/50 border border-dark-700">
                <p className="text-2xl font-bold text-white">{promptCount}</p>
                <p className="text-xs text-gray-400">Prompts</p>
              </div>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-[#0f172a]/30 border border-dark-700">
              <p className="text-xs text-gray-400">Total files</p>
              <p className="text-lg font-semibold text-white">{fileCount}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
        <a
          href={downloadUrl || '#'}
          download
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all',
            downloadUrl && !generating ? 'bg-[#ff5b1f] hover:bg-[#ff5b1f]/90 text-white' : 'bg-dark-700 text-gray-500 pointer-events-none'
          )}
        >
          <Download className="w-4 h-4" />
          {generating ? 'Generating...' : 'Download Bundle'}
        </a>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-6 py-3 rounded-lg border border-dark-700 text-gray-300 hover:bg-dark-800 hover:text-white text-sm font-medium transition-all"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {generating ? 'Generating...' : 'Regenerate'}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-6 py-3 rounded-lg border border-dark-700 text-gray-300 hover:bg-dark-800 hover:text-white text-sm font-medium transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Start New
        </button>
      </div>

      {/* Deployment Status (if available) */}
      {deployStatus && (
        <Card className="p-6" style={cardStyle}>
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2 mb-3">
            <Rocket className="w-4 h-4" /> Deployment Status
          </h3>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm text-white">
                Status: <span className={cn(
                  "font-semibold",
                  deployStatus.deploymentStatus === 'SUCCESS' ? "text-green-400" :
                  deployStatus.deploymentStatus === 'FAILED' ? "text-red-400" : "text-yellow-400"
                )}>{deployStatus.deploymentStatus || 'Unknown'}</span>
              </p>
              {deployStatus.deployedServiceUrl && (
                <p className="text-sm text-gray-300">
                  URL: <a href={deployStatus.deployedServiceUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{deployStatus.deployedServiceUrl}</a>
                </p>
              )}
            </div>
            {deployStatus.run && (
              <a href={deployStatus.run.htmlUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                View Run <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </Card>
      )}

      {/* Next Steps */}
      <div className="mt-8 p-6 rounded-xl border border-dark-700 bg-[#0f172a]/50">
        <h3 className="text-sm font-semibold text-white mb-3">Next Steps</h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            Download the generated bundle and explore the code.
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            Deploy the server using the "Push & Deploy" button in Step 7.
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            Connect your MCP client (Claude Desktop, Cursor, etc.) using the generated configs.
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            Run tests in Step 8 to validate your tools.
          </li>
        </ul>
      </div>
    </div>
  );
}