import yaml from 'js-yaml';

/**
 * Build JSON Schema from OpenAPI schema object.
 */
function buildJsonSchema(schemaObj) {
  if (!schemaObj) return { type: 'object' };
  // If it's a reference, we could resolve it, but we'll keep it simple
  const schema = { ...schemaObj };
  // Handle $ref? skip for now.
  return schema;
}

/**
 * Parse parameters into JSON Schema properties.
 */
function parseParameters(params) {
  const properties = {};
  const required = [];
  if (!Array.isArray(params)) return { properties, required };
  for (const param of params) {
    const name = param.name;
    const schema = param.schema || { type: 'string' };
    properties[name] = {
      ...schema,
      description: param.description || '',
      in: param.in,
    };
    if (param.required) {
      required.push(name);
    }
  }
  return { properties, required };
}

/**
 * Parse request body schema.
 */
function parseRequestBody(requestBody) {
  if (!requestBody) return null;
  const content = requestBody.content;
  if (!content) return null;
  const mediaType = Object.keys(content)[0]; // e.g., 'application/json'
  const schema = content[mediaType]?.schema;
  if (!schema) return null;
  return {
    mediaType,
    schema: buildJsonSchema(schema),
    required: requestBody.required || false,
  };
}

/**
 * Parse responses into a map of status code -> schema.
 */
function parseResponses(responses) {
  if (!responses) return {};
  const result = {};
  for (const [status, response] of Object.entries(responses)) {
    const content = response.content;
    if (content) {
      const mediaType = Object.keys(content)[0];
      const schema = content[mediaType]?.schema;
      if (schema) {
        result[status] = {
          mediaType,
          schema: buildJsonSchema(schema),
          description: response.description || '',
        };
      }
    } else {
      result[status] = {
        description: response.description || '',
      };
    }
  }
  return result;
}

/**
 * Parse security schemes.
 */
function parseSecuritySchemes(components) {
  if (!components?.securitySchemes) return {};
  const schemes = {};
  for (const [name, scheme] of Object.entries(components.securitySchemes)) {
    schemes[name] = {
      type: scheme.type,
      scheme: scheme.scheme,
      bearerFormat: scheme.bearerFormat,
      flows: scheme.flows,
      name: scheme.name,
      in: scheme.in,
    };
  }
  return schemes;
}

/**
 * Extract servers.
 */
function parseServers(servers) {
  if (!Array.isArray(servers)) return [];
  return servers.map(s => ({
    url: s.url,
    description: s.description || '',
    variables: s.variables || {},
  }));
}

/**
 * Extract tags with description.
 */
function parseTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map(t => ({
    name: t.name,
    description: t.description || '',
  }));
}

/**
 * Main parser: converts OpenAPI spec to MCP capabilities.
 */
export function parseOpenApiToMcp(specContent, specName = 'API') {
  let spec;
  try {
    spec = yaml.load(specContent);
  } catch (e) {
    try {
      spec = JSON.parse(specContent);
    } catch (e2) {
      throw new Error('Invalid spec format: must be JSON or YAML');
    }
  }

  // Extract global info
  const info = spec.info || {};
  const servers = parseServers(spec.servers);
  const tags = parseTags(spec.tags);
  const securitySchemes = parseSecuritySchemes(spec.components);

  const tools = [];
  const resources = [];
  const prompts = [];

  // 1. Tools from paths
  if (spec.paths) {
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method.toLowerCase())) continue;
        const operationId = operation.operationId || `${method}${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const summary = operation.summary || '';
        const description = operation.description || '';
        const tagsList = operation.tags || [];

        // Build input schema
        const inputProperties = {};
        const inputRequired = [];

        // Parameters
        if (operation.parameters) {
          const { properties, required } = parseParameters(operation.parameters);
          Object.assign(inputProperties, properties);
          inputRequired.push(...required);
        }

        // Request body
        const reqBody = parseRequestBody(operation.requestBody);
        if (reqBody) {
          inputProperties.body = {
            ...reqBody.schema,
            description: 'Request body',
            mediaType: reqBody.mediaType,
          };
          if (reqBody.required) {
            inputRequired.push('body');
          }
        }

        // Responses
        const responses = parseResponses(operation.responses);

        const tool = {
          id: operationId,
          name: operationId,
          summary,
          description,
          method: method.toUpperCase(),
          path,
          tags: tagsList,
          inputSchema: {
            type: 'object',
            properties: inputProperties,
            required: inputRequired,
          },
          responses,
          deprecated: operation.deprecated || false,
          // Additional metadata
          operationId: operation.operationId,
          servers, // could be overridden per operation if needed
          security: operation.security || null,
        };
        tools.push(tool);
      }
    }
  }

  // 2. Resources from schemas
  if (spec.components?.schemas) {
    for (const [schemaName, schemaDef] of Object.entries(spec.components.schemas)) {
      const resource = {
        id: schemaName,
        name: schemaName,
        description: schemaDef.description || '',
        mimeType: 'application/json',
        schema: buildJsonSchema(schemaDef), // full schema
        // Could also extract examples
        example: schemaDef.example || null,
      };
      resources.push(resource);
    }
  }

  // 3. Prompts – from info and also from tags/operations summaries
  // Main intro prompt
  if (spec.info) {
    const prompt = {
      id: 'intro',
      name: `${spec.info.title} - Overview`,
      description: spec.info.description || `Get general information about the ${spec.info.title} API.`,
      arguments: [],
    };
    prompts.push(prompt);
  }

  // Additional prompts: one per tag with description
  for (const tag of tags) {
    if (tag.description) {
      prompts.push({
        id: `tag_${tag.name}`,
        name: `${tag.name} API`,
        description: tag.description,
        arguments: [],
      });
    }
  }

  // 4. Also include servers, securitySchemes, tags as part of the returned object for the UI to display
  // We'll attach them to the capabilities object for extra info
  const extra = {
    servers,
    securitySchemes,
    tags,
    info,
  };

  return { tools, resources, prompts, extra };
}