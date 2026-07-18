const SWAGGERHUB_BASE = 'https://api.swaggerhub.com';

// Read a value from the properties array by type
const getProp = (properties, type) =>
  properties?.find((p) => p.type === type);

export const swaggerHubService = {
  searchApis: async (query = '', limit = 20) => {
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: String(limit),
        sort: 'CREATED',
        order: 'DESC',
      });
      if (query.trim()) params.set('query', query.trim());
      const response = await fetch(`${SWAGGERHUB_BASE}/apis?${params}`);
      if (!response.ok) throw new Error(`SwaggerHub returned ${response.status}`);
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to fetch from SwaggerHub' };
    }
  },

  getApisByOwner: async (owner, limit = 20) => {
    try {
      const params = new URLSearchParams({ page: '1', limit: String(limit) });
      const response = await fetch(
        `${SWAGGERHUB_BASE}/apis/${encodeURIComponent(owner.trim())}?${params}`
      );
      if (!response.ok) throw new Error(`SwaggerHub returned ${response.status}`);
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to fetch SwaggerHub APIs by owner' };
    }
  },

  parseApiList: (data) =>
    (data?.apis || [])
      .map((api) => {
        const props = api.properties || [];

        // The "Swagger" property holds the direct spec URL
        // e.g. https://api.swaggerhub.com/apis/{owner}/{name}/{version}
        const specUrl = getProp(props, 'Swagger')?.url || '';
        const owner   = getProp(props, 'X-Owner')?.value || '';
        const name    = getProp(props, 'X-Name')?.value  || '';
        const version = getProp(props, 'X-Version')?.value || '1.0.0';

        if (!specUrl) return null;

        return {
          id: `${owner}_${name}_${version}`,
          name: api.name,
          owner,
          version,
          description: api.description || '',
          specUrl,
        };
      })
      .filter(Boolean),
};
