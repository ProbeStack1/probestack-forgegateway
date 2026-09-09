import { useEffect, useState } from "react";
import { getBusinessUnits, getProjects, getApplications } from "../../../http-service/onboardingApi";

// Business Unit -> Project -> Application cascading picker, sourced from the
// real onboarding hierarchy (fg-onboarding-svc via getBusinessUnits/
// getProjects/getApplications) — the same three fields the Environments
// (Gateway) create dialogs standardize on. Deliberately NOT the legacy
// OnboardingCascadeSelect.jsx shape (Business Unit / Team Name / Application
// ID drawn from a flat onboardingOptions list) — no Team, no free-text
// Application ID, just the real hierarchy.
const defaultSelectClassName =
  "w-full bg-[#0f1117] border border-[#2a3550] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#ff5b1f] disabled:opacity-50 disabled:cursor-not-allowed";

export default function OnboardingHierarchySelect({
  businessUnitId = "",
  projectId = "",
  applicationId = "",
  onChange,
  required = false,
  className = "",
  selectClassName = defaultSelectClassName,
}) {
  const [businessUnits, setBusinessUnits] = useState([]);
  const [loadingBUs, setLoadingBUs] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingBUs(true);
    getBusinessUnits(0, 200)
      .then((list) => { if (!cancelled) setBusinessUnits(list || []); })
      .catch((err) => { console.error("Failed to load business units", err); if (!cancelled) setBusinessUnits([]); })
      .finally(() => { if (!cancelled) setLoadingBUs(false); });
    return () => { cancelled = true; };
  }, []);

  // /projects has no server-side businessUnitId filter, so load everything
  // and filter client-side — same approach the ai-gateway app's
  // AIProxyCloneVersionModal.jsx Onboarding Mapping uses.
  useEffect(() => {
    if (!businessUnitId) { setProjects([]); return; }
    let cancelled = false;
    setLoadingProjects(true);
    getProjects(0, 200)
      .then((list) => { if (!cancelled) setProjects((list || []).filter((p) => p.businessUnitId === businessUnitId)); })
      .catch((err) => { console.error("Failed to load projects", err); if (!cancelled) setProjects([]); })
      .finally(() => { if (!cancelled) setLoadingProjects(false); });
    return () => { cancelled = true; };
  }, [businessUnitId]);

  useEffect(() => {
    if (!projectId) { setApplications([]); return; }
    let cancelled = false;
    setLoadingApplications(true);
    getApplications({ projectId, size: 200 })
      .then((list) => { if (!cancelled) setApplications(list || []); })
      .catch((err) => { console.error("Failed to load applications", err); if (!cancelled) setApplications([]); })
      .finally(() => { if (!cancelled) setLoadingApplications(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  const handleBusinessUnitChange = (nextId) => {
    const businessUnit = businessUnits.find((bu) => bu.id === nextId) || null;
    onChange?.({
      businessUnitId: nextId, projectId: "", applicationId: "",
      businessUnit, project: null, application: null,
    });
  };

  const handleProjectChange = (nextId) => {
    const project = projects.find((p) => p.id === nextId) || null;
    onChange?.({
      businessUnitId, projectId: nextId, applicationId: "",
      businessUnit: businessUnits.find((bu) => bu.id === businessUnitId) || null,
      project, application: null,
    });
  };

  const handleApplicationChange = (nextId) => {
    const application = applications.find((a) => a.id === nextId) || null;
    onChange?.({
      businessUnitId, projectId, applicationId: nextId,
      businessUnit: businessUnits.find((bu) => bu.id === businessUnitId) || null,
      project: projects.find((p) => p.id === projectId) || null,
      application,
    });
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
      <div>
        <label className="text-sm text-gray-400">Business Unit{required ? "*" : ""}</label>
        <select
          value={businessUnitId}
          disabled={loadingBUs}
          className={selectClassName}
          onChange={(e) => handleBusinessUnitChange(e.target.value)}
        >
          <option value="">{loadingBUs ? "Loading business units..." : "Select Business Unit"}</option>
          {businessUnits.map((bu) => (
            <option key={bu.id} value={bu.id}>{bu.displayName || bu.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm text-gray-400">Project{required ? "*" : ""}</label>
        <select
          value={projectId}
          disabled={!businessUnitId || loadingProjects}
          className={selectClassName}
          onChange={(e) => handleProjectChange(e.target.value)}
        >
          <option value="">{!businessUnitId ? "Select a business unit first" : loadingProjects ? "Loading projects..." : "Select Project"}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm text-gray-400">Application{required ? "*" : ""}</label>
        <select
          value={applicationId}
          disabled={!projectId || loadingApplications}
          className={selectClassName}
          onChange={(e) => handleApplicationChange(e.target.value)}
        >
          <option value="">{!projectId ? "Select a project first" : loadingApplications ? "Loading applications..." : "Select Application"}</option>
          {applications.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
