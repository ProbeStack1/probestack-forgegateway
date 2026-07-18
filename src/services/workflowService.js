import { API_ENDPOINTS } from '../config/apiConfig';

export async function fetchWorkflows(userEmail) {
  const res = await fetch(API_ENDPOINTS.WORKFLOWS.LIST(userEmail));
  if (!res.ok) throw new Error(`Failed to fetch workflows: ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

export async function fetchWorkflowsByOrganization(organization) {
  const res = await fetch(API_ENDPOINTS.WORKFLOWS.LIST_BY_ORG(organization));
  if (!res.ok) throw new Error(`Failed to fetch workflows: ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

export async function createWorkflow(payload) {
  const res = await fetch(API_ENDPOINTS.WORKFLOWS.CREATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create workflow: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function updateWorkflow(id, payload) {
  const res = await fetch(API_ENDPOINTS.WORKFLOWS.UPDATE(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update workflow: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function deleteWorkflow(id) {
  const res = await fetch(API_ENDPOINTS.WORKFLOWS.DELETE(id), { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to delete workflow: ${res.status}`);
}
