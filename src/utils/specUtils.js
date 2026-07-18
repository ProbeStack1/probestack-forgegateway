import YAML from 'js-yaml';
import { schemaLivesInDefinitions } from './schemaFieldUtils';

// ─── Spec parsing ───────────────────────────────────────────────────────────

export const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

export const parseSpecContent = (content) => {
  try {
    return { parsed: JSON.parse(content), isYaml: false };
  } catch {
    return { parsed: YAML.load(content), isYaml: true };
  }
};

export const serializeSpecContent = (parsed, isYaml) =>
  isYaml ? YAML.dump(parsed) : JSON.stringify(parsed, null, 2);

const getOperation = (parsed, path, method) => parsed?.paths?.[path]?.[method];

// ─── Endpoint discovery ─────────────────────────────────────────────────────

export const getSpecEndpoints = (specContent) => {
  const { parsed } = parseSpecContent(specContent || '');
  if (!parsed?.paths || typeof parsed.paths !== 'object') return [];
  const endpoints = [];
  Object.entries(parsed.paths).forEach(([path, pathItem]) => {
    if (!pathItem || typeof pathItem !== 'object') return;
    HTTP_METHODS.forEach(method => {
      const op = pathItem[method];
      if (!op || typeof op !== 'object') return;
      endpoints.push({ path, method, operationId: op.operationId || '', summary: op.summary || op.description || '' });
    });
  });
  return endpoints;
};

export const getResponseStatuses = (specContent, path, method) => {
  const { parsed } = parseSpecContent(specContent || '');
  const op = getOperation(parsed, path, method);
  return Object.keys(op?.responses || {});
};

// `location` is { kind: 'requestBody' } or { kind: 'response', status: '200' }
const getContentContainer = (op, location) =>
  location.kind === 'requestBody' ? op?.requestBody : op?.responses?.[location.status];

export const getContentTypes = (specContent, path, method, location) => {
  const { parsed } = parseSpecContent(specContent || '');
  const op = getOperation(parsed, path, method);
  if (!op) return [];
  return Object.keys(getContentContainer(op, location)?.content || {});
};

export const getSchemaAtLocation = (specContent, path, method, location, contentType) => {
  const { parsed } = parseSpecContent(specContent || '');
  const op = getOperation(parsed, path, method);
  if (!op) return null;
  return getContentContainer(op, location)?.content?.[contentType]?.schema || null;
};

// ─── Mapping a schema's $ref into an operation's requestBody/response ──────
// `definition` (optional): the schema's full OpenAPI definition. When given,
// it's written in place — wherever the schema already lives (Swagger 2.0's
// `definitions`, or OpenAPI 3.x's `components.schemas`, whichever this spec
// actually uses), defaulting to components.schemas only if it's genuinely
// new — so the inserted $ref always resolves to something real instead of a
// dangling reference, and never creates a duplicate under components.schemas
// for a spec that actually defines it under `definitions`.

export const mapSchemaToEndpoint = (specContent, { path, method, location, contentType, schemaName, definition }) => {
  const { parsed, isYaml } = parseSpecContent(specContent);
  const op = parsed?.paths?.[path]?.[method];
  if (!op) return { content: specContent, changed: false, hadExisting: false, addedComponent: false };

  const usesDefinitions = schemaLivesInDefinitions(parsed, schemaName);
  let addedComponent = false;
  if (definition) {
    let target;
    if (usesDefinitions) {
      target = parsed.definitions;
    } else {
      parsed.components = parsed.components || {};
      parsed.components.schemas = parsed.components.schemas || {};
      target = parsed.components.schemas;
    }
    const existingComponent = target[schemaName];
    if (!existingComponent || JSON.stringify(existingComponent) !== JSON.stringify(definition)) {
      target[schemaName] = definition;
      addedComponent = true;
    }
  }

  let container;
  if (location.kind === 'requestBody') {
    op.requestBody = op.requestBody || {};
    op.requestBody.content = op.requestBody.content || {};
    op.requestBody.content[contentType] = op.requestBody.content[contentType] || {};
    container = op.requestBody.content[contentType];
  } else {
    op.responses = op.responses || {};
    op.responses[location.status] = op.responses[location.status] || {};
    op.responses[location.status].content = op.responses[location.status].content || {};
    op.responses[location.status].content[contentType] = op.responses[location.status].content[contentType] || {};
    container = op.responses[location.status].content[contentType];
  }

  const hadExisting = !!container.schema;
  container.schema = { $ref: usesDefinitions ? `#/definitions/${schemaName}` : `#/components/schemas/${schemaName}` };
  const content = serializeSpecContent(parsed, isYaml);
  return { content, changed: true, hadExisting, addedComponent };
};
