/**
 * Minimal OpenAPI 3 → MCP Tools importer (client-side only).
 *
 * Given a JSON string of an OpenAPI 3 document, produces an array of
 * MCP-tool-shaped objects that `Step3Capabilities` can append via
 * `ADD_TOOL`. Each path × method becomes one tool. Path params + query
 * params + body become properties on the tool's inputSchema.
 *
 * Not a full parser — intentionally minimal but correct for the 80% of
 * real-world OpenAPI docs. YAML support deferred (users can pipe their
 * YAML through https://www.json2yaml.com/ for now).
 */

export function parseOpenApiToTools(raw) {
  let doc;
  try { doc = typeof raw === 'string' ? JSON.parse(raw) : raw; }
  catch { throw new Error('Not valid JSON. Convert YAML to JSON first (e.g. json2yaml.com).'); }
  if (!doc || !doc.paths) throw new Error('Missing `paths` object — is this an OpenAPI 3 document?');

  const tools = [];
  const methods = ['get', 'post', 'put', 'patch', 'delete'];

  for (const [path, pathItem] of Object.entries(doc.paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const method of methods) {
      const op = pathItem[method];
      if (!op) continue;

      const name = opToToolName(op, method, path);
      const properties = {};
      const required = [];
      const params = (op.parameters || []).concat(pathItem.parameters || []);

      for (const p of params) {
        if (!p || !p.name) continue;
        properties[p.name] = { type: p.schema?.type || 'string', description: p.description || '' };
        if (p.required) required.push(p.name);
      }
      // request body (application/json only)
      const bodySchema = op.requestBody?.content?.['application/json']?.schema;
      if (bodySchema?.properties) {
        for (const [k, v] of Object.entries(bodySchema.properties)) {
          properties[k] = { type: v.type || 'string', description: v.description || '' };
        }
        for (const r of (bodySchema.required || [])) if (!required.includes(r)) required.push(r);
      }

      const writes = method !== 'get';
      const destructive = method === 'delete';

      tools.push({
        name,
        description: op.summary || op.description || `${method.toUpperCase()} ${path}`,
        inputSchema: { type: 'object', properties, required },
        outputType: 'structured-json',
        sideEffects: destructive ? 'destructive' : writes ? 'writes' : 'read-only',
        implementationHint: `// ${method.toUpperCase()} ${path}\n// see original spec for response shape.`,
      });
    }
  }

  if (tools.length === 0) throw new Error('No operations found in the spec.');
  return tools;
}

function opToToolName(op, method, path) {
  if (op.operationId) return snake(op.operationId);
  const seg = path.split('/').filter(s => s && !s.startsWith('{')).pop() || 'op';
  return snake(`${method}_${seg}`);
}

function snake(s) {
  return (s || '').toString().trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'op';
}
