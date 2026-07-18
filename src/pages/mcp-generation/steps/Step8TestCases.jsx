import React, { useState, useEffect, useCallback } from 'react';
import { 
  TestTube, Play, Loader2, CheckCircle, XCircle, AlertCircle, 
  Eye, ChevronDown, ChevronRight, FileCode, Server, Activity,
  RefreshCw, Download, Copy, Check, ExternalLink, Clock, Zap, Shield,
  FileText, Code, Terminal, List, Filter, Search, Users, GitBranch,
  BarChart, TrendingUp, TrendingDown, MinusCircle, PlusCircle,
  ArrowRight, ArrowLeft, Table, Grid, List as ListIcon, LayoutGrid
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Card, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import Editor from '@monaco-editor/react';
import { mcpGenerationService } from '../../../services/mcpGenerationService';

const cardStyle = { backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' };
const categoryColors = {
  POSITIVE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  NEGATIVE: 'text-red-400 bg-red-500/10 border-red-500/30',
  SECURITY: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  PERFORMANCE: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  SCHEMA_VALIDATION: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  BOUNDARY: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
};

const categoryIcons = {
  POSITIVE: <CheckCircle className="w-4 h-4" />,
  NEGATIVE: <XCircle className="w-4 h-4" />,
  SECURITY: <Shield className="w-4 h-4" />,
  PERFORMANCE: <Zap className="w-4 h-4" />,
  SCHEMA_VALIDATION: <FileText className="w-4 h-4" />,
  BOUNDARY: <MinusCircle className="w-4 h-4" />,
};

export default function Step8TestCases({ state, dispatch, setToast }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testData, setTestData] = useState(null); // { postmanCollection, scenarioMetadata }
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [baseUrl, setBaseUrl] = useState('');
  const [runningTests, setRunningTests] = useState({});
  const [testResults, setTestResults] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [showCollection, setShowCollection] = useState(false);

  // Get the test collection URL from state (set by Step 7)
  const testCollectionUrl = state?.generated?.testCollectionUrl || state?.testCollectionUrl;

  const fetchTestData = useCallback(async () => {
    if (!testCollectionUrl) {
      setError('No test collection URL found. Please generate the MCP server first (Step 7).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(testCollectionUrl);
      if (!response.ok) throw new Error(`Failed to fetch test collection: ${response.status}`);
      const data = await response.json();
      // data should have { postmanCollection, scenarioMetadata }
      setTestData(data);
      // Auto-set baseUrl from state if available
      if (state?.transport?.baseUrl) {
        setBaseUrl(state.transport.baseUrl);
      }
    } catch (err) {
      setError(err.message || 'Failed to load test collection');
      setToast?.({ message: `Failed to load test collection: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [testCollectionUrl, state?.transport?.baseUrl, setToast]);

  useEffect(() => {
    fetchTestData();
  }, [fetchTestData]);

  // Extract categories from scenario metadata
  const categories = testData?.scenarioMetadata 
    ? ['ALL', ...new Set(testData.scenarioMetadata.map(s => s.category))]
    : ['ALL'];

  const getScenariosForCategory = (category) => {
    if (!testData?.scenarioMetadata) return [];
    if (category === 'ALL') return testData.scenarioMetadata;
    return testData.scenarioMetadata.filter(s => s.category === category);
  };

  const runSingleTest = async (scenario) => {
    const toolName = scenario.toolName;
    const args = {}; // we need to generate arguments based on schema; for now use empty
    // In a real implementation, we'd fetch the tool's schema from the project's capabilities
    // and generate appropriate arguments. For simplicity, we'll send empty args.
    const key = `${toolName}-${scenario.category}`;
    setRunningTests(prev => ({ ...prev, [key]: true }));
    try {
      const result = await mcpGenerationService.call({
        url: baseUrl,
        transport: state?.transport?.kind || 'streamable-http',
        authHeader: state?.auth?.kind === 'bearer' && state?.auth?.generatedToken 
          ? `Bearer ${state.auth.generatedToken}` : '',
        toolName,
        arguments: args,
        mock: false,
      });
      const passed = result.success && result.data?.ok;
      setTestResults(prev => ({ 
        ...prev, 
        [key]: { 
          status: passed ? 'passed' : 'failed', 
          details: result.data,
          error: result.error,
          timestamp: new Date().toISOString(),
        }
      }));
      if (!passed) {
        setToast?.({ message: `Test for ${toolName} failed`, type: 'error' });
      } else {
        setToast?.({ message: `Test for ${toolName} passed!`, type: 'success' });
      }
    } catch (err) {
      setTestResults(prev => ({ 
        ...prev, 
        [key]: { 
          status: 'failed', 
          error: err.message || 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }));
      setToast?.({ message: `Test for ${toolName} failed: ${err.message}`, type: 'error' });
    } finally {
      setRunningTests(prev => ({ ...prev, [key]: false }));
    }
  };

  const runAllInCategory = async (category) => {
    const scenarios = getScenariosForCategory(category);
    for (const scenario of scenarios) {
      await runSingleTest(scenario);
    }
  };

  const toggleExpanded = (key) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-gray-400">Loading test collection...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6" style={cardStyle}>
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Unable to load test collection</p>
            <p className="text-xs text-red-300/80 mt-1">{error}</p>
            {!testCollectionUrl && (
              <p className="text-xs text-gray-400 mt-2">
                Please generate the MCP server in Step 7 to create the test collection.
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (!testData || !testData.scenarioMetadata || testData.scenarioMetadata.length === 0) {
    return (
      <Card className="p-6" style={cardStyle}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-700/30 flex items-center justify-center mb-4">
            <TestTube className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">No Test Cases Found</h3>
          <p className="text-sm text-gray-400 mt-2 max-w-md">
            No scenario-based test cases were generated for this MCP server.
            Please ensure Step 7 (MCP Development) has been completed with at least one tool defined.
          </p>
        </div>
      </Card>
    );
  }

  const allScenarios = testData.scenarioMetadata;
  const filteredScenarios = getScenariosForCategory(activeCategory);
  const categoryStats = {};
  categories.forEach(cat => {
    if (cat === 'ALL') return;
    const items = getScenariosForCategory(cat);
    categoryStats[cat] = {
      total: items.length,
      passed: items.filter(s => testResults[`${s.toolName}-${s.category}`]?.status === 'passed').length,
      failed: items.filter(s => testResults[`${s.toolName}-${s.category}`]?.status === 'failed').length,
    };
  });

  const totalTests = allScenarios.length;
  const totalPassed = allScenarios.filter(s => testResults[`${s.toolName}-${s.category}`]?.status === 'passed').length;
  const totalFailed = allScenarios.filter(s => testResults[`${s.toolName}-${s.category}`]?.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-dark-700 bg-[#0f172a]/50">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Test Cases</p>
          <p className="text-2xl font-bold text-white mt-1">{totalTests}</p>
        </div>
        <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Passed</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{totalPassed}</p>
        </div>
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Failed</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{totalFailed}</p>
        </div>
        <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/10">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Pass Rate</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">
            {totalTests === 0 ? '—' : `${Math.round((totalPassed / totalTests) * 100)}%`}
          </p>
        </div>
      </div>

      {/* Base URL Input + Actions */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-dark-700 bg-[#0f172a]/50">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs text-gray-300">Target MCP Server URL</Label>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:3500/mcp"
            className="h-9 text-sm bg-dark-900/50 border-dark-700"
          />
        </div>
        <div className="flex items-center gap-2 self-end">
          <Button
            onClick={() => runAllInCategory(activeCategory)}
            disabled={runningTests[`all-${activeCategory}`] || filteredScenarios.length === 0}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {runningTests[`all-${activeCategory}`] ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Run All {activeCategory !== 'ALL' ? activeCategory : ''}
          </Button>
          <Button
            onClick={fetchTestData}
            variant="outline"
            className="border-dark-700 text-gray-300 hover:text-white hover:bg-dark-800"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setShowCollection(!showCollection)}
            variant="outline"
            className="border-dark-700 text-gray-300 hover:text-white hover:bg-dark-800"
          >
            {showCollection ? <Eye className="w-4 h-4" /> : <FileCode className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Postman Collection viewer (collapsible) */}
      {showCollection && testData?.postmanCollection && (
        <Card className="p-4" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Postman Collection</h3>
            <button
              onClick={() => {
                const blob = new Blob([testData.postmanCollection], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'mcp-test-collection.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-dark-700 text-xs text-gray-300 hover:bg-dark-800"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
          <div className="h-[400px] rounded-lg overflow-hidden border border-dark-700">
            <Editor
              height="100%"
              language="json"
              value={testData.postmanCollection}
              options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
              theme="vs-dark"
            />
          </div>
        </Card>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-dark-700 pb-2">
        {categories.map((cat) => {
          const count = cat === 'ALL' ? allScenarios.length : getScenariosForCategory(cat).length;
          const stats = categoryStats[cat];
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                activeCategory === cat
                  ? 'bg-primary/20 text-primary border border-primary/50'
                  : 'text-gray-400 hover:text-white hover:bg-dark-800 border border-transparent'
              )}
            >
              {cat === 'ALL' ? <List className="w-4 h-4" /> : categoryIcons[cat] || <FileText className="w-4 h-4" />}
              {cat === 'ALL' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()}
              <span className="text-xs bg-dark-700 px-1.5 py-0.5 rounded-full">{count}</span>
              {stats && (
                <span className="text-xs flex items-center gap-1 ml-1">
                  <span className="text-emerald-400">{stats.passed}</span>
                  <span className="text-gray-500">/</span>
                  <span className="text-red-400">{stats.failed}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Test Cases List */}
      {filteredScenarios.length === 0 ? (
        <div className="p-8 text-center text-gray-400 border border-dashed border-dark-700 rounded-xl">
          No test cases in this category.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredScenarios.map((scenario, index) => {
            const key = `${scenario.toolName}-${scenario.category}`;
            const result = testResults[key];
            const isRunning = runningTests[key];
            const isExpanded = expandedItems[key];
            const statusColor = result?.status === 'passed' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                              : result?.status === 'failed' ? 'text-red-400 border-red-500/30 bg-red-500/10'
                              : 'border-dark-700 bg-[#0f172a]/30';

            return (
              <div key={key} className={`rounded-lg border ${statusColor} transition-all`}>
                <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      result?.status === 'passed' ? 'bg-emerald-400' : result?.status === 'failed' ? 'bg-red-400' : 'bg-gray-500'
                    )} />
                    <span className="text-sm font-medium text-white truncate">{scenario.toolName}</span>
                    <span className="text-xs text-gray-400 hidden sm:inline">{scenario.description}</span>
                    <span className="text-xs text-gray-500">Expected: {scenario.expectedStatus || '200'}</span>
                    {result && (
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        result.status === 'passed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      )}>
                        {result.status === 'passed' ? '✓ Passed' : '✗ Failed'}
                      </span>
                    )}
                    {result?.timestamp && (
                      <span className="text-[10px] text-gray-500">{new Date(result.timestamp).toLocaleTimeString()}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => runSingleTest(scenario)}
                      disabled={isRunning || !baseUrl}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                        isRunning ? 'bg-gray-700 text-gray-400 cursor-not-allowed' :
                        result?.status === 'passed' ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' :
                        result?.status === 'failed' ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' :
                        'bg-primary/20 text-primary hover:bg-primary/30'
                      )}
                    >
                      {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      {result ? 'Rerun' : 'Run'}
                    </button>
                    <button
                      onClick={() => toggleExpanded(key)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-dark-700/50 p-4 space-y-3 bg-[#0f172a]/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</p>
                        <dl className="mt-2 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-gray-400">Tool</dt>
                            <dd className="text-white font-mono">{scenario.toolName}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-400">Category</dt>
                            <dd className={cn('font-medium', categoryColors[scenario.category]?.split(' ')[0] || 'text-white')}>
                              {scenario.category}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-400">Expected Status</dt>
                            <dd className="text-white">{scenario.expectedStatus || '200'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-400">Description</dt>
                            <dd className="text-white text-right max-w-[200px] truncate">{scenario.description}</dd>
                          </div>
                        </dl>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Results</p>
                        {result ? (
                          <div className="mt-2 p-3 rounded-lg bg-dark-900/50 border border-dark-700">
                            <div className="flex items-center gap-2">
                              {result.status === 'passed' ? (
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400" />
                              )}
                              <span className={cn(
                                'font-medium',
                                result.status === 'passed' ? 'text-emerald-400' : 'text-red-400'
                              )}>
                                {result.status === 'passed' ? 'Test Passed' : 'Test Failed'}
                              </span>
                              {result.details?.ms && (
                                <span className="text-xs text-gray-400 ml-auto">{result.details.ms}ms</span>
                              )}
                            </div>
                            {result.details?.content && (
                              <div className="mt-2 max-h-32 overflow-auto bg-[#0a0e1b] rounded p-2 text-xs text-gray-300 font-mono whitespace-pre-wrap">
                                {typeof result.details.content === 'string' 
                                  ? result.details.content 
                                  : JSON.stringify(result.details.content, null, 2)}
                              </div>
                            )}
                            {result.error && (
                              <div className="mt-2 text-xs text-red-300 bg-red-500/10 p-2 rounded border border-red-500/30">
                                {result.error}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2 p-3 rounded-lg bg-dark-900/30 border border-dark-700 text-center text-gray-500 text-sm">
                            Not yet run
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}