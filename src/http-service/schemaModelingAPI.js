export const SchemaRulesAPI = {
  getActiveRules: async () => ({ status: 'SUCCESS', data: [] }),
  create: async (data) => ({ status: 'SUCCESS', data: { id: `rule_${Date.now()}`, ...data, active: true, createdAt: new Date().toISOString() } }),
  update: async (id, data) => ({ status: 'SUCCESS', data: { id, ...data } }),
  delete: async (id) => ({ status: 'SUCCESS' }),
};

export const AppliedChangesAPI = {
  record: async (data) => ({ status: 'SUCCESS', data: { id: `change_${Date.now()}`, ...data, appliedAt: new Date().toISOString() } }),
  getActiveBySpecification: async (specId) => ({ status: 'SUCCESS', data: [] }),
  revert: async (changeId) => ({ status: 'SUCCESS' }),
  revertAll: async (specId) => ({ status: 'SUCCESS' }),
};

export const ValidationAPI = {
  validateSpecification: async (specId) => ({ status: 'SUCCESS', data: [] }),
};
