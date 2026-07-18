/**
 * Injects registry schemas into spec.components.schemas and returns the updated spec.
 * Call this before exporting/saving a spec so all referenced schemas are embedded.
 */
export function resolveSpecRefs(specObj, registrySchemas) {
  if (!specObj || !registrySchemas?.length) return specObj;
  const clone = JSON.parse(JSON.stringify(specObj));
  if (!clone.components) clone.components = {};
  if (!clone.components.schemas) clone.components.schemas = {};
  registrySchemas.forEach(schema => {
    clone.components.schemas[schema.name] = schema.definition;
  });
  return clone;
}

/** Returns an OpenAPI $ref object pointing to a named schema in components.schemas */
export function schemaToRef(schemaName) {
  return { $ref: `#/components/schemas/${schemaName}` };
}

/**
 * Tries to find a registry schema whose property keys exactly match those of
 * an inline schema object. Useful for suggesting a $ref when an inline schema
 * was defined before the registry existed.
 */
export function findMatchingSchema(inlineSchema, registrySchemas) {
  if (!inlineSchema?.properties) return null;
  const inlineKeys = Object.keys(inlineSchema.properties).sort().join(',');
  return registrySchemas.find(rs => {
    const regKeys = Object.keys(rs.definition?.properties || {}).sort().join(',');
    return regKeys === inlineKeys;
  }) || null;
}
