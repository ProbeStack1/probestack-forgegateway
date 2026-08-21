import React, { useState, useEffect } from 'react';
import {
  Server, FileCode, Loader2, CheckCircle, XCircle, ChevronRight, ChevronDown,
  Copy, Check, Download, ExternalLink, Play, Wrench, Layers, MessageSquare,
  AlertCircle, Zap, Trash2
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { mcpGenerationService } from '../../../services/mcpGenerationService';

const TRANSPORT_OPTIONS = [
  { id: 'http', label: 'Streamable-HTTP', description: 'Deploy a live mock server with a URL.', icon: Server },
  { id: 'stdio', label: 'Stdio (Local)', description: 'Generate a downloadable mock server script.', icon: FileCode },
];

// ✅ Use Vite's import.meta.env instead of process.env
const API_BASE_URL = import.meta.env.VITE_MCP_GEN_BASE_URL || 'https://forgegateway.probestack.io/mcp-generate/v1/api';

export default function Step5MCPMock({ state, dispatch, setToast }) {
  const projectId = state?.projectId;
  const selectedSpec = state?.selectedSpec;
  const capabilities = state?.capabilities || { tools: [], resources: [], prompts: [] };

  const [selectedTransport, setSelectedTransport] = useState('http');
  const [generating, setGenerating] = useState(false);
  const [mockData, setMockData] = useState(null);
  const [mockTools, setMockTools] = useState([]);
  const [mockResources, setMockResources] = useState([]);
  const [mockPrompts, setMockPrompts] = useState([]);
  const [expandedToolId, setExpandedToolId] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [testingToolId, setTestingToolId] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // ── Fetch existing mock ──────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    const loadMock = async () => {
      try {
        const result = await mcpGenerationService.getMock(projectId);
        if (result.success && result.data) {
          setMockData({
            mockServerId: result.data.id,
            mockServerUrl: result.data.mockServerUrl,
            transport: result.data.transport,
            generatedAt: result.data.generatedAt,
            generatedBy: result.data.generatedBy,
          });
          setSelectedTransport(result.data.transport || 'http');
          prepareMockTools(capabilities);
        } else {
          // No mock exists – reset
          setMockData(null);
          setMockTools([]);
          setMockResources([]);
          setMockPrompts([]);
        }
      } catch (error) {
        // If GET fails (e.g., 500 due to duplicates), we can ignore and let the user generate fresh.
        // We'll also log it silently.
        console.warn('Failed to fetch mock, user may generate fresh.', error);
        setMockData(null);
      }
    };
    loadMock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ── Prepare mock tools ───────────────────────────────────────
  const prepareMockTools = (caps) => {
    const toolsWithMock = (caps.tools || []).map(tool => ({
      ...tool,
      mockRequest: generateMockRequest(tool),
      mockResponse: generateMockResponse(tool),
    }));
    setMockTools(toolsWithMock);
    setMockResources(caps.resources || []);
    setMockPrompts(caps.prompts || []);
  };

  // Mock data generators
  const generateMockRequest = (tool) => {
    const schema = tool.inputSchema || { properties: {} };
    const sample = {};
    for (const [key, prop] of Object.entries(schema.properties || {})) {
      if (prop.type === 'string') sample[key] = prop.example || 'sample-string';
      else if (prop.type === 'number') sample[key] = prop.example || 42;
      else if (prop.type === 'boolean') sample[key] = prop.example || true;
      else if (prop.type === 'array') sample[key] = prop.example || [];
      else if (prop.type === 'object') sample[key] = prop.example || {};
    }
    return sample;
  };

  const generateMockResponse = (tool) => ({
    id: 'mock-' + Math.random().toString(36).substr(2, 6),
    status: 'success',
    data: { message: `Mock response for ${tool.name}` },
    timestamp: new Date().toISOString(),
  });

  // ── Generate mock ────────────────────────────────────────────
  const handleGenerateMock = async () => {
    if (!projectId) {
      setToast?.({ message: 'Project not found. Please save first.', type: 'error' });
      return;
    }
    setGenerating(true);
    try {
      // Delete existing mock if any (to avoid duplicates)
      const existing = await mcpGenerationService.getMock(projectId);
      if (existing.success && existing.data) {
        await mcpGenerationService.deleteMock(projectId);
      }

      // Generate new mock
      const result = await mcpGenerationService.generateMock(projectId, { transport: selectedTransport });
      if (result.success) {
        const data = result.data || {};
        setMockData({
          mockServerId: data.mockServerId,
          mockServerUrl: data.mockServerUrl,
          transport: data.transport,
          generatedAt: data.generatedAt,
          generatedBy: data.generatedBy,
        });
        prepareMockTools(capabilities);
        setToast?.({ message: `Mock server ${selectedTransport === 'http' ? 'deployed' : 'generated'} successfully!`, type: 'success' });
      } else {
        setToast?.({ message: result.error || 'Failed to generate mock server.', type: 'error' });
      }
    } catch (error) {
      setToast?.({ message: error.message || 'Error generating mock server.', type: 'error' });
    }
    setGenerating(false);
  };

  // ── Test tool ────────────────────────────────────────────────
  const handleTestTool = async (toolId) => {
    setTestingToolId(toolId);
    await new Promise(resolve => setTimeout(resolve, 800));
    const tool = mockTools.find(t => t.id === toolId);
    setTestResults(prev => ({
      ...prev,
      [toolId]: {
        status: 'success',
        response: { content: tool?.mockResponse || { message: 'Mock response' } },
        timestamp: new Date().toISOString(),
      }
    }));
    setTestingToolId(null);
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // ── Render tool ──────────────────────────────────────────────
  const renderTool = (tool) => {
    const isExpanded = expandedToolId === tool.id;
    const testResult = testResults[tool.id];
    const isTesting = testingToolId === tool.id;

    return (
      <div key={tool.id} className="rounded-lg border border-dark-700 bg-[#0f172a]/40 overflow-hidden mb-3">
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#0f172a]/60 transition-colors"
          onClick={() => setExpandedToolId(isExpanded ? null : tool.id)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Wrench className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{tool.name}</p>
              {tool.description && <p className="text-xs text-gray-400 truncate">{tool.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {testResult && (
              <span className={cn(
                'text-xs font-medium flex items-center gap-1',
                testResult.status === 'success' ? 'text-green-400' : 'text-red-400'
              )}>
                {testResult.status === 'success' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {testResult.status === 'success' ? 'OK' : 'Failed'}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleTestTool(tool.id); }}
              disabled={isTesting || !mockData}
              className={cn(
                'px-2 py-1 rounded text-xs font-medium transition-all',
                isTesting ? 'opacity-50 cursor-not-allowed' :
                mockData ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-dark-700 text-gray-500 cursor-not-allowed'
              )}
              title="Test this tool"
            >
              {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Test
            </button>
            {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-dark-700 px-4 py-3 space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Input Schema</p>
              <pre className="text-[11px] font-mono bg-dark-900/70 p-2 rounded overflow-auto max-h-32 text-gray-300">
                {JSON.stringify(tool.inputSchema, null, 2)}
              </pre>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mock Request</p>
                <button
                  onClick={() => handleCopy(JSON.stringify(tool.mockRequest, null, 2), `req-${tool.id}`)}
                  className="text-[10px] text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
                >
                  {copiedKey === `req-${tool.id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  Copy
                </button>
              </div>
              <pre className="text-[11px] font-mono bg-dark-900/70 p-2 rounded overflow-auto max-h-24 text-gray-300 mt-1">
                {JSON.stringify(tool.mockRequest, null, 2)}
              </pre>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mock Response</p>
                <button
                  onClick={() => handleCopy(JSON.stringify(tool.mockResponse, null, 2), `resp-${tool.id}`)}
                  className="text-[10px] text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
                >
                  {copiedKey === `resp-${tool.id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  Copy
                </button>
              </div>
              <pre className="text-[11px] font-mono bg-dark-900/70 p-2 rounded overflow-auto max-h-24 text-gray-300 mt-1">
                {JSON.stringify(tool.mockResponse, null, 2)}
              </pre>
            </div>
            {testResult && (
              <div className={cn(
                'p-2 rounded text-xs',
                testResult.status === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-200' :
                'bg-red-500/10 border border-red-500/30 text-red-200'
              )}>
                <div className="flex items-center gap-2">
                  {testResult.status === 'success' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span className="font-semibold">{testResult.status === 'success' ? 'Success' : 'Error'}</span>
                  <span className="text-gray-400 text-[10px]">{testResult.timestamp}</span>
                </div>
                {testResult.response && (
                  <pre className="mt-1 text-[10px] font-mono bg-black/30 p-2 rounded max-h-32 overflow-auto">
                    {JSON.stringify(testResult.response, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Main render ──────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Server className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-white">MCP Mock Server</h2>
        {mockData && (
          <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
            Generated {new Date(mockData.generatedAt).toLocaleString()}
          </span>
        )}
      </div>

      {/* Spec Summary */}
      <div className="rounded-xl border border-dark-700 p-4 bg-[#0f172a]/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Selected Specification</p>
            <p className="text-sm font-medium text-white">{selectedSpec?.name || 'No spec selected'}</p>
            <p className="text-xs text-gray-400">
              {capabilities.tools.length} Tools · {capabilities.resources.length} Resources · {capabilities.prompts.length} Prompts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              mockData ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            )}>
              {mockData ? 'Mock Ready' : 'Not Generated'}
            </span>
          </div>
        </div>
      </div>

      {/* Transport Selection + Generate */}
      <div className="rounded-xl border border-dark-700 p-4 bg-[#0f172a]/40">
        <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Transport & Generation
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {TRANSPORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedTransport === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedTransport(opt.id)}
                className={cn(
                  'text-left p-3 rounded-lg border transition-all',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-[0_0_10px_rgba(255,91,31,0.2)]'
                    : 'border-dark-700 hover:border-primary/50 bg-[#0f172a]/30'
                )}
                disabled={generating}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    isSelected ? 'bg-primary/20 text-primary' : 'bg-dark-700 text-gray-400'
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateMock}
            disabled={generating || !projectId}
            className={cn(
              'px-6 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2',
              (generating || !projectId)
                ? 'bg-dark-700 text-gray-400 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25'
            )}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
            {generating ? 'Generating...' : mockData ? 'Regenerate Mock Server' : 'Generate Mock Server'}
          </button>
          {/* {mockData && (
            <button
              onClick={async () => {
                if (!projectId) return;
                const res = await mcpGenerationService.deleteMock(projectId);
                if (res.success) {
                  setMockData(null);
                  setMockTools([]);
                  setMockResources([]);
                  setMockPrompts([]);
                  setTestResults({});
                  setToast?.({ message: 'Mock server deleted.', type: 'success' });
                } else {
                  setToast?.({ message: res.error || 'Failed to delete mock.', type: 'error' });
                }
              }}
              className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete Mock
            </button>
          )} */}
        </div>

        {/* Result details */}
        {mockData && (
          <div className="mt-4 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
            {mockData.transport === 'http' && mockData.mockServerUrl && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Mock Server URL</p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm font-mono text-green-300 break-all">{mockData.mockServerUrl}</code>
                  <button onClick={() => handleCopy(mockData.mockServerUrl, 'mockUrl')} className="p-1 rounded hover:bg-green-500/20 text-gray-400 hover:text-green-300">
                    {copiedKey === 'mockUrl' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <a href={mockData.mockServerUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-green-500/20 text-gray-400 hover:text-green-300">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
            {mockData.transport === 'stdio' && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Stdio Mock Server</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-gray-300">Download the mock server script</span>
                  <a
                    href={`${API_BASE_URL}/projects/${projectId}/mock/download`}
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-sm font-medium"
                  >
                    <Download className="w-4 h-4" /> Download
                  </a>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Generated by {mockData.generatedBy || 'system'} at {new Date(mockData.generatedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Capabilities list */}
      {mockData && (mockTools.length > 0 || mockResources.length > 0 || mockPrompts.length > 0) && (
        <div className="rounded-xl border border-dark-700 p-4 bg-[#0f172a]/30">
          <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />
            Mocked Capabilities
          </p>
          {mockTools.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-300">Tools ({mockTools.length})</p>
              <div className="space-y-2 mt-2">
                {mockTools.map(renderTool)}
              </div>
            </div>
          )}
          {mockResources.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-300">Resources ({mockResources.length})</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {mockResources.map((res, idx) => (
                  <div key={idx} className="border border-dark-700 rounded-lg p-2 bg-[#0f172a]/30">
                    <p className="text-sm font-medium text-white truncate">{res.name}</p>
                    {res.description && <p className="text-xs text-gray-400 truncate">{res.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {mockPrompts.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-300">Prompts ({mockPrompts.length})</p>
              <div className="space-y-2 mt-2">
                {mockPrompts.map((prompt, idx) => (
                  <div key={idx} className="border border-dark-700 rounded-lg p-2 bg-[#0f172a]/30">
                    <p className="text-sm font-medium text-white">{prompt.name}</p>
                    {prompt.description && <p className="text-xs text-gray-400">{prompt.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}