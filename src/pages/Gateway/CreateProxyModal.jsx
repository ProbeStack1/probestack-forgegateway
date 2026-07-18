// src/components/Gateway/CreateProxyModal.jsx
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import JSZip from "jszip";
import { fetchApigeeToken } from "../../services/apigeeToken";

export const CreateProxyModal = ({ open, onClose, selectedOrg, onProxyCreated, showMessage }) => {
  const [template, setTemplate] = useState("reverse");
  const [name, setName] = useState("");
  const [basePath, setBasePath] = useState("/");
  const [description, setDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [zipFile, setZipFile] = useState(null);
  const [deploymentEnvs, setDeploymentEnvs] = useState([]);
  const [apiType, setApiType] = useState("REST");
  const [openApiSpecFile, setOpenApiSpecFile] = useState(null);
  const [specParsed, setSpecParsed] = useState(false);
  const [specError, setSpecError] = useState(null);
  const [availableCreateEnvs, setAvailableCreateEnvs] = useState([]);
  const [loadingEnvs, setLoadingEnvs] = useState(false);

  useEffect(() => {
    if (open && selectedOrg) {
      fetchEnvironments();
    }
  }, [open, selectedOrg]);

  const fetchEnvironments = async () => {
    setLoadingEnvs(true);
    try {
      const token = await fetchApigeeToken();
      const url = `https://forgesphere.probestack.io/apigee-wrapper/organizations/${selectedOrg}/environments`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setAvailableCreateEnvs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEnvs(false);
    }
  };

  const generateProxyZip = async (tmpl, { name: proxyName, basePath: bp, targetUrl: tu }) => {
    const zip = new JSZip();
    const apiproxyFolder = zip.folder("apiproxy");
    const apiProxyXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<APIProxy revision="1" name="${proxyName}">
  <BasePaths>${bp}</BasePaths>
  <ProxyEndpoints><ProxyEndpoint>default</ProxyEndpoint></ProxyEndpoints>
  ${tmpl === "reverse" ? "<TargetEndpoints><TargetEndpoint>default</TargetEndpoint></TargetEndpoints>" : ""}
</APIProxy>`;
    apiproxyFolder.file(`${proxyName}.xml`, apiProxyXml);
    const proxiesFolder = apiproxyFolder.folder("proxies");
    const proxyEndpointXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ProxyEndpoint name="default">
  <HTTPProxyConnection><BasePath>${bp}</BasePath></HTTPProxyConnection>
  <RouteRule name="default"/>
</ProxyEndpoint>`;
    proxiesFolder.file("default.xml", proxyEndpointXml);
    if (tmpl === "reverse") {
      const targetsFolder = apiproxyFolder.folder("targets");
      const targetEndpointXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<TargetEndpoint name="default">
  <HTTPTargetConnection><URL>${tu}</URL></HTTPTargetConnection>
</TargetEndpoint>`;
      targetsFolder.file("default.xml", targetEndpointXml);
    }
    const content = await zip.generateAsync({ type: "blob" });
    return new File([content], `${proxyName}.zip`, { type: "application/zip" });
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      showMessage("Proxy name is required.", "error");
      return;
    }
    if (template === "reverse" && !targetUrl.trim()) {
      showMessage("Target URL is required for Reverse proxy.", "error");
      return;
    }
    if (template === "upload" && !zipFile) {
      showMessage("Please select a ZIP archive.", "error");
      return;
    }
    if ((template === "reverse-openapi" || template === "no-target-openapi") && !specParsed) {
      showMessage("Please upload a valid OpenAPI specification file first.", "error");
      return;
    }

    const token = await fetchApigeeToken();
    if (!token) {
      showMessage("Failed to obtain authentication token.", "error");
      return;
    }

    try {
      let zipToUpload = null;
      if (template === "reverse" || template === "no-target") {
        zipToUpload = await generateProxyZip(template, { name, basePath, targetUrl });
      } else if (template === "upload") {
        zipToUpload = zipFile;
      } else {
        // OpenAPI templates - you can implement similar generation or use the parsed spec
        console.log("OpenAPI template not fully implemented yet");
        return;
      }

      const formData = new FormData();
      formData.append("file", zipToUpload);
      const uploadUrl = `https://apigee.googleapis.com/v1/organizations/${selectedOrg}/apis?action=import&name=${encodeURIComponent(name)}`;
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error(await response.text());
      showMessage(`Proxy "${name}" created successfully!`, "success");
      onProxyCreated();
      onClose();
      resetForm();
    } catch (err) {
      showMessage(`Creation failed: ${err.message}`, "error");
    }
  };

  const resetForm = () => {
    setTemplate("reverse");
    setName("");
    setBasePath("/");
    setDescription("");
    setTargetUrl("");
    setZipFile(null);
    setDeploymentEnvs([]);
    setApiType("REST");
    setOpenApiSpecFile(null);
    setSpecParsed(false);
    setSpecError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[60vw] max-h-[90vh] p-0 flex flex-col bg-[#111520] border border-[#27314e] text-white">
        <div className="flex-shrink-0 px-6 pt-6 pb-3 border-b border-[#27314e]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Create a proxy</DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure your proxy details, deployment environments, and service account.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* API Type */}
          <div>
            <label className="text-sm font-medium text-white">API Type</label>
            <div className="flex flex-wrap gap-4 mt-2">
              {["Rest", "SOAP", "GraphQL", "MCP"].map((type) => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="apiType"
                    value={type}
                    checked={apiType === type}
                    onChange={() => setApiType(type)}
                    className="accent-[#ff5b1f]"
                  />
                  <span className="text-white">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Template */}
          <div>
            <label className="text-xs font-semibold text-slate-400">Proxy Template</label>
            <select
              value={template}
              onChange={(e) => {
                setTemplate(e.target.value);
                setSpecParsed(false);
                setOpenApiSpecFile(null);
              }}
              className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white"
            >
              <option value="reverse">Reverse Proxy (Most common)</option>
              <option value="no-target">No Target</option>
              <option value="upload">Upload Proxy Bundle</option>
              <option value="reverse-openapi">Reverse Proxy using OpenAPI Spec</option>
              <option value="no-target-openapi">No Target using OpenAPI Spec</option>
            </select>
          </div>

          {/* OpenAPI Upload (if applicable) */}
          {(template === "reverse-openapi" || template === "no-target-openapi") && !specParsed && (
            <div className="border border-dashed border-[#2a3550] rounded-lg p-4 bg-[#0f1117]/50">
              <label className="block text-sm font-medium text-white mb-2">Upload OpenAPI Specification (JSON/YAML)</label>
              <input
                type="file"
                accept=".json,.yaml,.yml"
                onChange={(e) => {
                  // Simplified - you can reuse the parsing logic from original
                  setSpecParsed(true);
                }}
              />
              {specError && <p className="mt-2 text-xs text-red-400">{specError}</p>}
            </div>
          )}

          {/* Proxy details */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-white">Proxy Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white"
              />
            </div>
            {template !== "upload" && (
              <>
                <div>
                  <label className="text-sm font-medium text-white">Base Path</label>
                  <input
                    type="text"
                    value={basePath}
                    onChange={(e) => setBasePath(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-white">Description (Optional)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white"
                  />
                </div>
              </>
            )}
            {(template === "reverse" || template === "reverse-openapi") && (
              <div>
                <label className="text-sm font-medium text-white">Target (Existing API)</label>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white"
                />
              </div>
            )}
            {template === "upload" && (
              <div>
                <label className="text-sm font-medium text-white">Zip Archive</label>
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setZipFile(e.target.files[0])}
                  className="mt-1 w-full text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#ff5b1f] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                />
              </div>
            )}
          </div>

          {/* Deployment Environments */}
          <div>
            <label className="text-sm font-medium text-white">Deployment Environments (Optional)</label>
            <div className="mt-2 flex flex-wrap gap-3">
              {loadingEnvs ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : (
                availableCreateEnvs.map((env) => (
                  <label key={env} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={deploymentEnvs.includes(env)}
                      onChange={(e) => {
                        if (e.target.checked) setDeploymentEnvs([...deploymentEnvs, env]);
                        else setDeploymentEnvs(deploymentEnvs.filter((e) => e !== env));
                      }}
                      className="rounded border-[#2a3550] bg-[#0f1117] text-[#ff5b1f]"
                    />
                    <span className="text-white">{env}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-[#27314e] bg-[#111520]">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} className="bg-[#ff5b1f] hover:bg-[#ff6b36]">
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};