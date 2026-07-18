import { schemaRegistryService } from '../services/schemaRegistryService';

const wrap = async (fn) => {
  const result = await fn();
  if (result.success) return { status: 'SUCCESS', data: result.data };
  return { status: 'ERROR', error: result.error, httpStatus: result.status };
};

export const SchemaRegistryAPI = {
  list:         (orgId)   => wrap(() => schemaRegistryService.list(orgId)),
  listBySpec:   (specId)  => wrap(() => schemaRegistryService.getBySpec(specId)),
  listByDomain: (domain)  => wrap(() => schemaRegistryService.getByDomain(domain)),
  listAllDomains: ()      => wrap(() => schemaRegistryService.getAllDomains()),
  get:        (schemaId) => wrap(() => schemaRegistryService.getById(schemaId)),
  create: (orgId, name, definition, description = '', specId, domain) =>
    wrap(() => schemaRegistryService.create({
      organizationId: orgId,
      name,
      description,
      definition,
      ...(specId ? { specId } : {}),
      ...(domain ? { domain } : {}),
    })),
  update: (schemaId, updates)  => wrap(() => schemaRegistryService.update(schemaId, updates)),
  delete: (schemaId)           => wrap(() => schemaRegistryService.delete(schemaId)),
};
