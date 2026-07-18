import YAML from 'js-yaml';
import { normaliseDbColumnType, extractCandidatesFromParsedObject } from './schemaFieldUtils';

// Parsers for uploaded .sql / .md / .html schema files. These are
// best-effort, heuristic parsers — not spec-compliant SQL/Markdown/HTML
// parsers. Known limitations: SQL — no ALTER TABLE, views, triggers, or
// vendor-specific types (ENUM(...), arrays); assumes one clean CREATE TABLE
// statement per match. Markdown/HTML tables — no merged cells, nested
// tables, or multi-line cell content.

// ─── Depth-aware comma splitter ────────────────────────────────────────────
// Splits only on top-level commas, so `DECIMAL(10,2)` and `PRIMARY KEY (a, b)`
// aren't mis-split.
export const splitTopLevel = (str, sep = ',') => {
  const parts = [];
  let depth = 0;
  let quoteChar = null;
  let current = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (quoteChar) {
      current += ch;
      if (ch === quoteChar) quoteChar = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quoteChar = ch; current += ch; continue; }
    if (ch === '(') { depth++; current += ch; continue; }
    if (ch === ')') { depth--; current += ch; continue; }
    if (ch === sep && depth === 0) { parts.push(current); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts.map(s => s.trim()).filter(Boolean);
};

// ─── SQL ────────────────────────────────────────────────────────────────────

const unquoteIdent = (s) => (s || '').replace(/^[`"[]|[`"\]]$/g, '').trim();
const stripSqlComments = (text) => text.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

const CREATE_TABLE_RE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"[]?\w+[`"\]]?)\s*\(([\s\S]*?)\)\s*;/gi;
const PRIMARY_KEY_RE = /^PRIMARY\s+KEY\s*\(([^)]+)\)/i;
const FOREIGN_KEY_RE = /^(?:CONSTRAINT\s+[`"[]?\w+[`"\]]?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([`"[]?\w+[`"\]]?)\s*\(([^)]+)\)/i;
const SKIP_CLAUSE_RE = /^(UNIQUE|CONSTRAINT|CHECK|INDEX|KEY)\b/i;
const COLUMN_RE = /^([`"[]?\w+[`"\]]?)\s+([A-Za-z][\w]*(?:\([^)]*\))?)\s*(.*)$/i;
const INLINE_REFERENCES_RE = /REFERENCES\s+([`"[]?\w+[`"\]]?)\s*\(([^)]+)\)/i;

export const parseSqlFile = (text) => {
  const cleaned = stripSqlComments(text);
  const candidates = [];
  let match;
  const re = new RegExp(CREATE_TABLE_RE);
  while ((match = re.exec(cleaned))) {
    const tableName = unquoteIdent(match[1]);
    const clauses = splitTopLevel(match[2]);
    const properties = {};
    const required = [];

    // Pass 1: column definitions.
    clauses.forEach(clause => {
      if (PRIMARY_KEY_RE.test(clause) || FOREIGN_KEY_RE.test(clause) || SKIP_CLAUSE_RE.test(clause)) return;
      const colMatch = clause.match(COLUMN_RE);
      if (!colMatch) return;
      const colName = unquoteIdent(colMatch[1]);
      const rest = colMatch[3] || '';
      const { type, format } = normaliseDbColumnType(colMatch[2]);
      const prop = { type };
      if (format) prop.format = format;
      if (/PRIMARY\s+KEY/i.test(rest)) { prop['x-primaryKey'] = true; required.push(colName); }
      if (/NOT\s+NULL/i.test(rest) && !required.includes(colName)) required.push(colName);
      const inlineRef = rest.match(INLINE_REFERENCES_RE);
      if (inlineRef) {
        prop['x-foreignKey'] = { schema: unquoteIdent(inlineRef[1]), field: unquoteIdent(inlineRef[2].split(',')[0]) };
      }
      properties[colName] = prop;
    });

    // Pass 2: table-level PRIMARY KEY(...) / FOREIGN KEY(...) REFERENCES ...(...).
    clauses.forEach(clause => {
      const pkMatch = clause.match(PRIMARY_KEY_RE);
      if (pkMatch) {
        pkMatch[1].split(',').map(unquoteIdent).forEach(col => {
          if (properties[col]) properties[col]['x-primaryKey'] = true;
          if (!required.includes(col)) required.push(col);
        });
        return;
      }
      const fkMatch = clause.match(FOREIGN_KEY_RE);
      if (fkMatch) {
        const localCols = fkMatch[1].split(',').map(unquoteIdent);
        const refTable = unquoteIdent(fkMatch[2]);
        const refCols = fkMatch[3].split(',').map(unquoteIdent);
        localCols.forEach((col, i) => {
          if (properties[col]) properties[col]['x-foreignKey'] = { schema: refTable, field: refCols[i] || refCols[0] };
        });
      }
    });

    if (Object.keys(properties).length) candidates.push({ name: tableName, description: '', properties, required });
  }
  return candidates;
};

// ─── Shared table-row → candidate helper (Markdown + HTML tables) ─────────

const HEADER_SYNONYMS = {
  name: ['field', 'column', 'name'],
  type: ['type'],
  required: ['required', 'nullable'],
  key: ['key', 'pk', 'fk'],
};

export const matchHeaderRole = (cellText) => {
  const norm = (cellText || '').toLowerCase().replace(/[^a-z]/g, '');
  for (const [role, synonyms] of Object.entries(HEADER_SYNONYMS)) {
    if (synonyms.some(s => norm.includes(s))) return role;
  }
  return null;
};

// Parses an "FK" indicator's target table (+ optional column) out of free
// text such as "FK -> Category.id", "FK: users", or "FK → organizations"
// (and tolerates arrow characters mangled by copy/paste or encoding issues,
// since it doesn't require a specific separator — it just takes the
// word-like token(s) trailing "FK"). Defaults the target field to "id"
// (the near-universal PK name) when no explicit column is given.
const parseFkReference = (text) => {
  const match = (text || '').match(/FK.*?(\w+)(?:\.(\w+))?\s*$/i);
  return match ? { schema: match[1], field: match[2] || 'id' } : null;
};

export const tableRowsToCandidate = (name, headerCells, dataRows) => {
  const roleByIndex = headerCells.map(matchHeaderRole);
  const properties = {};
  const required = [];

  dataRows.forEach(row => {
    let colName = '', rawType = 'string', requiredCell = '', keyCell = '';
    roleByIndex.forEach((role, i) => {
      const cell = (row[i] || '').trim();
      if (role === 'name') colName = cell;
      else if (role === 'type') rawType = cell || 'string';
      else if (role === 'required') requiredCell = cell;
      else if (role === 'key') keyCell = cell;
    });
    if (!colName) return;

    const { type, format } = normaliseDbColumnType(rawType);
    const prop = { type };
    if (format) prop.format = format;
    if (/^pk/i.test(keyCell.trim())) prop['x-primaryKey'] = true;
    const fkRef = parseFkReference(keyCell);
    if (fkRef) prop['x-foreignKey'] = fkRef;
    if (prop['x-primaryKey'] || /^(yes|true|required|not null)$/i.test(requiredCell.trim())) required.push(colName);

    properties[colName] = prop;
  });

  return { name, description: '', properties, required };
};

// ─── Markdown ───────────────────────────────────────────────────────────────

const splitPipeRow = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
const isPipeRow = (line) => /^\s*\|?.*\|.*\|?\s*$/.test(line || '') && (line || '').includes('|');
const isPipeSeparator = (line) => /^\s*\|?[\s:-]+(\|[\s:-]+)+\|?\s*$/.test(line || '');

export const parseMarkdownFile = (text) => {
  const candidates = [];

  const fenceRe = /```(json|ya?ml|sql)\s*\n([\s\S]*?)```/gi;
  let fenceMatch;
  while ((fenceMatch = fenceRe.exec(text))) {
    const lang = fenceMatch[1].toLowerCase();
    const body = fenceMatch[2];
    if (lang === 'sql') {
      candidates.push(...parseSqlFile(body));
    } else {
      try {
        const parsedBlock = lang === 'json' ? JSON.parse(body) : YAML.load(body);
        candidates.push(...extractCandidatesFromParsedObject(parsedBlock, 'block'));
      } catch { /* ignore malformed fenced block */ }
    }
  }

  const lines = text.split('\n');
  let pendingName = null;
  for (let i = 0; i < lines.length; i++) {
    const headingMatch = lines[i].match(/^#{1,6}\s+(.+)/);
    if (headingMatch) { pendingName = headingMatch[1].trim(); continue; }

    if (isPipeRow(lines[i]) && isPipeSeparator(lines[i + 1])) {
      const headerCells = splitPipeRow(lines[i]);
      const dataRows = [];
      let j = i + 2;
      while (j < lines.length && isPipeRow(lines[j])) { dataRows.push(splitPipeRow(lines[j])); j++; }
      candidates.push(tableRowsToCandidate(pendingName || `Table${candidates.length + 1}`, headerCells, dataRows));
      i = j - 1;
      pendingName = null;
    }
  }

  return candidates.filter(c => Object.keys(c.properties).length > 0);
};

// ─── HTML ───────────────────────────────────────────────────────────────────
// Two shapes are supported: real <table> elements, and the very common
// "ER diagram export" pattern of div-based table cards (a header div + a
// stack of "row" divs, PK/FK indicated by a class or a badge, no <table> tag
// at all — e.g. Mermaid/dbdiagram-style HTML exports).

const parseHtmlTables = (doc) => {
  const tables = Array.from(doc.querySelectorAll('table'));
  return tables.map((table, idx) => {
    let name = table.querySelector('caption')?.textContent?.trim();
    if (!name) {
      let el = table.previousElementSibling;
      while (el && !/^H[1-6]$/.test(el.tagName)) el = el.previousElementSibling;
      name = el?.textContent?.trim();
    }
    if (!name) name = `Table${idx + 1}`;

    const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
    const headerCells = headerRow
      ? Array.from(headerRow.querySelectorAll('th,td')).map(c => c.textContent.trim())
      : [];

    const allRows = Array.from(table.querySelectorAll('tr'));
    const bodyRows = (headerRow ? allRows.filter(r => r !== headerRow) : allRows)
      .map(r => Array.from(r.querySelectorAll('td,th')).map(c => c.textContent.trim()));

    return tableRowsToCandidate(name, headerCells, bodyRows);
  }).filter(c => Object.keys(c.properties).length > 0);
};

// Matches a class token like "col-row" or "row" but not an unrelated class
// that merely contains the substring (e.g. "arrow"), by requiring a token
// boundary (hyphen or start/end of the class name) around the word.
const hasClassLike = (el, word) => {
  const re = new RegExp(`(^|-)${word}($|-)`, 'i');
  return (el.className || '').toString().split(/\s+/).some(c => re.test(c));
};

const cleanCardHeaderText = (headerEl) => {
  const clone = headerEl.cloneNode(true);
  clone.querySelectorAll('[class*="icon"]').forEach(el => el.remove());
  return clone.textContent.replace(/^[^\w]+/, '').trim();
};

const parseHtmlCards = (doc) => {
  const cards = Array.from(doc.querySelectorAll('[class*="card"]'))
    .filter(el => hasClassLike(el, 'card'))
    .filter(el => !el.querySelector('[class*="card"]')) // leaf cards only, skip wrapper containers
    .filter(el => el.querySelector('[class*="header"]') && el.querySelector('[class*="row"]'));

  return cards.map((card, idx) => {
    const headerEl = card.querySelector('[class*="header"]');
    const name = (headerEl ? cleanCardHeaderText(headerEl) : '') || `Table${idx + 1}`;

    const properties = {};
    const required = [];

    Array.from(card.querySelectorAll('[class*="row"]'))
      .filter(row => hasClassLike(row, 'row'))
      .forEach(row => {
        const nameEl = row.querySelector('[class*="name"]');
        const typeEl = row.querySelector('[class*="type"]');
        const colName = nameEl?.textContent?.trim();
        if (!colName) return;

        const { type, format } = normaliseDbColumnType(typeEl?.textContent?.trim() || 'string');
        const prop = { type };
        if (format) prop.format = format;

        const rowText = row.textContent || '';
        const isPk = hasClassLike(row, 'pk') || /\bPK\b/.test(rowText);
        if (isPk) { prop['x-primaryKey'] = true; required.push(colName); }

        const isFk = hasClassLike(row, 'fk') || /\bFK\b/.test(rowText);
        if (isFk) {
          const fkRef = parseFkReference(rowText);
          if (fkRef) prop['x-foreignKey'] = fkRef;
        }

        properties[colName] = prop;
      });

    return { name, description: '', properties, required };
  }).filter(c => Object.keys(c.properties).length > 0);
};

export const parseHtmlFile = (text) => {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const tableCandidates = parseHtmlTables(doc);
  return tableCandidates.length ? tableCandidates : parseHtmlCards(doc);
};
