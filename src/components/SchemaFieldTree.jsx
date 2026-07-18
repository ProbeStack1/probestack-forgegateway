import React, { useState } from 'react';
import { ChevronRight, Plus, Trash2, GripVertical, KeyRound, Link2 } from 'lucide-react';
import { FIELD_TYPES, FORMAT_OPTIONS, typeColor, getLeafFieldNames } from '../utils/schemaFieldUtils';

// Recursive field-row tree. Renders one row per field, and — for object /
// array-of-object fields — an indented, expandable sub-tree for their
// children/itemChildren. `mode="readonly"` renders inert draggable badges
// (used by Compose mode's schema-library browser); `mode="edit"` renders the
// interactive form used by the manual builder and the compose drop targets.
// `otherSchemas` (edit mode only): [{name, fields}] for every other registry
// schema, used to populate the Foreign Key target-schema/target-field pickers.
export default function SchemaFieldTree({
  fields, path = [], onChange, onRemove, onAddField,
  mode = 'edit', draggable = false, onDragStart, depth = 0, otherSchemas = [],
}) {
  return (
    <div className={depth === 0 ? 'divide-y divide-[#1a2035]' : 'space-y-1 py-1'}>
      {(fields || []).map((field, index) => (
        <FieldNode
          key={field.id}
          field={field}
          path={[...path, index]}
          onChange={onChange}
          onRemove={onRemove}
          onAddField={onAddField}
          mode={mode}
          draggable={draggable}
          onDragStart={onDragStart}
          depth={depth}
          otherSchemas={otherSchemas}
        />
      ))}
    </div>
  );
}

function FieldNode({ field, path, onChange, onRemove, onAddField, mode, draggable, onDragStart, depth, otherSchemas }) {
  const [expanded, setExpanded] = useState(true);
  const readonly = mode === 'readonly';
  const hasChildren = field.type === 'object' || (field.type === 'array' && field.itemType === 'object');
  const childListKey = field.type === 'object' ? 'children' : 'itemChildren';
  const childFields = field.type === 'object' ? field.children : field.itemChildren;
  const isLeaf = !hasChildren;
  const targetSchema = otherSchemas.find(s => s.name === field.foreignKey?.schema);

  return (
    <div>
      {readonly ? (
        // Compact, wrapping layout — used inside the narrow left-sidebar
        // schema library, so it can't rely on fixed-width grid columns.
        <div
          draggable={draggable}
          onDragStart={draggable ? (e) => onDragStart?.(e, field) : undefined}
          className="flex items-start gap-1.5 px-1.5 py-1.5 rounded cursor-grab active:cursor-grabbing hover:bg-[#1a2438] transition-colors"
        >
          <button
            type="button"
            onClick={() => hasChildren && setExpanded(e => !e)}
            className="w-4 h-4 mt-0.5 flex items-center justify-center text-gray-500 shrink-0"
          >
            {hasChildren ? (
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            ) : (
              <GripVertical className="w-3 h-3 text-gray-600" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-mono text-gray-100 truncate">{field.name}</span>
              {field.required && <span className="text-[9px] text-[#f97316] font-bold shrink-0">*</span>}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold shrink-0"
                style={{ background: `${typeColor(field.type)}22`, color: typeColor(field.type) }}
              >
                {field.type}
              </span>
              {field.type === 'array' && (
                <span className="text-[9px] text-gray-500 truncate">items: {field.itemType}</span>
              )}
              {field.type !== 'array' && field.type !== 'object' && field.format && (
                <span className="text-[9px] text-gray-500 font-mono truncate">{field.format}</span>
              )}
              {field.isPrimaryKey && (
                <span className="flex items-center gap-0.5 text-[9px] text-amber-400 font-semibold shrink-0">
                  <KeyRound className="w-2.5 h-2.5" /> PK
                </span>
              )}
              {field.foreignKey?.schema && field.foreignKey?.field && (
                <span className="flex items-center gap-0.5 text-[9px] text-cyan-400 truncate">
                  <Link2 className="w-2.5 h-2.5 shrink-0" /> {field.foreignKey.schema}.{field.foreignKey.field}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[20px_1fr_100px_88px_44px_28px_28px_28px] items-center gap-1.5 px-3 py-2 bg-[#161b2e]">
          {/* Expand chevron */}
          <button
            type="button"
            onClick={() => hasChildren && setExpanded(e => !e)}
            className="w-4 h-4 flex items-center justify-center text-gray-500 shrink-0"
          >
            {hasChildren ? (
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            ) : null}
          </button>

          {/* Name */}
          <input
            value={field.name}
            onChange={e => onChange(path, 'name', e.target.value)}
            placeholder="fieldName"
            className="w-full px-2 py-1 text-xs font-mono bg-[#0b0f1e] border border-[#232942] rounded text-white placeholder-gray-600 focus:outline-none focus:border-[#f97316]/50"
          />

          {/* Type */}
          <select
            value={field.type}
            onChange={e => onChange(path, 'type', e.target.value)}
            className="w-full px-2 py-1 text-xs bg-[#0b0f1e] border border-[#232942] rounded focus:outline-none focus:border-[#f97316]/50"
            style={{ color: typeColor(field.type) }}
          >
            {FIELD_TYPES.map(t => (
              <option key={t} value={t} style={{ color: typeColor(t), background: '#0b0f1e' }}>{t}</option>
            ))}
          </select>

          {/* Format / array item-type column */}
          {field.type === 'array' ? (
            <select
              value={field.itemType}
              onChange={e => onChange(path, 'itemType', e.target.value)}
              className="w-full px-2 py-1 text-xs bg-[#0b0f1e] border border-[#232942] rounded text-gray-300 focus:outline-none focus:border-[#f97316]/50"
              title="Array item type"
            >
              {FIELD_TYPES.filter(t => t !== 'array').map(t => (
                <option key={t} value={t} style={{ background: '#0b0f1e' }}>{t}</option>
              ))}
            </select>
          ) : field.type === 'object' ? (
            <span className="text-xs text-gray-700 text-center">—</span>
          ) : (
            <select
              value={field.format}
              onChange={e => onChange(path, 'format', e.target.value)}
              className="w-full px-2 py-1 text-xs bg-[#0b0f1e] border border-[#232942] rounded text-gray-300 focus:outline-none focus:border-[#f97316]/50"
            >
              {(FORMAT_OPTIONS[field.type] || ['']).map(f => (
                <option key={f} value={f} style={{ background: '#0b0f1e' }}>{f || 'none'}</option>
              ))}
            </select>
          )}

          {/* Required */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => onChange(path, 'required', !field.required)}
              className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${field.required ? 'bg-[#f97316]' : 'bg-[#232942]'}`}
            >
              <span className={`absolute left-0 top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${field.required ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
            </button>
          </div>

          {/* Primary Key toggle */}
          <div className="flex justify-center">
            {isLeaf ? (
              <button
                type="button"
                onClick={() => onChange(path, 'isPrimaryKey', !field.isPrimaryKey)}
                title={field.isPrimaryKey ? 'Primary key — click to unset' : 'Mark as primary key'}
                className={`p-1 rounded transition-colors ${field.isPrimaryKey ? 'text-amber-400' : 'text-gray-700 hover:text-gray-400'}`}
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>
            ) : <span className="text-xs text-gray-700">—</span>}
          </div>

          {/* Foreign Key toggle */}
          <div className="flex justify-center">
            {isLeaf ? (
              <button
                type="button"
                onClick={() => onChange(path, 'foreignKey', field.foreignKey ? null : { schema: '', field: '' })}
                title={field.foreignKey ? 'Foreign key — click to unset' : 'Mark as foreign key'}
                className={`p-1 rounded transition-colors ${field.foreignKey ? 'text-cyan-400' : 'text-gray-700 hover:text-gray-400'}`}
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>
            ) : <span className="text-xs text-gray-700">—</span>}
          </div>

          {/* Delete */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => onRemove(path)}
              className="text-gray-600 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Inline FK target picker */}
      {!readonly && field.foreignKey && (
        <div className="flex items-center gap-2 px-3 pb-2 pl-[42px] bg-[#161b2e]">
          <Link2 className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="text-[10px] text-gray-500 shrink-0">References</span>
          <select
            value={field.foreignKey.schema}
            onChange={e => onChange(path, 'foreignKey', { schema: e.target.value, field: '' })}
            className="px-2 py-1 text-xs bg-[#0b0f1e] border border-[#232942] rounded text-gray-300 focus:outline-none focus:border-[#f97316]/50"
          >
            <option value="" style={{ background: '#0b0f1e' }}>schema…</option>
            {otherSchemas.map(s => (
              <option key={s.name} value={s.name} style={{ background: '#0b0f1e' }}>{s.name}</option>
            ))}
          </select>
          <span className="text-gray-600">.</span>
          <select
            value={field.foreignKey.field}
            onChange={e => onChange(path, 'foreignKey', { schema: field.foreignKey.schema, field: e.target.value })}
            disabled={!targetSchema}
            className="px-2 py-1 text-xs bg-[#0b0f1e] border border-[#232942] rounded text-gray-300 focus:outline-none focus:border-[#f97316]/50 disabled:opacity-40"
          >
            <option value="" style={{ background: '#0b0f1e' }}>field…</option>
            {getLeafFieldNames(targetSchema?.fields).map(name => (
              <option key={name} value={name} style={{ background: '#0b0f1e' }}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {hasChildren && expanded && (
        <div className="ml-6 pl-3 border-l border-[#232942]">
          <SchemaFieldTree
            fields={childFields}
            path={[...path, childListKey]}
            onChange={onChange}
            onRemove={onRemove}
            onAddField={onAddField}
            mode={mode}
            draggable={draggable}
            onDragStart={onDragStart}
            depth={depth + 1}
            otherSchemas={otherSchemas}
          />
          {!readonly && (
            <button
              type="button"
              onClick={() => onAddField([...path, childListKey])}
              className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white py-1 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add field
            </button>
          )}
        </div>
      )}
    </div>
  );
}
