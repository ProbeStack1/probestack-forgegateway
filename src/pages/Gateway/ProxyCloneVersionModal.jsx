// src/pages/Gateway/ProxyCloneVersionModal.jsx
//
// Clone / Version an Apigee proxy directly, at the bundle level — Apigee itself has no
// "clone" or "version" API; the closest primitives are "import a bundle under a new name"
// (clone → a brand-new proxy, revision 1) and "import a bundle under the SAME name"
// (version → a new revision of the existing proxy, Apigee auto-increments the number).
// This works for every proxy in the catalog, not just ones created through the ForgeSphere
// onboarding wizard. Mirrors forgesphere-api-lifecycle's clone/version dialog:
//   - Select API step (source is fixed to whichever proxy the user clicked; the new name
//     defaults to "clone-<original>")
//   - Onboarding Mapping: Business Unit → Project → Application, the same hierarchy
//     GatewayContextSelector and the Create Proxy dialog already source from
//     getBusinessUnits/getProjects/getApplications — picks which onboarding context this
//     clone/version's audit trail and KVM entry get tagged with
//   - shows the existing base path and requires the user to edit it before cloning
//   - after the new bundle is generated/imported, opens it straight in the Proxy Editor
//   - writes/refreshes an "auth-config" Key Value Map entry for the new proxy
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Copy, GitBranch, Loader2, Building2, FolderKanban, LayoutGrid, User, Mail } from "lucide-react";
import JSZip from "jszip";
import { fetchApigeeToken } from "../../services/apigeeToken";
import { getTrackingHeaders, getFallbackOnboardingId } from "../Apigee/components/apigeeTracking";
import { getBusinessUnits, getProjects, getApplications } from "../../http-service/onboardingApi";
import { APIGEE_ENDPOINTS } from "../../config/apigeeConfig";

const APIGEE_WRAPPER_BASE = "https://forgegateway.probestack.io/apigee-wrapper";
const AUTH_CONFIG_KVM_NAME = "auth-config";

// Apigee error responses are a JSON envelope buried inside the fetch response's text body —
// surface the specific violation (e.g. a conflicting base path) instead of the raw JSON blob.
const parseApigeeErrorMessage = (text) => {
  try {
    const parsed = JSON.parse(text);
    const violation = parsed?.error?.details?.flatMap((d) => d.violations || [])?.[0];
    return violation?.description || parsed?.error?.message || text;
  } catch {
    return text;
  }
};

async function proxyExists(token, org, apiName) {
  const res = await fetch(
    `${APIGEE_WRAPPER_BASE}/organizations/${encodeURIComponent(org)}/apis/${encodeURIComponent(apiName)}/details`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.ok;
}

async function fetchLatestBundle(token, org, apiName) {
  const detailsRes = await fetch(
    `${APIGEE_WRAPPER_BASE}/organizations/${encodeURIComponent(org)}/apis/${encodeURIComponent(apiName)}/details`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!detailsRes.ok) throw new Error(`Failed to load proxy details (HTTP ${detailsRes.status})`);
  const details = await detailsRes.json();
  const latestRev = details.proxy?.latestRevisionId;
  if (!latestRev) throw new Error("This proxy has no revisions to clone from.");
  const bundleRes = await fetch(
    `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/apis/${encodeURIComponent(apiName)}/revisions/${latestRev}/?format=bundle`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!bundleRes.ok) throw new Error(`Failed to download proxy bundle (HTTP ${bundleRes.status})`);
  const blob = await bundleRes.blob();
  return { blob, latestRev };
}

const proxyEndpointPaths = (zip) =>
  Object.keys(zip.files).filter((path) => path.includes("/proxies/") && path.endsWith(".xml"));

async function readBasePath(zip) {
  const parser = new DOMParser();
  for (const path of proxyEndpointPaths(zip)) {
    const xml = await zip.files[path].async("text");
    const doc = parser.parseFromString(xml, "application/xml");
    const el = doc.querySelector("ProxyEndpoint > HTTPProxyConnection > BasePath");
    if (el?.textContent) return el.textContent.trim();
  }
  return "/";
}

async function rewriteBasePath(zip, newBasePath) {
  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  for (const path of proxyEndpointPaths(zip)) {
    const xml = await zip.files[path].async("text");
    const doc = parser.parseFromString(xml, "application/xml");
    const el = doc.querySelector("ProxyEndpoint > HTTPProxyConnection > BasePath");
    if (el) {
      el.textContent = newBasePath;
      zip.file(path, serializer.serializeToString(doc));
    }
  }
}

// The bundle's root descriptor — apiproxy/<Name>.xml, one path segment directly under
// "apiproxy/" (unlike policies/proxies/targets/resources, which all live one level deeper)
// — carries the proxy's *internal* name and revision. Apigee's import API names the created
// proxy from the "name" query param regardless of what's in here, but leaving this stale
// means anything that reads the bundle afterwards (like opening it in the Proxy Editor)
// still shows the OLD proxy's name/revision instead of the clone's.
function findRootProxyXmlPath(zip) {
  return Object.keys(zip.files).find((path) => {
    const parts = path.split("/");
    const idx = parts.indexOf("apiproxy");
    return idx !== -1 && parts.length === idx + 2 && parts[idx + 1].endsWith(".xml");
  });
}

async function rewriteProxyName(zip, rootPath, newName) {
  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  const xml = await zip.files[rootPath].async("text");
  const doc = parser.parseFromString(xml, "application/xml");
  const root = doc.querySelector("APIProxy");
  if (!root) return;
  root.setAttribute("name", newName);
  const newPath = rootPath.replace(/[^/]+\.xml$/, `${newName}.xml`);
  zip.remove(rootPath);
  zip.file(newPath, serializer.serializeToString(doc));
}

// Apigee's Management API rate-limits aggressively — a Clone/Version does several calls
// back to back (bundle download, import, KVM ensure/get/upsert, deploy) and the last one
// (deploy) is the one most likely to land on a 429. Retry it with backoff instead of just
// surfacing "Too Many Requests" to the user.
async function fetchWithRetry(url, options, { retries = 3, baseDelayMs = 1500 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, options);
    if (res.status !== 429 || attempt >= retries) return res;
    const retryAfterHeader = res.headers.get("Retry-After");
    const delayMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : baseDelayMs * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, Number.isFinite(delayMs) ? delayMs : baseDelayMs));
  }
}

// Same KVM_ENV_LEVEL / KVM_ENV_LEVEL_ENTRY endpoints (and create-then-fall-back-to-update
// pattern) the Create Proxy dialog already uses for its "security-config" KVM — reused here
// under the "auth-config" name the clone/version flow is expected to carry forward.
const ensureKvmExists = async (org, env, kvmName, token, tracking) => {
  const headers = { ...getTrackingHeaders(tracking), Authorization: `Bearer ${token}` };
  const getRes = await fetch(APIGEE_ENDPOINTS.KVM_ENV_LEVEL.GET(org, env, kvmName), { headers });
  if (getRes.ok) return;
  const createRes = await fetch(APIGEE_ENDPOINTS.KVM_ENV_LEVEL.CREATE(org, env), {
    method: "POST",
    headers,
    body: JSON.stringify({ name: kvmName, encrypted: true }),
  });
  if (!createRes.ok && createRes.status !== 409) {
    throw new Error(`Failed to create Key Value Map "${kvmName}": ${createRes.status} ${await createRes.text()}`);
  }
};

const getKvmEntry = async (org, env, kvmName, entryName, token, tracking) => {
  const res = await fetch(APIGEE_ENDPOINTS.KVM_ENV_LEVEL_ENTRY.GET(org, env, kvmName, entryName), {
    headers: { ...getTrackingHeaders(tracking), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.value ?? null;
};

const upsertKvmEntry = async (org, env, kvmName, entryName, entryValue, token, tracking) => {
  const headers = { ...getTrackingHeaders(tracking), Authorization: `Bearer ${token}` };
  const body = JSON.stringify({ name: entryName, value: entryValue });
  const createRes = await fetch(APIGEE_ENDPOINTS.KVM_ENV_LEVEL_ENTRY.CREATE(org, env, kvmName), { method: "POST", headers, body });
  if (createRes.ok) return;
  if (createRes.status === 409 || createRes.status === 400) {
    const updateRes = await fetch(APIGEE_ENDPOINTS.KVM_ENV_LEVEL_ENTRY.UPDATE(org, env, kvmName, entryName), { method: "PUT", headers, body });
    if (updateRes.ok) return;
    throw new Error(`Failed to update Key Value Map entry "${entryName}": ${updateRes.status} ${await updateRes.text()}`);
  }
  throw new Error(`Failed to create Key Value Map entry "${entryName}": ${createRes.status} ${await createRes.text()}`);
};

const InfoField = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2">
    {Icon && <Icon className="h-3.5 w-3.5 text-sky-400/70 mt-0.5 shrink-0" />}
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-xs text-white truncate">{value || "—"}</div>
    </div>
  </div>
);

export default function ProxyCloneVersionModal({ open, mode, proxy, org, environments = [], onClose, onSuccess, showMessage, backTo = '/gateway/proxy' }) {
  const isClone = mode === "cloning";
  const navigate = useNavigate();

  const [newName, setNewName] = useState("");
  const [version, setVersion] = useState("");
  const [existingBasePath, setExistingBasePath] = useState("");
  const [newBasePath, setNewBasePath] = useState("");
  const [targetEnv, setTargetEnv] = useState("");
  const [deployAfterImport, setDeployAfterImport] = useState(true);
  const [openInEditorAfter, setOpenInEditorAfter] = useState(true);

  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Onboarding mapping for this clone/version — the same Business Unit → Project →
  // Application hierarchy GatewayContextSelector and the Create Proxy dialog already
  // source from getBusinessUnits/getProjects/getApplications, cascaded the same way.
  const [hierarchyBUs, setHierarchyBUs] = useState([]);
  const [loadingHierarchyBUs, setLoadingHierarchyBUs] = useState(false);
  const [hierarchyProjects, setHierarchyProjects] = useState([]);
  const [loadingHierarchyProjects, setLoadingHierarchyProjects] = useState(false);
  const [hierarchyApplications, setHierarchyApplications] = useState([]);
  const [loadingHierarchyApplications, setLoadingHierarchyApplications] = useState(false);

  const [selectedBUId, setSelectedBUId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedApplicationId, setSelectedApplicationId] = useState("");

  const selectedBU = hierarchyBUs.find((bu) => bu.id === selectedBUId) || null;
  const selectedProject = hierarchyProjects.find((p) => p.id === selectedProjectId) || null;
  const selectedApplication = hierarchyApplications.find((a) => a.id === selectedApplicationId) || null;

  useEffect(() => {
    if (!open || !proxy || !org) return;
    setNewName(isClone ? `clone-${proxy.name}` : proxy.name);
    setVersion("");
    setTargetEnv("");
    setDeployAfterImport(true);
    setOpenInEditorAfter(true);
    setError("");
    setExistingBasePath("");
    setNewBasePath("");
    setLoadingDefaults(true);
    setSelectedBUId("");
    setSelectedProjectId("");
    setSelectedApplicationId("");

    (async () => {
      try {
        const token = await fetchApigeeToken();
        const { blob } = await fetchLatestBundle(token, org, proxy.name);
        const zip = await JSZip.loadAsync(blob);
        const currentBasePath = await readBasePath(zip);
        setExistingBasePath(currentBasePath);
        setNewBasePath(isClone ? "" : currentBasePath);
      } catch (err) {
        setError(err.message || "Failed to load proxy bundle defaults");
      } finally {
        setLoadingDefaults(false);
      }
    })();

    setLoadingHierarchyBUs(true);
    getBusinessUnits(0, 200)
      .then((list) => setHierarchyBUs(list || []))
      .catch((err) => { console.error("Failed to load business units", err); setHierarchyBUs([]); })
      .finally(() => setLoadingHierarchyBUs(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proxy?.name, mode, org]);

  // Business Unit → Projects (same client-side filter GatewayContextSelector uses)
  useEffect(() => {
    if (!selectedBUId) { setHierarchyProjects([]); return; }
    let cancelled = false;
    setLoadingHierarchyProjects(true);
    getProjects(0, 200)
      .then((list) => { if (!cancelled) setHierarchyProjects((list || []).filter((p) => p.businessUnitId === selectedBUId)); })
      .catch((err) => { console.error("Failed to load projects", err); if (!cancelled) setHierarchyProjects([]); })
      .finally(() => { if (!cancelled) setLoadingHierarchyProjects(false); });
    return () => { cancelled = true; };
  }, [selectedBUId]);

  // Project → Applications (same call the Create Proxy dialog uses)
  useEffect(() => {
    if (!selectedProjectId) { setHierarchyApplications([]); return; }
    let cancelled = false;
    setLoadingHierarchyApplications(true);
    getApplications({ projectId: selectedProjectId, size: 100 })
      .then((list) => { if (!cancelled) setHierarchyApplications(list || []); })
      .catch((err) => { console.error("Failed to load applications", err); if (!cancelled) setHierarchyApplications([]); })
      .finally(() => { if (!cancelled) setLoadingHierarchyApplications(false); });
    return () => { cancelled = true; };
  }, [selectedProjectId]);

  if (!open || !proxy) return null;

  const handleSubmit = async () => {
    if (isClone && !newName.trim()) { setError("New proxy name is required."); return; }
    if (isClone && !/^[a-zA-Z0-9_-]+$/.test(newName.trim())) { setError("Only letters, numbers, hyphens and underscores allowed in the name."); return; }
    if (!newBasePath.trim()) { setError("Base path is required."); return; }
    if (isClone && newBasePath.trim() === existingBasePath.trim()) {
      setError("Edit the base path before cloning — it can't stay the same as the source proxy's, or deploying the clone will conflict with it.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const token = await fetchApigeeToken();

      const targetName = isClone ? newName.trim() : proxy.name;

      // Apigee's import API treats "import a bundle under a name that already exists" as
      // a new REVISION of that existing proxy, not a new proxy — so an un-checked name
      // collision here would silently overwrite an unrelated proxy's revision history
      // instead of failing loudly. Only relevant to Clone (Version intentionally reuses
      // the source's own name).
      if (isClone) {
        const collides = await proxyExists(token, org, targetName);
        if (collides) {
          setError(`A proxy named "${targetName}" already exists in this organization — choose a different name, or importing this bundle would add a new revision to that unrelated proxy instead of creating a clone.`);
          setSubmitting(false);
          return;
        }
      }

      const { blob } = await fetchLatestBundle(token, org, proxy.name);
      const zip = await JSZip.loadAsync(blob);
      await rewriteBasePath(zip, newBasePath.trim());
      if (isClone) {
        // Otherwise the bundle's internal <APIProxy name="..."> (and its revision) stay
        // stamped with the SOURCE proxy's identity — cosmetically harmless to Apigee's
        // import (it names the proxy from the ?name= query param), but anything that reads
        // the bundle back afterwards, like opening it straight in the Proxy Editor, would
        // show the old proxy's name/revision instead of the clone's.
        const rootPath = findRootProxyXmlPath(zip);
        if (rootPath) await rewriteProxyName(zip, rootPath, targetName);
      }
      const newBlob = await zip.generateAsync({ type: "blob" });

      const formData = new FormData();
      formData.append("file", newBlob, `${targetName}.zip`);
      const importUrl = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/apis?action=import&name=${encodeURIComponent(targetName)}`;
      const importRes = await fetchWithRetry(importUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!importRes.ok) {
        const errText = await importRes.text();
        throw new Error(parseApigeeErrorMessage(errText) || `Import failed (HTTP ${importRes.status})`);
      }
      const importResult = await importRes.json();
      const newRevision = importResult.revision || "1";

      const tracking = {
        // Legacy onboarding-context identity (only present for proxies created through
        // the ForgeSphere lifecycle wizard) — independent of the Business Unit/Project/
        // Application hierarchy below, same distinction getTrackingHeaders itself draws.
        onboardingId: proxy.lifecycle?.onboardingId || getFallbackOnboardingId(),
        microserviceId: proxy.lifecycle?.microserviceId,
        // Business hierarchy — which Project/Application this clone/version maps to.
        projectId: selectedProject?.id,
        projectName: selectedProject?.name,
        applicationId: selectedApplication?.id,
        applicationName: selectedApplication?.name,
      };

      // Audit trail — best-effort, mirrors the existing "Create API" recording pattern
      // (config-audit) so Clone/Version operations show up in the same audit history.
      try {
        await fetch(
          `${APIGEE_WRAPPER_BASE}/organizations/${encodeURIComponent(org)}/config-audit/API/${encodeURIComponent(targetName)}/record`,
          {
            method: "POST",
            headers: getTrackingHeaders(tracking),
            body: JSON.stringify({
              operation: isClone ? "CLONE" : "VERSION_CREATE",
              requestPayload: { sourceProxy: proxy.name, version: version || undefined, basePath: newBasePath.trim() },
              afterSnapshot: { ...importResult, version: version || undefined, clonedFrom: isClone ? proxy.name : undefined },
              responsePayload: importResult,
            }),
          }
        );
      } catch {
        // Audit failures shouldn't block the user from seeing the clone/version succeed.
      }

      // "auth-config" Key Value Map — carry the source proxy's entry (if any) forward onto
      // the new proxy/revision, keyed by proxy name, same convention the Create Proxy
      // dialog uses for its own "security-config" KVM.
      if (targetEnv) {
        try {
          await ensureKvmExists(org, targetEnv, AUTH_CONFIG_KVM_NAME, token, tracking);
          const sourceValueRaw = await getKvmEntry(org, targetEnv, AUTH_CONFIG_KVM_NAME, proxy.name, token, tracking);
          let mergedValue = {};
          if (sourceValueRaw) {
            try { mergedValue = JSON.parse(sourceValueRaw); } catch { mergedValue = { raw: sourceValueRaw }; }
          }
          mergedValue = {
            ...mergedValue,
            version: version || mergedValue.version || "",
            basePath: newBasePath.trim(),
            ...(isClone ? { clonedFrom: proxy.name } : {}),
            updatedAt: new Date().toISOString(),
          };
          await upsertKvmEntry(org, targetEnv, AUTH_CONFIG_KVM_NAME, targetName, JSON.stringify(mergedValue), token, tracking);
          showMessage?.(`"${AUTH_CONFIG_KVM_NAME}" Key Value Map entry set for "${targetName}".`, "success");
        } catch (err) {
          showMessage?.(`${isClone ? "Clone" : "Version"} succeeded, but the "${AUTH_CONFIG_KVM_NAME}" KVM entry failed: ${err.message}`, "error");
        }
      }

      if (targetEnv && deployAfterImport) {
        try {
          const deployUrl = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/environments/${encodeURIComponent(targetEnv)}/apis/${encodeURIComponent(targetName)}/revisions/${newRevision}/deployments?override=true`;
          const deployRes = await fetchWithRetry(deployUrl, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ override: true }),
          });
          if (!deployRes.ok) {
            const errText = await deployRes.text();
            throw new Error(parseApigeeErrorMessage(errText) || `HTTP ${deployRes.status}`);
          }
          showMessage?.(`Deployed revision ${newRevision} to "${targetEnv}"`, "success");
        } catch (err) {
          showMessage?.(`${isClone ? "Clone" : "Version"} succeeded, but deployment to "${targetEnv}" failed: ${err.message}`, "error");
        }
      }

      showMessage?.(
        isClone
          ? `Cloned "${proxy.name}" as "${targetName}" (revision ${newRevision}).`
          : `Created revision ${newRevision} of "${proxy.name}".`,
        "success"
      );
      onSuccess?.({ name: targetName, revision: newRevision });

      // Generate the new bundle → open it straight in the Proxy Editor, using the exact
      // blob just imported rather than re-downloading it from Apigee.
      if (openInEditorAfter) {
        const zipUrl = URL.createObjectURL(newBlob);
        onClose?.();
        navigate('/proxy-editor', {
          state: {
            zipUrl,
            selectedProxyName: targetName,
            backTo,
          },
        });
      } else {
        onClose?.();
      }
    } catch (err) {
      setError(err.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-xl border border-[#2a3550] shadow-2xl flex flex-col bg-[#111520]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a3550]">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            {isClone ? <Copy className="h-4 w-4 text-emerald-400" /> : <GitBranch className="h-4 w-4 text-amber-400" />}
            {isClone ? `Clone ${proxy.name}` : `Create New Version of ${proxy.name}`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" disabled={submitting}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Select API — source is fixed to whichever proxy the action was opened from */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Select API</h4>
            <div className="rounded-lg border border-[#2a3550] bg-[#0f1117]/60 p-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Source Proxy</div>
                <div className="text-sm font-medium text-white">{proxy.name}</div>
              </div>
              {isClone && (
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">New Proxy Name</div>
                  <div className="text-sm font-mono text-emerald-300">{newName || "—"}</div>
                </div>
              )}
            </div>
          </div>

          {/* Onboarding mapping — Business Unit → Project → Application, the same
              hierarchy GatewayContextSelector and Create Proxy already source from
              getBusinessUnits/getProjects/getApplications. Picks which onboarding
              context this clone/version's audit trail and KVM entry get tagged with. */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Onboarding Mapping</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 flex items-center gap-1.5"><Building2 className="h-3 w-3" /> Business Unit</label>
                <select
                  value={selectedBUId}
                  onChange={(e) => { setSelectedBUId(e.target.value); setSelectedProjectId(""); setSelectedApplicationId(""); }}
                  disabled={loadingHierarchyBUs}
                  className="w-full px-3 py-2 rounded-lg border border-[#2a3550] bg-[#0f172a]/50 text-white text-sm focus:outline-none focus:border-[#ff5b1f] disabled:opacity-50"
                >
                  <option value="">{loadingHierarchyBUs ? "Loading…" : "Select Business Unit"}</option>
                  {hierarchyBUs.map((bu) => (
                    <option key={bu.id} value={bu.id}>{bu.displayName || bu.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400 flex items-center gap-1.5"><FolderKanban className="h-3 w-3" /> Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedApplicationId(""); }}
                  disabled={!selectedBUId || loadingHierarchyProjects}
                  className="w-full px-3 py-2 rounded-lg border border-[#2a3550] bg-[#0f172a]/50 text-white text-sm focus:outline-none focus:border-[#ff5b1f] disabled:opacity-50"
                >
                  <option value="">{!selectedBUId ? "Select a Business Unit first" : loadingHierarchyProjects ? "Loading…" : "Select Project"}</option>
                  {hierarchyProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400 flex items-center gap-1.5"><LayoutGrid className="h-3 w-3" /> Application</label>
                <select
                  value={selectedApplicationId}
                  onChange={(e) => setSelectedApplicationId(e.target.value)}
                  disabled={!selectedProjectId || loadingHierarchyApplications}
                  className="w-full px-3 py-2 rounded-lg border border-[#2a3550] bg-[#0f172a]/50 text-white text-sm focus:outline-none focus:border-[#ff5b1f] disabled:opacity-50"
                >
                  <option value="">{!selectedProjectId ? "Select a Project first" : loadingHierarchyApplications ? "Loading…" : "Select Application"}</option>
                  {hierarchyApplications.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedApplication && (
              <div className="rounded-lg border border-[#2a3550] bg-[#0f1117]/60 p-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InfoField icon={Building2} label="Business Unit" value={selectedBU?.displayName || selectedBU?.name} />
                <InfoField icon={FolderKanban} label="Project" value={selectedProject?.name} />
                <InfoField icon={LayoutGrid} label="Application" value={selectedApplication?.name} />
                <InfoField icon={User} label="Owner" value={selectedApplication?.ownerName} />
                <InfoField icon={Mail} label="Owner Email" value={selectedApplication?.ownerEmail} />
              </div>
            )}
          </div>

          {/* New details */}
          <div className="space-y-4 rounded-lg border border-[#2a3550] bg-[#0f1117]/40 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {isClone ? "New Proxy Details" : "New Version Details"}
            </h4>

            {isClone && (
              <div className="space-y-2">
                <label className="text-xs text-gray-400">New Proxy Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={`clone-${proxy.name}`}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#2a3550] bg-[#0f172a]/50 text-white text-sm focus:ring-2 focus:ring-[#ff5b1f]/20 focus:border-[#ff5b1f] transition-all outline-none"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs text-gray-400">Version (tracking label, optional)</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g., 2.0.0"
                className="w-full px-4 py-2.5 rounded-lg border border-[#2a3550] bg-[#0f172a]/50 text-white text-sm focus:ring-2 focus:ring-[#ff5b1f]/20 focus:border-[#ff5b1f] transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Existing Base Path</label>
                <input
                  type="text"
                  value={loadingDefaults ? "Loading…" : existingBasePath}
                  readOnly
                  className="w-full px-4 py-2.5 rounded-lg border border-[#2a3550] bg-[#0a0e18] text-slate-400 text-sm cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400">{isClone ? "New Base Path *" : "Base Path"}</label>
                <input
                  type="text"
                  value={newBasePath}
                  onChange={(e) => setNewBasePath(e.target.value)}
                  placeholder="/v2/orders"
                  disabled={loadingDefaults}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#2a3550] bg-[#0f172a]/50 text-white text-sm focus:ring-2 focus:ring-[#ff5b1f]/20 focus:border-[#ff5b1f] transition-all outline-none disabled:opacity-50"
                />
              </div>
            </div>
            {isClone && (
              <p className="text-[11px] text-amber-300/80 -mt-2">
                Edit the base path above — it must differ from the source proxy's "{existingBasePath || "…"}" before you can clone.
              </p>
            )}

            {environments.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Environment</label>
                <select
                  value={targetEnv}
                  onChange={(e) => setTargetEnv(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#2a3550] bg-[#0f172a]/50 text-white text-sm focus:outline-none focus:border-[#ff5b1f]"
                >
                  <option value="">Skip environment setup (no KVM entry, no deploy)</option>
                  {environments.map((env) => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">Used to create/refresh the "{AUTH_CONFIG_KVM_NAME}" Key Value Map entry, and optionally to deploy the new {isClone ? "proxy" : "revision"}.</p>
              </div>
            )}

            {targetEnv && (
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deployAfterImport}
                  onChange={(e) => setDeployAfterImport(e.target.checked)}
                  className="rounded border-[#2a3550] bg-[#1a1f2e] text-[#ff5b1f] focus:ring-[#ff5b1f]"
                />
                Deploy the new {isClone ? "proxy" : "revision"} to "{targetEnv}" immediately
              </label>
            )}

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={openInEditorAfter}
                onChange={(e) => setOpenInEditorAfter(e.target.checked)}
                className="rounded border-[#2a3550] bg-[#1a1f2e] text-[#ff5b1f] focus:ring-[#ff5b1f]"
              />
              Open the new bundle in the Proxy Editor when done
            </label>
          </div>

          {loadingDefaults && (
            <p className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading current bundle…</p>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#2a3550] bg-[#0f172a]/50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loadingDefaults}
            className="px-6 py-2 rounded-lg font-semibold text-sm transition-all bg-[#ff5b1f] hover:bg-[#ff6b36] text-white shadow-md shadow-[#ff5b1f]/25 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isClone ? "Clone Proxy" : "Start Versioning"}
          </button>
        </div>
      </div>
    </div>
  );
}
