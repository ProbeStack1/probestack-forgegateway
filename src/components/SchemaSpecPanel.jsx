import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { FileCode2 } from 'lucide-react';
import { getSchemaRefPath } from '../utils/schemaFieldUtils';
import { diffAddedLines } from '../utils/lineDiff';

// Live spec editor, opened alongside the schema builder/compose panels so a
// schema's $ref can be used directly in the open spec — either by dragging a
// schema (from the library list, a builder's $ref badge, or a saved compose
// panel) onto a spot in this editor, or by using each schema's Copy $ref
// button and pasting manually. The dropped `$ref` snippet is inserted exactly
// at the drop cursor position with no YAML-structure-aware reformatting —
// correct placement relative to `schema:`/`properties:` keys is on the user.
export default function SchemaSpecPanel({ specContent, savedSpecContent, onSpecContentChange }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [dropActive, setDropActive] = useState(false);
  // IDs of the decorations currently applied — replaced (not accumulated) on
  // every recompute via deltaDecorations, which also handles clearing them.
  const decorationIdsRef = useRef([]);

  // Every line that differs from the last-saved spec is marked green and
  // stays that way — no fade timer — until the file is actually saved, at
  // which point `savedSpecContent` catches up to `specContent`, the diff
  // comes up empty, and deltaDecorations clears the highlight. This covers
  // typing directly here as well as changes arriving from elsewhere (live
  // sync, Import, Sync to spec, Map to Endpoint, drag-drop) — all of it is
  // "added since last save" the same way.
  const applyDecorations = () => {
    const editor = editorRef.current;
    const monacoNs = monacoRef.current;
    if (!editor || !monacoNs) return;

    const addedLines = diffAddedLines(savedSpecContent ?? '', specContent ?? '');
    const decorations = addedLines.map(lineNumber => ({
      range: new monacoNs.Range(lineNumber, 1, lineNumber, 1),
      options: {
        isWholeLine: true,
        className: 'schema-spec-added-line',
        linesDecorationsClassName: 'schema-spec-added-line-gutter',
      },
    }));
    decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, decorations);
  };

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    applyDecorations();
  };

  useEffect(() => {
    applyDecorations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specContent, savedSpecContent]);

  useEffect(() => {
    const editor = editorRef.current;
    const domNode = editor?.getDomNode();
    if (!domNode) return;

    const handleDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setDropActive(true);
    };
    const handleDragLeave = () => setDropActive(false);
    const handleDrop = (e) => {
      e.preventDefault();
      setDropActive(false);
      if (!onSpecContentChange) return;

      let payload;
      try {
        payload = JSON.parse(e.dataTransfer.getData('application/x-schema-ref'));
      } catch {
        return;
      }
      if (!payload?.name) return;

      const target = editor.getTargetAtClientPoint(e.clientX, e.clientY);
      const position = target?.position || editor.getPosition() || { lineNumber: 1, column: 1 };
      const snippet = `$ref: '${getSchemaRefPath(specContent, payload.name)}'`;

      editor.executeEdits('schema-ref-drop', [{
        range: new monacoRef.current.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text: snippet,
      }]);
      onSpecContentChange(editor.getValue());
      editor.focus();
    };

    domNode.addEventListener('dragover', handleDragOver);
    domNode.addEventListener('dragleave', handleDragLeave);
    domNode.addEventListener('drop', handleDrop);
    return () => {
      domNode.removeEventListener('dragover', handleDragOver);
      domNode.removeEventListener('dragleave', handleDragLeave);
      domNode.removeEventListener('drop', handleDrop);
    };
  }, [onSpecContentChange]);

  const language = specContent?.trim().startsWith('{') ? 'json' : 'yaml';

  return (
    <div className={`w-[420px] shrink-0 flex flex-col border-l overflow-hidden transition-colors ${
      dropActive ? 'border-[#f97316]/60' : 'border-[#232942]'
    }`}>
      <style>{`
        .schema-spec-added-line {
          background-color: rgba(34, 197, 94, 0.28);
        }
        .schema-spec-added-line-gutter {
          background-color: rgba(34, 197, 94, 0.9);
          width: 3px !important;
          margin-left: 3px;
        }
      `}</style>
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0f172a] border-b border-[#232942] shrink-0">
        <FileCode2 className="w-3.5 h-3.5 text-[#f97316]" />
        <span className="text-xs font-semibold text-gray-300">Spec Editor</span>
        <span className="ml-auto text-[10px] text-gray-500 truncate">Drag a schema here to insert its $ref</span>
      </div>
      {!specContent ? (
        <div className="flex-1 flex items-center justify-center text-center p-6">
          <p className="text-xs text-gray-600">No spec content available to edit.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            language={language}
            value={specContent}
            onChange={(v) => onSpecContentChange?.(v || '')}
            onMount={handleMount}
            theme="vs-dark"
            options={{
              readOnly: !onSpecContentChange,
              fontSize: 12,
              minimap: { enabled: false },
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              lineNumbers: 'on',
              folding: true,
              tabSize: 2,
            }}
          />
        </div>
      )}
    </div>
  );
}
