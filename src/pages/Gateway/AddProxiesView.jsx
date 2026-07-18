// src/components/Gateway/AddProxiesView.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Plus, ArrowRight, FileText } from 'lucide-react';

export const AddProxiesView = ({ showMessage }) => {
  const [proxyName, setProxyName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleOpenEditor = () => {
    const trimmed = proxyName.trim();
    if (!trimmed) {
      setError('Proxy name is required');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setError('Only letters, numbers, hyphens and underscores allowed');
      return;
    }
    setError('');
    navigate('/proxy-editor', {
      state: {
        selectedProxyName: trimmed,
        newProxy: true,
        backTo: '/gateway/new-proxy'
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-white">Add New Proxy</h2>
      </div>

      {/* Content Card */}
      <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] shadow-xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-[#2a3550] bg-[#0f172a]/50">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#ff8a5c]" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Proxy Details</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">Enter a name for your new proxy and start editing</p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Proxy Name
            </label>
            <input
              type="text"
              placeholder="e.g., my-new-api"
              value={proxyName}
              onChange={(e) => {
                setProxyName(e.target.value);
                setError('');
              }}
              className="w-full max-w-md bg-[#0f1117] border border-[#2a3550] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#ff5b1f] transition-colors"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Only letters, numbers, hyphens and underscores allowed.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleOpenEditor}
              className="bg-[#ff5b1f] hover:bg-[#ff6b36] text-white px-6"
            >
              Open in Editor
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};