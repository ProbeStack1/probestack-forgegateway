import { useState, useEffect, useCallback } from 'react';
import { SchemaRegistryAPI } from '../http-service/schemaRegistryAPI';

const DEFAULT_ORG_ID = 'f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c';

const getOrgId = () => {
  const direct = localStorage.getItem('userOrganizationId');
  if (direct) return direct;
  try {
    const data = JSON.parse(localStorage.getItem('probeStack_onboardingData') || '{}');
    return data.organizationId || DEFAULT_ORG_ID;
  } catch {
    return DEFAULT_ORG_ID;
  }
};

export function useSchemaRegistry(specId) {
  const [orgId] = useState(getOrgId);
  const [schemas, setSchemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [orgSchemas, setOrgSchemas] = useState(null); // null = not loaded yet

  // Spec-scoped list — the working set shown in the left panel. Re-fetches
  // whenever the spec changes, clearing immediately so the previous spec's
  // schemas don't linger while the new spec's list is in flight.
  const refresh = useCallback(async () => {
    if (!specId) { setSchemas([]); return; }
    setSchemas([]);
    setLoading(true);
    const result = await SchemaRegistryAPI.listBySpec(specId);
    if (result.status === 'SUCCESS') setSchemas(result.data ?? []);
    setLoading(false);
  }, [specId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Org-wide list — only fetched on demand (e.g. opening the Import modal).
  // Powers org-scoped concerns: name-uniqueness conflict checks
  // (nameUsedInOtherSpec) and schemas already linked into this spec from
  // elsewhere in the org. Cross-org domain discovery uses `searchByDomain`
  // below instead, since that search is explicitly NOT org-scoped.
  const loadOrgSchemas = useCallback(async () => {
    if (!orgId || orgSchemas !== null) return;
    const result = await SchemaRegistryAPI.list(orgId);
    if (result.status === 'SUCCESS') setOrgSchemas(result.data ?? []);
  }, [orgId, orgSchemas]);

  // On-demand, cross-organization lookup by domain tag — backs "Find in
  // other specs" in the Import modal. Deliberately not scoped to `orgId`:
  // the backend endpoint searches across all organizations so a domain tag
  // (e.g. "Healthcare") can surface reusable schemas platform-wide, not just
  // ones this org already owns.
  const searchByDomain = useCallback(async (domain) => {
    const trimmed = domain?.trim();
    if (!trimmed) return { success: true, data: [] };
    const result = await SchemaRegistryAPI.listByDomain(trimmed);
    if (result.status === 'SUCCESS') return { success: true, data: result.data ?? [] };
    return { success: false, error: result.error, data: [] };
  }, []);

  // Sorted list of every distinct domain in use, system-wide — not scoped to
  // `orgId` (same reasoning as `searchByDomain`). Stateless like
  // `searchByDomain`: callers own their own loading/error state around it.
  const getAllDomains = useCallback(async () => {
    const result = await SchemaRegistryAPI.listAllDomains();
    if (result.status === 'SUCCESS') return { success: true, data: result.data ?? [] };
    return { success: false, error: result.error, data: [] };
  }, []);

  const createSchema = useCallback(async (name, definition, description = '', domain = '') => {
    const result = await SchemaRegistryAPI.create(orgId, name, definition, description, specId, domain);
    if (result.status === 'SUCCESS') {
      setSchemas(prev => [...prev, result.data]);
      return { success: true, data: result.data };
    }
    return { success: false, error: result.error, status: result.httpStatus };
  }, [orgId, specId]);

  const updateSchema = useCallback(async (schemaId, updates) => {
    const result = await SchemaRegistryAPI.update(schemaId, updates);
    if (result.status === 'SUCCESS') {
      setSchemas(prev => prev.map(s => s.id === schemaId ? result.data : s));
      return { success: true, data: result.data };
    }
    // 404 means someone else already deleted it — drop the stale copy from
    // the local list so it doesn't keep looking editable in the sidebar.
    if (result.httpStatus === 404) {
      setSchemas(prev => prev.filter(s => s.id !== schemaId));
    }
    return { success: false, error: result.error, status: result.httpStatus };
  }, []);

  const deleteSchema = useCallback(async (schemaId) => {
    const result = await SchemaRegistryAPI.delete(schemaId);
    if (result.status === 'SUCCESS') {
      setSchemas(prev => prev.filter(s => s.id !== schemaId));
      return { success: true };
    }
    return { success: false, error: result.error };
  }, []);

  return {
    schemas, loading, orgId, refresh, createSchema, updateSchema, deleteSchema,
    orgSchemas: orgSchemas ?? [], loadOrgSchemas, searchByDomain, getAllDomains,
  };
}
