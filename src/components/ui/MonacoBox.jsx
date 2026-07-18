/**
 * MonacoBox — Monaco editor with a one-click maximize / fullscreen toggle.
 *
 * Wraps `@monaco-editor/react`'s `<Editor />` so any editor in the app can
 * pop open into a centered modal at ~95vw × 90vh and pop back down without
 * losing its value. Used by APITest (request body, response body) and
 * MCPTest (tool args, tool result).
 *
 * Props mirror the Editor props you already pass — anything in `editorProps`
 * is forwarded verbatim. Provide:
 *   value, onChange?, language, height?, readOnly?, label?, options?
 *
 * The maximize button hovers in the top-right of the editor frame and shows
 * a tooltip; clicking it opens the modal. Esc or the close button restores.
 */
import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function MonacoBox({
  value,
  onChange,
  language = 'json',
  readOnly = false,
  label,
  height = '100%',
  className,
  options,
  // Show the modal toggle button. Default true.
  enableMaximize = true,
  // Optional extra controls rendered next to the maximize button (e.g. a
  // Beautify button). Receives no props — caller wires onClick.
  extraActions,
}) {
  const [isFull, setIsFull] = useState(false);

  // Esc closes the modal.
  useEffect(() => {
    if (!isFull) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setIsFull(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFull]);

  const editor = (
    <Editor
      height={height}
      language={language}
      theme="vs-dark"
      value={value}
      onChange={readOnly ? undefined : onChange}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        fontFamily: '"Fira Code", Menlo, monospace',
        automaticLayout: true,
        tabSize: 2,
        padding: { top: 12, bottom: 12 },
        readOnly,
        domReadOnly: readOnly,
        ...options,
      }}
    />
  );

  return (
    <>
      <div className={cn('relative h-full w-full group', className)}>
        {/* Floating action bar — only visible on hover so it doesn't fight the editor's own widgets. */}
        <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {extraActions}
          {enableMaximize && (
            <button
              type="button"
              onClick={() => setIsFull(true)}
              data-testid="monaco-maximize-btn"
              title="Maximize (Esc to close)"
              className="p-1.5 rounded-md bg-dark-900/80 border border-dark-700 text-gray-300 hover:text-[#ff5b1f] hover:border-[#ff5b1f]/50 transition-colors backdrop-blur-sm"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {editor}
      </div>

      {isFull && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsFull(false)}
          data-testid="monaco-fullscreen-overlay"
        >
          <div
            className="w-[95vw] h-[90vh] rounded-xl border border-dark-700 shadow-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: 'rgb(22 27 48)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-dark-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <Maximize2 className="w-4 h-4 text-[#ff5b1f] shrink-0" />
                <h3 className="text-sm font-semibold text-white truncate">{label || 'Editor'}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dark-900/60 border border-dark-700 text-gray-400">
                  {language}
                </span>
                {readOnly && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    read-only
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {extraActions}
                <button
                  type="button"
                  onClick={() => setIsFull(false)}
                  data-testid="monaco-minimize-btn"
                  title="Restore (Esc)"
                  className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-dark-800 transition-colors"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsFull(false)}
                  className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-dark-800 transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 bg-[#0e172a]">{editor}</div>
            <div className="px-5 py-1.5 border-t border-dark-700 text-[11px] text-gray-500 shrink-0">
              Press <span className="font-mono px-1 rounded bg-dark-900 border border-dark-700">Esc</span> or click outside to close.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
