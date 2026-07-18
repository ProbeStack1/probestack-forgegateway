import React, { useState, useMemo } from 'react';
import { X, MapPin, AlertTriangle, Check, Info } from 'lucide-react';
import {
  getSpecEndpoints, getResponseStatuses, getContentTypes, getSchemaAtLocation, mapSchemaToEndpoint,
} from '../utils/specUtils';
import { getSchemaRefPath } from '../utils/schemaFieldUtils';

const METHOD_COLOR = {
  get: '#3b82f6', post: '#10b981', put: '#f59e0b', patch: '#f59e0b',
  delete: '#ef4444', options: '#8b5cf6', head: '#64748b', trace: '#64748b',
};

const CUSTOM = '__custom__';

// Maps a saved schema's $ref into a specific endpoint's requestBody or a
// response status, writing directly into the spec's paths structure (rather
// than relying on free-text cursor placement) so the result is always
// structurally correct OpenAPI. If the schema isn't in components.schemas
// yet, `definition` lets this also add it there in the same operation, so
// the inserted $ref never points at a component that doesn't exist.
export default function MapToEndpointModal({
  schemaName, definition, schemaInSpec, specContent, onSpecContentChange, onClose, showToast,
}) {
  const endpoints = useMemo(() => getSpecEndpoints(specContent), [specContent]);

  const [endpointKey, setEndpointKey] = useState('');
  const [locationKey, setLocationKey] = useState(''); // 'requestBody' | status code | CUSTOM
  const [customStatus, setCustomStatus] = useState('');
  const [contentType, setContentType] = useState('');
  const [customContentType, setCustomContentType] = useState('');
  const [confirming, setConfirming] = useState(false);

  const selected = endpoints.find(e => `${e.method}::${e.path}` === endpointKey);

  const responseStatuses = selected ? getResponseStatuses(specContent, selected.path, selected.method) : [];

  const location = !selected || !locationKey ? null
    : locationKey === 'requestBody' ? { kind: 'requestBody' }
    : locationKey === CUSTOM ? (customStatus.trim() ? { kind: 'response', status: customStatus.trim() } : null)
    : { kind: 'response', status: locationKey };

  const existingContentTypes = selected && location ? getContentTypes(specContent, selected.path, selected.method, location) : [];
  const effectiveContentType = contentType === CUSTOM ? customContentType.trim() : contentType;

  const existingSchema = selected && location && effectiveContentType
    ? getSchemaAtLocation(specContent, selected.path, selected.method, location, effectiveContentType)
    : null;

  const canMap = !!(selected && location && effectiveContentType);

  const resetDownstream = (from) => {
    if (from <= 1) { setLocationKey(''); setCustomStatus(''); }
    if (from <= 2) { setContentType(''); setCustomContentType(''); }
    setConfirming(false);
  };

  const handleEndpointChange = (key) => { setEndpointKey(key); resetDownstream(1); };
  const handleLocationChange = (key) => { setLocationKey(key); resetDownstream(2); };
  const handleContentTypeChange = (val) => { setContentType(val); setConfirming(false); };

  const handleMap = () => {
    if (!canMap || !onSpecContentChange) return;
    if (existingSchema && !confirming) { setConfirming(true); return; }

    const result = mapSchemaToEndpoint(specContent, {
      path: selected.path, method: selected.method, location,
      contentType: effectiveContentType, schemaName, definition,
    });
    onSpecContentChange(result.content);
    showToast(
      result.addedComponent
        ? `Mapped "${schemaName}" to ${selected.method.toUpperCase()} ${selected.path} (added missing component schema)`
        : `Mapped "${schemaName}" to ${selected.method.toUpperCase()} ${selected.path}`
    );
    setConfirming(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#161b2e] border border-[#232942] rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#f97316]" /> Map Schema to Endpoint
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mb-4">
          <p className="text-gray-500 text-xs">
            Writes <code className="text-[#f97316] font-mono">{`$ref: '${getSchemaRefPath(specContent, schemaName)}'`}</code> directly
            into the chosen endpoint's request or response body.
          </p>
          {!schemaInSpec && (
            <p className="flex items-center gap-1.5 text-xs text-cyan-400 mt-1">
              <Info className="w-3.5 h-3.5 shrink-0" />
              "{schemaName}" isn't in this spec's components.schemas yet — it'll be added automatically when you map it.
            </p>
          )}
        </div>

        <div className="space-y-3">
          {/* Endpoint */}
          <div>
            <label className="block text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1">Endpoint</label>
            <select
              value={endpointKey}
              onChange={e => handleEndpointChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#0b0f1e] border border-[#232942] rounded-lg text-gray-200 focus:outline-none focus:border-[#f97316]/50"
            >
              <option value="" style={{ background: '#0b0f1e' }}>
                {endpoints.length ? 'Select an endpoint…' : 'No endpoints found in this spec'}
              </option>
              {endpoints.map(e => (
                <option key={`${e.method}::${e.path}`} value={`${e.method}::${e.path}`} style={{ background: '#0b0f1e' }}>
                  {e.method.toUpperCase()} {e.path}{e.summary ? ` — ${e.summary}` : ''}
                </option>
              ))}
            </select>
            {selected && (
              <span
                className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: `${METHOD_COLOR[selected.method]}22`, color: METHOD_COLOR[selected.method] }}
              >
                {selected.method.toUpperCase()}
              </span>
            )}
          </div>

          {/* Location: requestBody vs response status */}
          {selected && (
            <div>
              <label className="block text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1">Request or Response</label>
              <select
                value={locationKey}
                onChange={e => handleLocationChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#0b0f1e] border border-[#232942] rounded-lg text-gray-200 focus:outline-none focus:border-[#f97316]/50"
              >
                <option value="" style={{ background: '#0b0f1e' }}>Select…</option>
                <option value="requestBody" style={{ background: '#0b0f1e' }}>Request Body</option>
                {responseStatuses.map(s => (
                  <option key={s} value={s} style={{ background: '#0b0f1e' }}>Response {s}</option>
                ))}
                <option value={CUSTOM} style={{ background: '#0b0f1e' }}>Response — custom status…</option>
              </select>
              {locationKey === CUSTOM && (
                <input
                  value={customStatus}
                  onChange={e => { setCustomStatus(e.target.value); setConfirming(false); }}
                  placeholder="e.g. 201, 404"
                  className="w-full mt-2 px-3 py-2 text-sm bg-[#0b0f1e] border border-[#232942] rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#f97316]/50"
                />
              )}
            </div>
          )}

          {/* Content type */}
          {location && (
            <div>
              <label className="block text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1">Content Type</label>
              <select
                value={contentType}
                onChange={e => handleContentTypeChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#0b0f1e] border border-[#232942] rounded-lg text-gray-200 focus:outline-none focus:border-[#f97316]/50"
              >
                <option value="" style={{ background: '#0b0f1e' }}>Select…</option>
                {existingContentTypes.map(ct => (
                  <option key={ct} value={ct} style={{ background: '#0b0f1e' }}>{ct}</option>
                ))}
                {!existingContentTypes.includes('application/json') && (
                  <option value="application/json" style={{ background: '#0b0f1e' }}>application/json</option>
                )}
                <option value={CUSTOM} style={{ background: '#0b0f1e' }}>Custom…</option>
              </select>
              {contentType === CUSTOM && (
                <input
                  value={customContentType}
                  onChange={e => { setCustomContentType(e.target.value); setConfirming(false); }}
                  placeholder="e.g. application/xml"
                  className="w-full mt-2 px-3 py-2 text-sm bg-[#0b0f1e] border border-[#232942] rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#f97316]/50"
                />
              )}
            </div>
          )}

          {/* Existing-schema warning */}
          {existingSchema && (
            <div className="px-3 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="flex items-center gap-1.5 text-amber-400 text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> A schema already exists here
              </p>
              <pre className="mt-1.5 text-[10px] font-mono text-gray-400 whitespace-pre-wrap break-all">
                {JSON.stringify(existingSchema, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-[#0b0f1e] border border-[#232942] rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleMap}
            disabled={!canMap}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-40 ${
              confirming
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-[#f97316] hover:bg-[#ea6c0a] text-white'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            {confirming ? 'Confirm Replace' : existingSchema ? 'Review & Map' : 'Map Schema'}
          </button>
        </div>
      </div>
    </div>
  );
}
