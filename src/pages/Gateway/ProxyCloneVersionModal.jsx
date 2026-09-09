// src/pages/Gateway/ProxyCloneVersionModal.jsx
//
// Clone / Version an Apigee proxy directly, at the bundle level — Apigee itself has no
// "clone" or "version" API; the closest primitives are "import a bundle under a new name"
// (clone → a brand-new proxy, revision 1) and "import a bundle under the SAME name"
// (version → a new revision of the existing proxy, Apigee auto-increments the number).
// This works for every proxy in the catalog, not just ones created through the ForgeSphere
// onboarding wizard. Mirrors forgesphere-api-lifecycle's clone/version dialog:
//   - shows the source API's onboarding details (when it has a ForgeSphere lifecycle record)
//   - Select API step (source is fixed to whichever proxy the user clicked; the new name
//     defaults to "clone-<original>")
//   - shows the existing base path and requires the user to edit it before cloning
//   - after the new bundle is generated/imported, opens it straight in the Proxy Editor
//   - writes/refreshes an "auth-config" Key Value Map entry for the new proxy
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Copy, GitBranch, Loader2, Building2, Users, User, Mail, Globe, Info } from "lucide-react";
import JSZip from "jszip";
import { fetchApigeeToken } from "../../services/apigeeToken";
import { getTrackingHeaders, getFallbackOnboardingId, loadApigeeOnboardingOptions } from "../Apigee/components/apigeeTracking";
import OnboardingCascadeSelect from "../Apigee/components/OnboardingCascadeSelect";
import { APIGEE_ENDPOINTS } from "../../config/apigeeConfig";

const APIGEE_WRAPPER_BASE = "https://forgegateway.probestack.io/apigee-wrapper";
const ONBOARDING_RESOURCE_URL = (resourceId) => `https://forgegateway.probestack.io/onboarding/v1/api/onboarding/resources/${resourceId}`;
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

  const [onboarding, setOnboarding] = useState(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState("");

  // When the proxy has no auto-detected ForgeSphere lifecycle record (e.g. it was
  // imported straight into Apigee), let the user pick one manually from the same
  // Business Unit → Team → Application ID hierarchy used everywhere else in this app
  // to link a resource to onboarding context (see OnboardingCascadeSelect).
  const [manualOnboardingOptions, setManualOnboardingOptions] = useState([]);
  const [loadingManualOnboardingOptions, setLoadingManualOnboardingOptions] = useState(false);
  const [manualOnboardingError, setManualOnboardingError] = useState("");
  const [selectedManualOnboardingId, setSelectedManualOnboardingId] = useState("");
  const [selectedManualOption, setSelectedManualOption] = useState(null);

  // Shared by both paths — the auto-detected lifecycle record and a manually-picked
  // onboarding option resolve to the same "resources/{id}" onboarding endpoint.
  const loadOnboardingDetails = async (resourceId) => {
    if (!resourceId) { setOnboarding(null); return; }
    setOnboardingLoading(true);
    setOnboardingError("");
    try {
      const token = await fetchApigeeToken();
      const res = await fetch(ONBOARDING_RESOURCE_URL(resourceId), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOnboarding(data?.data || data);
    } catch (err) {
      setOnboardingError(err.message || "Failed to load onboarding details");
      setOnboarding(null);
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleManualOnboardingChange = (onboardingId, option) => {
    setSelectedManualOnboardingId(onboardingId);
    setSelectedManualOption(option);
    loadOnboardingDetails(option?.microserviceId);
  };

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
    setOnboarding(null);
    setOnboardingError("");
    setLoadingDefaults(true);
    setManualOnboardingOptions([]);
    setManualOnboardingError("");
    setSelectedManualOnboardingId("");
    setSelectedManualOption(null);

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

    const microserviceId = proxy?.lifecycle?.microserviceId;
    if (microserviceId) {
      loadOnboardingDetails(microserviceId);
    } else {
      // No lifecycle record to auto-resolve — offer the same Business Unit → Team →
      // Application ID picker used throughout this app to link a resource to onboarding
      // context, instead of just saying "no onboarding record" and stopping there.
      setLoadingManualOnboardingOptions(true);
      loadApigeeOnboardingOptions()
        .then((options) => setManualOnboardingOptions(options || []))
        .catch((err) => setManualOnboardingError(err.message || "Failed to load onboarding options"))
        .finally(() => setLoadingManualOnboardingOptions(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proxy?.name, mode, org]);

  if (!open || !proxy) return null;

  const onboardingRecord = onboarding?.onboarding;
  const microservice = onboarding?.resource?.microservice;

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

      // Apigee's import API treats "import a bundle under a name that already exists" as
      // a new REVISION of that existing proxy, not a new proxy — so an un-checked name
      // collision here would silently overwrite an unrelated proxy's revision history
      // instead of failing loudly. Only relevant to Clone (Version intentionally reuses
      // the source's own name).
      if (isClone) {
        const targetName = newName.trim();
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
      const newBlob = await zip.generateAsync({ type: "blob" });

      const targetName = isClone ? newName.trim() : proxy.name;
      const formData = new FormData();
      formData.append("file", newBlob, `${targetName}.zip`);
      const importUrl = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/apis?action=import&name=${encodeURIComponent(targetName)}`;
      const importRes = await fetch(importUrl, {
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
        onboardingId: proxy.lifecycle?.onboardingId || selectedManualOption?.onboardingId || getFallbackOnboardingId(),
        microserviceId: proxy.lifecycle?.microserviceId || selectedManualOption?.microserviceId,
        applicationId: selectedManualOption?.applicationId,
        applicationName: selectedManualOption?.applicationName,
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
          const deployRes = await fetch(deployUrl, {
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

          {/* Onboarding Details — auto-resolved from the proxy's ForgeSphere lifecycle
              record when it has one; otherwise let the user pick one from the same
              Business Unit → Team → Application ID hierarchy used elsewhere in this app. */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Onboarding Details</h4>

            {!proxy?.lifecycle?.microserviceId && (
              <div className="rounded-lg border border-[#2a3550] bg-[#0f1117]/60 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-200/80">
                    "{proxy.name}" wasn't created through ForgeSphere onboarding, so it has no onboarding record on file. Select one below to link this {isClone ? "clone" : "version"} to an application, or leave it blank — cloning/versioning still works either way.
                  </p>
                </div>
                <OnboardingCascadeSelect
                  value={selectedManualOnboardingId}
                  onChange={handleManualOnboardingChange}
                  options={manualOnboardingOptions}
                  isLoading={loadingManualOnboardingOptions}
                  selectClassName="w-full bg-[#0f172a]/50 border border-[#2a3550] rounded-lg px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:border-[#ff5b1f]"
                />
                {manualOnboardingError && (
                  <p className="text-[11px] text-red-400">Couldn't load onboarding options ({manualOnboardingError}).</p>
                )}
              </div>
            )}

            {onboardingLoading ? (
              <div className="rounded-lg border border-[#2a3550] bg-[#0f1117]/60 p-3 flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading onboarding details…
              </div>
            ) : onboardingError ? (
              <div className="rounded-lg border border-[#2a3550] bg-[#0f1117]/60 p-3 text-xs text-slate-500">
                Couldn't load onboarding details ({onboardingError}) — clone/versioning will still proceed.
              </div>
            ) : onboardingRecord || microservice ? (
              <div className="rounded-lg border border-[#2a3550] bg-[#0f1117]/60 p-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InfoField icon={Building2} label="Business Unit" value={onboardingRecord?.businessUnit} />
                <InfoField icon={Users} label="Team" value={onboardingRecord?.teamName} />
                <InfoField icon={Globe} label="Application" value={onboardingRecord?.applicationName || microservice?.applicationName} />
                <InfoField icon={User} label="Owner" value={onboardingRecord?.projectOwner} />
                <InfoField icon={Mail} label="Owner Email" value={onboardingRecord?.ownerEmail} />
                <InfoField icon={Info} label="API Name" value={microservice?.apiName} />
              </div>
            ) : proxy?.lifecycle?.microserviceId ? (
              <div className="rounded-lg border border-[#2a3550] bg-[#0f1117]/60 p-3 text-xs text-slate-500">No onboarding details found for this resource.</div>
            ) : null}
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
