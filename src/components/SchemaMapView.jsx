import React, { useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react';
import { Braces, KeyRound, Link2, Network } from 'lucide-react';
import { definitionToFields, typeColor } from '../utils/schemaFieldUtils';

// Static ER-diagram view of the current spec's schemas: cards laid out by
// the browser's normal grid flow (no custom force-directed layout), with an
// SVG overlay drawing a connector line from each FK field to the PK field it
// references. The overlay lives inside the same scrollable container as the
// cards (sized to scrollWidth/scrollHeight) so it scrolls in lockstep with
// them instead of needing scroll-position recomputation.
export default function SchemaMapView({ schemas, onSelectSchema }) {
  const containerRef = useRef(null);
  const fieldRefs = useRef(new Map());
  const [lines, setLines] = useState([]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [hoveredKey, setHoveredKey] = useState(null);

  const schemaFieldsList = schemas.map(s => ({
    id: s.id,
    name: s.name,
    fields: definitionToFields(s.definition),
  }));

  const setFieldRef = useCallback((key, el) => {
    if (el) fieldRefs.current.set(key, el);
    else fieldRefs.current.delete(key);
  }, []);

  const recompute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const pointAt = (rect, side) => ({
      x: (side === 'right' ? rect.right : rect.left) - containerRect.left + container.scrollLeft,
      y: rect.top - containerRect.top + container.scrollTop + rect.height / 2,
    });

    const newLines = [];
    schemaFieldsList.forEach(schema => {
      schema.fields.forEach(field => {
        if (!field.foreignKey?.schema || !field.foreignKey?.field) return;
        const sourceKey = `${schema.name}::${field.name}`;
        const targetKey = `${field.foreignKey.schema}::${field.foreignKey.field}`;
        const sourceEl = fieldRefs.current.get(sourceKey);
        if (!sourceEl) return;
        const targetEl = fieldRefs.current.get(targetKey);
        if (!targetEl) {
          newLines.push({ key: `${sourceKey}->${targetKey}`, sourceKey, unresolved: true });
          return;
        }
        const sourceRect = sourceEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const sourceOnLeft = sourceRect.left < targetRect.left;
        const p1 = pointAt(sourceRect, sourceOnLeft ? 'right' : 'left');
        const p2 = pointAt(targetRect, sourceOnLeft ? 'left' : 'right');
        newLines.push({ key: `${sourceKey}->${targetKey}`, sourceKey, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
      });
    });
    setLines(newLines);
    setContainerSize({ width: container.scrollWidth, height: container.scrollHeight });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemas]);

  useLayoutEffect(() => {
    recompute();
    const raf = requestAnimationFrame(recompute); // second pass once refs/fonts settle
    return () => cancelAnimationFrame(raf);
  }, [recompute]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let rafId;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(recompute);
    });
    observer.observe(container);
    return () => { observer.disconnect(); cancelAnimationFrame(rafId); };
  }, [recompute]);

  if (schemas.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <Network className="w-10 h-10 text-gray-700 mb-3" />
        <p className="text-gray-400 text-sm">No schemas in this spec yet to map</p>
        <p className="text-gray-600 text-xs mt-1">Create or import schemas in Data Modelling first</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex-1 overflow-auto p-8">
      <svg
        className="absolute top-0 left-0 pointer-events-none"
        width={containerSize.width}
        height={containerSize.height}
      >
        <defs>
          <marker id="schema-map-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#f97316" />
          </marker>
        </defs>
        {lines.filter(l => !l.unresolved).map(l => {
          const isHovered = hoveredKey === l.sourceKey;
          const midX = (l.x1 + l.x2) / 2;
          return (
            <path
              key={l.key}
              d={`M${l.x1},${l.y1} C${midX},${l.y1} ${midX},${l.y2} ${l.x2},${l.y2}`}
              fill="none"
              stroke={isHovered ? '#f97316' : '#475569'}
              strokeWidth={isHovered ? 2.5 : 1.5}
              opacity={hoveredKey && !isHovered ? 0.25 : 1}
              markerEnd="url(#schema-map-arrow)"
              style={{ transition: 'opacity 0.15s, stroke 0.15s, stroke-width 0.15s' }}
            />
          );
        })}
      </svg>

      <div className="relative z-10 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-8">
        {schemaFieldsList.map(schema => (
          <div key={schema.id} className="rounded-xl border border-[#232942] bg-[#161b2e] overflow-hidden self-start">
            <button
              onClick={() => onSelectSchema(schemas.find(s => s.id === schema.id))}
              title="Edit in Data Modelling"
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-[#0f172a] border-b border-[#232942] hover:bg-[#1a2438] transition-colors text-left"
            >
              <Braces className="w-3.5 h-3.5 text-[#f97316] shrink-0" />
              <span className="text-sm font-semibold text-white truncate">{schema.name}</span>
            </button>
            <div className="divide-y divide-[#1a2035]">
              {schema.fields.length === 0 ? (
                <p className="text-[11px] text-gray-600 px-3 py-2">No fields</p>
              ) : (
                schema.fields.map(field => {
                  const key = `${schema.name}::${field.name}`;
                  const isUnresolvedFk = lines.some(l => l.unresolved && l.sourceKey === key);
                  return (
                    <div
                      key={field.id}
                      ref={el => setFieldRef(key, el)}
                      onMouseEnter={() => field.foreignKey && setHoveredKey(key)}
                      onMouseLeave={() => setHoveredKey(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
                    >
                      <span className="font-mono text-gray-200 truncate flex-1">{field.name}</span>
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold shrink-0"
                        style={{ background: `${typeColor(field.type)}22`, color: typeColor(field.type) }}
                      >
                        {field.type}
                      </span>
                      {field.isPrimaryKey && (
                        <KeyRound className="w-3 h-3 text-amber-400 shrink-0" title="Primary key" />
                      )}
                      {field.foreignKey?.schema && field.foreignKey?.field && (
                        <Link2
                          className={`w-3 h-3 shrink-0 ${isUnresolvedFk ? 'text-gray-600' : 'text-cyan-400'}`}
                          title={isUnresolvedFk
                            ? `Unresolved reference to ${field.foreignKey.schema}.${field.foreignKey.field}`
                            : `References ${field.foreignKey.schema}.${field.foreignKey.field}`}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
