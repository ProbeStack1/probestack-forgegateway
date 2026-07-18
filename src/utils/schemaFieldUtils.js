import YAML from 'js-yaml';
import { parseSqlFile, parseMarkdownFile, parseHtmlFile } from './schemaFileParsers';

// ─── Constants ────────────────────────────────────────────────────────────────

export const FIELD_TYPES = ['string', 'integer', 'number', 'boolean', 'array', 'object'];

export const FORMAT_OPTIONS = {
  string:  ['', 'date', 'date-time', 'email', 'uri', 'uuid', 'password'],
  integer: ['', 'int32', 'int64'],
  number:  ['', 'float', 'double'],
  boolean: [''],
  array:   [''],
  object:  [''],
};

export const typeColor = (t) => ({
  string: '#10b981', integer: '#3b82f6', number: '#3b82f6',
  boolean: '#f59e0b', array: '#8b5cf6', object: '#ec4899',
}[t] || '#64748b');

// ─── Field construction ────────────────────────────────────────────────────────

const newFieldId = () => `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export const emptyField = () => ({
  id: newFieldId(),
  name: '', type: 'string', format: '', required: false,
  children: [], itemType: 'string', itemChildren: [],
  isPrimaryKey: false, foreignKey: null, // foreignKey: { schema, field } | null
});

export const emptyForm = () => ({ name: '', description: '', domain: '', fields: [emptyField()] });

// ─── Domain tagging ─────────────────────────────────────────────────────────
// Domain is now a first-class, indexed field on the registry record itself
// (ApiSchema.domain on the backend) rather than living inside `definition`.
// `getDomainFromDefinition`/`withDomain` read/write the older `x-domain`
// vendor-extension convention and are kept only as a fallback for schemas
// saved before this migration (or synced into a spec's inline
// components.schemas, which has no top-level `domain` column to fall back
// on) — new saves should pass `domain` as its own field via
// `SchemaRegistryAPI.create`/`update`, not through `definition`.

export const getDomainFromDefinition = (definition) => definition?.['x-domain'] || '';

export const withDomain = (definition, domain) => {
  const trimmed = domain?.trim();
  if (!trimmed) return definition;
  return { ...definition, 'x-domain': trimmed };
};

// Preferred accessor for a registry schema's domain: the top-level `domain`
// field if present, falling back to the legacy `x-domain` extension for
// records saved before `domain` existed on the backend.
export const getSchemaDomain = (schema) => schema?.domain || getDomainFromDefinition(schema?.definition);

export const getDistinctDomains = (schemas) => {
  const domains = new Set();
  (schemas || []).forEach(s => {
    const d = getSchemaDomain(s);
    if (d) domains.add(d);
  });
  return [...domains].sort((a, b) => a.localeCompare(b));
};

// ─── Definition <-> Fields (recursive) ─────────────────────────────────────────

export const buildDefinition = (fields) => {
  const properties = {};
  const required = [];
  (fields || []).forEach(f => {
    if (!f.name?.trim()) return;
    const prop = { type: f.type };
    if (f.format) prop.format = f.format;
    if (f.isPrimaryKey) prop['x-primaryKey'] = true;
    if (f.foreignKey?.schema && f.foreignKey?.field) prop['x-foreignKey'] = { ...f.foreignKey };

    if (f.type === 'object') {
      const nested = buildDefinition(f.children);
      prop.properties = nested.properties;
      if (nested.required?.length) prop.required = nested.required;
    } else if (f.type === 'array') {
      if (f.itemType === 'object') {
        const nested = buildDefinition(f.itemChildren);
        prop.items = { type: 'object', properties: nested.properties, ...(nested.required?.length ? { required: nested.required } : {}) };
      } else {
        prop.items = { type: f.itemType || 'string' };
      }
    }

    properties[f.name.trim()] = prop;
    if (f.required) required.push(f.name.trim());
  });
  return { type: 'object', properties, ...(required.length ? { required } : {}) };
};

export const definitionToFields = (definition) => {
  if (!definition?.properties) return [emptyField()];
  const required = definition.required || [];
  return Object.entries(definition.properties).map(([name, prop]) => {
    const field = {
      id: newFieldId(),
      name,
      type: prop.type || 'string',
      format: prop.format || '',
      required: required.includes(name),
      children: [],
      itemType: 'string',
      itemChildren: [],
      isPrimaryKey: prop['x-primaryKey'] === true,
      foreignKey: prop['x-foreignKey']?.schema && prop['x-foreignKey']?.field ? { ...prop['x-foreignKey'] } : null,
    };
    if (field.type === 'object' && prop.properties) {
      field.children = definitionToFields({ properties: prop.properties, required: prop.required });
    } else if (field.type === 'array' && prop.items) {
      field.itemType = prop.items.type || 'string';
      if (field.itemType === 'object' && prop.items.properties) {
        field.itemChildren = definitionToFields({ properties: prop.items.properties, required: prop.items.required });
      }
    }
    return field;
  });
};

// ─── YAML preview (recursive) ──────────────────────────────────────────────────

const emitFields = (fields, indent) => {
  const pad = ' '.repeat(indent);
  const lines = [];
  const validFields = (fields || []).filter(f => f.name?.trim());
  if (!validFields.length) return lines;

  const required = validFields.filter(f => f.required).map(f => f.name.trim());
  if (required.length) {
    lines.push(`${pad}required:`);
    required.forEach(r => lines.push(`${pad}  - ${r}`));
  }
  lines.push(`${pad}properties:`);
  validFields.forEach(f => {
    const name = f.name.trim();
    lines.push(`${pad}  ${name}:`);
    lines.push(`${pad}    type: ${f.type}`);
    if (f.format) lines.push(`${pad}    format: ${f.format}`);
    if (f.isPrimaryKey) lines.push(`${pad}    x-primaryKey: true`);
    if (f.foreignKey?.schema && f.foreignKey?.field) {
      lines.push(`${pad}    x-foreignKey:`);
      lines.push(`${pad}      schema: ${f.foreignKey.schema}`);
      lines.push(`${pad}      field: ${f.foreignKey.field}`);
    }
    if (f.type === 'object') {
      lines.push(...emitFields(f.children, indent + 4));
    } else if (f.type === 'array') {
      lines.push(`${pad}    items:`);
      lines.push(`${pad}      type: ${f.itemType || 'string'}`);
      if (f.itemType === 'object') {
        lines.push(...emitFields(f.itemChildren, indent + 6));
      }
    }
  });
  return lines;
};

export const generateYamlPreview = (name, fields) => {
  const validFields = (fields || []).filter(f => f.name?.trim());
  if (!name || !validFields.length) return '';
  const lines = [
    'components:',
    '  schemas:',
    `    ${name}:`,
    '      type: object',
    ...emitFields(fields, 6),
  ];
  return lines.join('\n');
};

// ─── Path-based immutable editing ──────────────────────────────────────────────
// A path is an array like [2, 'children', 0] identifying a field nested inside
// other fields' `children`/`itemChildren` arrays.

export const updateFieldAtPath = (fields, path, updater) => {
  const [index, ...rest] = path;
  return fields.map((f, i) => {
    if (i !== index) return f;
    if (rest.length === 0) return updater(f);
    const [listKey, ...deeper] = rest;
    return { ...f, [listKey]: updateFieldAtPath(f[listKey] || [], deeper, updater) };
  });
};

export const removeFieldAtPath = (fields, path) => {
  const [index, ...rest] = path;
  if (rest.length === 0) return fields.filter((_, i) => i !== index);
  const [listKey, ...deeper] = rest;
  return fields.map((f, i) => {
    if (i !== index) return f;
    return { ...f, [listKey]: removeFieldAtPath(f[listKey] || [], deeper) };
  });
};

export const addFieldAtPath = (fields, path, newField = emptyField()) => {
  if (path.length === 0) return [...fields, newField];
  const [index, listKey, ...deeper] = path;
  return fields.map((f, i) => {
    if (i !== index) return f;
    return { ...f, [listKey]: addFieldAtPath(f[listKey] || [], deeper, newField) };
  });
};

// ─── Drag-and-drop helpers ──────────────────────────────────────────────────────

export const deepCloneWithNewIds = (field) => ({
  ...field,
  id: newFieldId(),
  children: (field.children || []).map(deepCloneWithNewIds),
  itemChildren: (field.itemChildren || []).map(deepCloneWithNewIds),
});

export const dedupeFieldName = (existingFields, name) => {
  const existingNames = new Set((existingFields || []).map(f => f.name?.trim()));
  if (!existingNames.has(name)) return name;
  let i = 2;
  while (existingNames.has(`${name}_${i}`)) i++;
  return `${name}_${i}`;
};

// ─── Foreign-key target lookup ─────────────────────────────────────────────────
// Top-level, non-container field names of a schema — used to populate the FK
// target-field dropdown (mirrors e.g. Order.customerId -> Customer.id; does not
// recurse into nested objects).

export const getLeafFieldNames = (fields) =>
  (fields || [])
    .filter(f => f.name?.trim() && f.type !== 'object' && !(f.type === 'array' && f.itemType === 'object'))
    .map(f => f.name.trim());

// ─── Locating a schema's actual position in the spec ───────────────────────
// A spec may define schemas under Swagger 2.0's top-level `definitions`
// instead of OpenAPI 3.x's `components.schemas`. Every write below checks
// `definitions` first and only defaults to `components.schemas` when the
// schema isn't already defined anywhere — so editing a schema that already
// exists updates it in place, instead of silently creating a second,
// unreferenced copy under components.schemas.

export const schemaLivesInDefinitions = (parsed, schemaName) =>
  !!parsed?.definitions && parsed.definitions[schemaName] !== undefined;

// Merges every container a spec might define schemas in — OpenAPI 3.x's
// `components.schemas`, Swagger 2.0's `definitions`, and bare JSON Schema's
// `$defs` — into one lookup. A cascading `a || b || c` here would pick
// whichever container is non-empty *first* and silently ignore the others,
// so a schema genuinely defined under `definitions` goes undetected (shows
// as "not in spec", blocks live-sync) whenever `components.schemas` also
// happens to have unrelated entries in it. Values are the same object
// references as in `parsed`, so mutating a returned schema still mutates
// the real spec object graph.
export const getAllSchemaDefs = (parsed) => ({
  ...(parsed?.$defs || {}),
  ...(parsed?.definitions || {}),
  ...(parsed?.components?.schemas || {}),
});

// The $ref path a schema is actually reachable at in this spec right now —
// `#/definitions/Name` if that's where it's defined, otherwise the OpenAPI
// 3.x default `#/components/schemas/Name` (also correct for a schema that
// isn't in the spec yet, since that's where a new one gets added).
export const getSchemaRefPath = (specContent, schemaName) => {
  let parsed = null;
  try { parsed = JSON.parse(specContent); } catch { try { parsed = YAML.load(specContent); } catch { /* not parseable */ } }
  return schemaLivesInDefinitions(parsed, schemaName)
    ? `#/definitions/${schemaName}`
    : `#/components/schemas/${schemaName}`;
};

// ─── Push a schema into the current spec, in place if it's already there ──────

export const upsertSchemaIntoSpec = (specContent, schemaName, definition) => {
  let parsed;
  let isYaml = false;
  try {
    parsed = JSON.parse(specContent);
  } catch {
    parsed = YAML.load(specContent);
    isYaml = true;
  }
  if (!parsed || typeof parsed !== 'object') return { content: specContent, changed: false };

  let target;
  if (schemaLivesInDefinitions(parsed, schemaName)) {
    target = parsed.definitions;
  } else {
    parsed.components = parsed.components || {};
    parsed.components.schemas = parsed.components.schemas || {};
    target = parsed.components.schemas;
  }

  const existing = target[schemaName];
  if (existing && JSON.stringify(existing) === JSON.stringify(definition)) {
    return { content: specContent, changed: false };
  }

  target[schemaName] = definition;
  const content = isYaml ? YAML.dump(parsed) : JSON.stringify(parsed, null, 2);
  return { content, changed: true };
};

// Removes a schema from wherever it's actually defined (definitions or
// components.schemas) — used when a schema being live-edited is renamed, so
// the previous name doesn't linger as an orphaned entry alongside the new one.
export const removeSchemaFromSpec = (specContent, schemaName) => {
  let parsed;
  let isYaml = false;
  try {
    parsed = JSON.parse(specContent);
  } catch {
    parsed = YAML.load(specContent);
    isYaml = true;
  }
  const target = schemaLivesInDefinitions(parsed, schemaName) ? parsed.definitions : parsed?.components?.schemas;
  if (!target?.[schemaName]) return { content: specContent, changed: false };

  delete target[schemaName];
  const content = isYaml ? YAML.dump(parsed) : JSON.stringify(parsed, null, 2);
  return { content, changed: true };
};

// ─── Uploaded file parsing ──────────────────────────────────────────────────────
// Accepts four shapes, tried in order:
//  1. A database-schema doc (`database.schemas[].tables[].columns[]`, each
//     column optionally `primaryKey`/`foreignKey`) — each table becomes a
//     candidate, with DB column types normalised and PK/FK metadata carried
//     through as `x-primaryKey`/`x-foreignKey` (same as the field editor).
//  2. An OpenAPI doc (`components.schemas`) or Swagger/JSON-Schema doc
//     (`definitions` / `$defs`) — every named entry becomes a candidate.
//  3. A single bare JSON Schema document (top-level `type`/`properties`, no
//     components/definitions wrapper) — the filename becomes its name.
//  4. A flat, unwrapped map of `{ SchemaName: schemaObject, ... }` — treats
//     every schema-shaped top-level value as a candidate.

const NON_SCHEMA_KEYS = new Set(['$schema', '$id', 'title', 'description', 'definitions', '$defs', 'components']);

// ── Database-schema column type normalisation ──────────────────────────────
const DB_TYPE_MAP = {
  varchar: 'string', text: 'string', char: 'string', nvarchar: 'string', string: 'string',
  int: 'integer', integer: 'integer', bigint: 'integer', smallint: 'integer', tinyint: 'integer', mediumint: 'integer',
  float: 'number', double: 'number', decimal: 'number', numeric: 'number', real: 'number', number: 'number',
  bool: 'boolean', boolean: 'boolean', bit: 'boolean',
  date: 'string', datetime: 'string', timestamp: 'string', timestamptz: 'string',
  uuid: 'string', json: 'object', jsonb: 'object',
};

const DB_FORMAT_MAP = {
  uuid: 'uuid', date: 'date', datetime: 'date-time', timestamp: 'date-time', timestamptz: 'date-time', email: 'email',
};

export const normaliseDbColumnType = (raw) => {
  const base = String(raw || '').toLowerCase().trim().replace(/\(.*\)/, '').trim();
  return { type: DB_TYPE_MAP[base] || 'string', format: DB_FORMAT_MAP[base] || '' };
};

const extractDbSchemaTables = (parsed) => {
  const dbSchemas = parsed?.database?.schemas;
  if (!Array.isArray(dbSchemas)) return [];

  const candidates = [];
  const seenNames = new Set();

  dbSchemas.forEach(dbSchema => {
    (dbSchema.tables || []).forEach(table => {
      if (!table?.name || !Array.isArray(table.columns)) return;
      let name = table.name;
      if (seenNames.has(name)) name = `${dbSchema.name || 'schema'}_${table.name}`;
      seenNames.add(name);

      const properties = {};
      const required = [];
      table.columns.forEach(col => {
        if (!col?.name) return;
        const { type, format } = normaliseDbColumnType(col.type);
        const prop = { type };
        if (format) prop.format = format;
        if (col.primaryKey) {
          prop['x-primaryKey'] = true;
          required.push(col.name);
        }
        if (col.foreignKey?.table && col.foreignKey?.column) {
          prop['x-foreignKey'] = { schema: col.foreignKey.table, field: col.foreignKey.column };
        }
        properties[col.name] = prop;
      });

      candidates.push({
        name,
        description: dbSchema.name ? `${dbSchema.name} / ${table.name}` : '',
        properties,
        required,
      });
    });
  });

  return candidates;
};

const isSchemaLike = (val) =>
  !!val && typeof val === 'object' && !Array.isArray(val) &&
  (typeof val.properties === 'object' || typeof val.type === 'string' || Array.isArray(val.allOf) || Array.isArray(val.enum));

const looksLikeJsonSchema = (parsed) =>
  isSchemaLike(parsed) && !parsed.components?.schemas && !parsed.definitions && !parsed.$defs;

const toCandidate = (name, schema) => ({
  name,
  description: schema.description || '',
  properties: schema.properties || {},
  required: schema.required || [],
});

// Given an already-parsed JS object (from JSON.parse/YAML.load, or a fenced
// code block pulled out of a Markdown file), find its importable schemas.
// Split out from `parseUploadedSchemaFile` so `schemaFileParsers.js` can
// reuse it for fenced ```json/```yaml blocks without re-parsing raw text.
export const extractCandidatesFromParsedObject = (parsed, filename) => {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];

  const dbTables = extractDbSchemaTables(parsed);
  if (dbTables.length) return dbTables;

  const components = getAllSchemaDefs(parsed);
  if (Object.keys(components).length) {
    const found = Object.entries(components)
      .filter(([, schema]) => isSchemaLike(schema))
      .map(([name, schema]) => toCandidate(name, schema));
    if (found.length) return found;
  }

  if (looksLikeJsonSchema(parsed)) {
    const baseName = (filename || 'UploadedSchema').replace(/\.(json|ya?ml)$/i, '');
    return [toCandidate(baseName, parsed)];
  }

  const flat = Object.entries(parsed)
    .filter(([key, val]) => !NON_SCHEMA_KEYS.has(key) && isSchemaLike(val))
    .map(([name, schema]) => toCandidate(name, schema));
  if (flat.length) return flat;

  return [];
};

export const parseUploadedSchemaFile = (text, filename) => {
  const ext = (filename || '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
  if (ext === 'sql') return parseSqlFile(text);
  if (ext === 'md' || ext === 'markdown') return parseMarkdownFile(text);
  if (ext === 'html' || ext === 'htm') return parseHtmlFile(text);

  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = YAML.load(text); }
  return extractCandidatesFromParsedObject(parsed, filename);
};
