import React, { useState, useEffect } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import API_BASE_URL from '../../config/apiConfig';
import { getBusinessUnits, getProjects } from '../../http-service/onboardingApi';
import { ONBOARDING_ORG_ID } from '../../utils/constants';

// Helper to fetch Apigee token (no longer needed for env, but kept if other parts use it)
const fetchToken = async () => {
    try {
        const res = await fetch('https://forgegateway.probestack.io/apigee-wrapper/auth/apigee/token');
        if (!res.ok) throw new Error(`Token service error: ${res.status}`);
        const data = await res.json();
        return data.access_token;
    } catch (err) {
        console.error('Token fetch error:', err);
        return null;
    }
};

// Get user email from localStorage or fallback
const getUserId = () => localStorage.getItem('userEmail') || "admin@forgecrux.com";

// There is only one real Apigee org in play. Every option in the "Gateway Org"
// dropdown carries this as its value regardless of the label shown, so API
// calls built from selectedOrg always see this exact string.
const GATEWAY_ORG_NAME = 'gen-ai-poc-onboarding';

export const GatewayContextSelector = ({
    selectedOrg,
    setSelectedOrg,
    selectedBU,
    setSelectedBU,
    selectedProject: externalSelectedProject,
    setSelectedProject: externalSetSelectedProject,
    selectedEnv,
    setSelectedEnv,
    showEnv = true,
    apiBaseUrl = 'https://forgegateway.probestack.io/apigee-wrapper', // kept for backward compatibility
    gatewayApiBaseUrl = 'https://forgegateway.probestack.io/gatewayonboarding/api/v1', // new base for onboarding APIs
}) => {
    // { id, name } pairs: id is always GATEWAY_ORG_NAME (what API calls use),
    // name is the display label sourced from the onboarding hierarchy.
    const [organizations, setOrganizations] = useState([{ id: GATEWAY_ORG_NAME, name: GATEWAY_ORG_NAME }]);
    const [environments, setEnvironments] = useState([]);
    const [businessUnits, setBusinessUnits] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);
    const [loadingEnvs, setLoadingEnvs] = useState(false);
    const [loadingBUs, setLoadingBUs] = useState(false);
    const [loadingProjects, setLoadingProjects] = useState(false);

    // Project selection is controlled by the parent when it cares (e.g. to filter
    // Applications elsewhere); otherwise this component tracks it internally.
    const [internalSelectedProject, setInternalSelectedProject] = useState('');
    const selectedProject = externalSelectedProject !== undefined ? externalSelectedProject : internalSelectedProject;
    const setSelectedProject = externalSetSelectedProject || setInternalSelectedProject;

    const ALL_ENV = "ALL";
    const NOT_DEPLOYED = "NOT_DEPLOYED";

    // ---------- Organizations (user-specific) ----------
    // Disabled: this hit the legacy /gatewayonboarding gateway-organizations
    // endpoint. There is only one real Apigee org (GATEWAY_ORG_NAME above),
    // hardcoded instead of fetched.
    // const fetchOrganizations = async () => {
    //     setLoadingOrgs(true);
    //     try {
    //         const userEmail = getUserId();
    //         const response = await fetch(
    //             `${gatewayApiBaseUrl}/user/${encodeURIComponent(userEmail)}/gateway-organizations`
    //         );
    //         if (!response.ok) throw new Error(`HTTP ${response.status}`);
    //         const result = await response.json();
    //         if (result.status === 'SUCCESS' && result.data?.gatewayOrganizations) {
    //             const orgs = result.data.gatewayOrganizations;
    //             const orgNames = orgs
    //                 .map(o => o.name)
    //                 .sort((a, b) => (b?.toLowerCase() === 'forgesphere') - (a?.toLowerCase() === 'forgesphere'));
    //             const map = {};
    //             orgs.forEach(o => { map[o.name] = o.id; });
    //             setOrganizations(orgNames);
    //             setOrgNameToIdMap(map);
    //             if (!selectedOrg && orgNames[0]) setSelectedOrg(orgNames[0]);
    //         } else {
    //             setOrganizations([]);
    //         }
    //     } catch (err) {
    //         console.error('Error fetching gateway organizations:', err);
    //         setOrganizations([]);
    //     } finally {
    //         setLoadingOrgs(false);
    //     }
    // };

    // Display-only labels for the Gateway Org dropdown, sourced from the
    // onboarding hierarchy's organizationId. Every option's underlying value
    // stays GATEWAY_ORG_NAME (see the state above) — only the label differs.
    const deriveOrgLabelsFromBusinessUnits = (buList) => {
        const seen = new Set();
        const orgOptions = [];
        (buList || []).forEach((bu) => {
            const orgId = bu.organizationId || 'unorg';
            const label = orgId === ONBOARDING_ORG_ID ? 'ForgeCrux' : orgId;
            if (!seen.has(label)) {
                seen.add(label);
                orgOptions.push({ id: GATEWAY_ORG_NAME, name: label });
            }
        });
        setOrganizations(orgOptions.length ? orgOptions : [{ id: GATEWAY_ORG_NAME, name: GATEWAY_ORG_NAME }]);
    };

    // ---------- Business Units (sourced from the onboarding hierarchy; also drives the Org labels above) ----------
    const fetchBusinessUnits = async () => {
        setLoadingBUs(true);
        setLoadingOrgs(true);
        try {
            const buList = await getBusinessUnits(0, 200);
            setBusinessUnits(buList || []);
            deriveOrgLabelsFromBusinessUnits(buList);
            if (!selectedBU && buList?.[0]) {
                setSelectedBU(buList[0].id);
            }
        } catch (err) {
            console.error('Error fetching business units:', err);
            setBusinessUnits([]);
        } finally {
            setLoadingBUs(false);
            setLoadingOrgs(false);
        }
    };

    // ---------- Projects for the selected Business Unit ----------
    const fetchProjects = async (buId) => {
        if (!buId) { setProjects([]); return; }
        setLoadingProjects(true);
        try {
            const allProjects = await getProjects(0, 200);
            const scoped = (allProjects || []).filter((p) => p.businessUnitId === buId);
            setProjects(scoped);
            if (selectedProject && !scoped.some((p) => p.id === selectedProject)) {
                setSelectedProject('');
            }
        } catch (err) {
            console.error('Error fetching projects:', err);
            setProjects([]);
        } finally {
            setLoadingProjects(false);
        }
    };

    // ---------- Environments (same Apigee endpoint other Gateway pages already use) ----------
    const fetchEnvironments = async () => {
        setLoadingEnvs(true);
        try {
            const token = await fetchToken();
            const response = await fetch(
                `${apiBaseUrl}/organizations/${GATEWAY_ORG_NAME}/environments`,
                token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            setEnvironments(Array.isArray(data) ? data : (data.environments || []));
        } catch (err) {
            console.error('Error fetching environments:', err);
            setEnvironments([]);
        } finally {
            setLoadingEnvs(false);
        }
    };

    // Initial load: default the (hardcoded) org selection, then fetch business
    // units (business units come from the onboarding hierarchy) and environments
    useEffect(() => {
        if (!selectedOrg) setSelectedOrg(GATEWAY_ORG_NAME);
        fetchBusinessUnits();
        if (showEnv) fetchEnvironments();
    }, []);

    // When the Business Unit changes, load its Projects
    useEffect(() => {
        fetchProjects(selectedBU);
    }, [selectedBU]);

    // ---------- Reusable select renderer (defensive array check) ----------
    const renderSelect = ({ label, value, onChange, options, loading, disabled, placeholder, getOptionLabel, getOptionValue, minWidth = '180px' }) => {
        const safeOptions = Array.isArray(options) ? options : [];
        return (
            <div className="relative border border-[#2a3550] rounded-md bg-[#1a1f2e] focus-within:ring-1 focus-within:ring-[#ff5b1f] focus-within:border-[#ff5b1f] transition-all">
                <label className="absolute -top-2 left-3 px-1 text-xs font-medium text-slate-400 bg-[#1a1f2e] z-10">
                    {label}
                </label>
                <div className="relative">
                    <select
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full bg-transparent border-0 rounded-md px-3 py-2 pr-8 text-sm text-white focus:outline-none appearance-none cursor-pointer"
                        disabled={disabled || loading}
                        style={{ minWidth }}
                    >
                        <option value="" className="bg-[#1a1f2e] text-slate-400">{placeholder}</option>
                        {safeOptions.map(opt => (
                            <option key={getOptionValue(opt)} value={getOptionValue(opt)} className="bg-[#1a1f2e] text-white">
                                {getOptionLabel(opt)}
                            </option>
                        ))}
                    </select>
                    {!loading && (
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    )}
                    {loading && (
                        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex items-center gap-4 flex-wrap">
            {renderSelect({
                label: 'Gateway Org',
                value: selectedOrg,
                onChange: setSelectedOrg,
                options: organizations,
                loading: loadingOrgs,
                disabled: loadingOrgs,
                placeholder: 'Select Org',
                getOptionLabel: (org) => org.name,
                getOptionValue: (org) => org.id,
                minWidth: '180px',
            })}

            {renderSelect({
                label: 'BU Name',
                value: selectedBU,
                onChange: setSelectedBU,
                options: businessUnits,
                loading: loadingBUs,
                disabled: loadingBUs,
                placeholder: 'Select BU',
                getOptionLabel: (bu) => bu.displayName || bu.name,
                getOptionValue: (bu) => bu.id,
                minWidth: '180px',
            })}

            {renderSelect({
                label: 'Project',
                value: selectedProject,
                onChange: setSelectedProject,
                options: projects,
                loading: loadingProjects,
                disabled: loadingProjects || !selectedBU,
                placeholder: selectedBU ? 'Select Project' : 'Select a BU first',
                getOptionLabel: (p) => p.name,
                getOptionValue: (p) => p.id,
                minWidth: '180px',
            })}

            {/* {showEnv && renderSelect({
                label: 'Gateway Env',
                value: selectedEnv,
                onChange: setSelectedEnv,
                options: environments,
                loading: loadingEnvs,
                disabled: loadingEnvs || environments.length <= 1, // disable if only one option (read-only)
                placeholder: 'No environment',
                getOptionLabel: (env) => env,
                getOptionValue: (env) => env,
                minWidth: '140px',
            })} */}
            {showEnv && (
                <div className="relative border border-[#2a3550] rounded-md bg-[#1a1f2e] focus-within:ring-1 focus-within:ring-[#ff5b1f] focus-within:border-[#ff5b1f] transition-all">
                    <label className="absolute -top-2 left-3 px-1 text-xs font-medium text-slate-400 bg-[#1a1f2e] z-10">
                        Gateway Env
                    </label>
                    <div className="relative">
                        <select
                            value={selectedEnv || ''}
                            onChange={(e) => setSelectedEnv(e.target.value)}
                            className="w-full bg-transparent border-0 rounded-md px-3 py-2 pr-8 text-sm text-white focus:outline-none appearance-none cursor-pointer"
                            style={{ minWidth: '140px' }}
                        >
                            <option value={ALL_ENV} className="bg-[#1a1f2e] text-slate-200">All Environments</option>
                            <option value={NOT_DEPLOYED} className="bg-[#1a1f2e] text-slate-200">Not Deployed</option>
                            {Array.isArray(environments) && environments.map(env => (
                                <option key={env} value={env} className="bg-[#1a1f2e] text-white">
                                    {env}
                                </option>
                            ))}
                        </select>
                        {loadingEnvs && (
                            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                        )}
                        {!loadingEnvs && (
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};




// import React, { useState, useEffect } from 'react';
// import { ChevronDown, Loader2 } from 'lucide-react';
// import API_BASE_URL from '../../config/apiConfig';

// // Helper to fetch Apigee token (reuse from your app)
// const fetchToken = async () => {
//   try {
//     const res = await fetch('https://token-service-113875395623.us-central1.run.app/token');
//     if (!res.ok) throw new Error(`Token service error: ${res.status}`);
//     const data = await res.json();
//     return data.access_token;
//   } catch (err) {
//     console.error('Token fetch error:', err);
//     return null;
//   }
// };
// const getUserId = () => localStorage.getItem('userEmail') || "john.doe@example.com";

// export const GatewayContextSelector = ({
//   selectedOrg,
//   setSelectedOrg,
//   selectedBU,
//   setSelectedBU,
//   selectedEnv,
//   setSelectedEnv,
//   showEnv = true,
//   apiBaseUrl = 'https://forgegateway.probestack.io/apigee-wrapper', // configurable
// }) => {
//   const [organizations, setOrganizations] = useState([]);
//   const [environments, setEnvironments] = useState([]);
//   const [businessUnits, setBusinessUnits] = useState([]);
//   const [loadingOrgs, setLoadingOrgs] = useState(false);
//   const [loadingEnvs, setLoadingEnvs] = useState(false);
//   const [loadingBUs, setLoadingBUs] = useState(false);

//   const [orgNameToIdMap, setOrgNameToIdMap] = useState({});

//   const fetchOrganizations = async () => {
//     setLoadingOrgs(true);
//     try {
//       const userEmail = getUserId();
//       const response = await fetch(
//         `https://forgegateway.probestack.io/gatewayonboarding/api/v1/user/${encodeURIComponent(userEmail)}/gateway-organizations`
//       );
//       if (!response.ok) throw new Error(`HTTP ${response.status}`);
//       const result = await response.json();
//       if (result.status === 'SUCCESS' && result.data?.gatewayOrganizations) {
//         const orgs = result.data.gatewayOrganizations;
//         const orgNames = orgs.map(o => o.name);
//         const map = {};
//         orgs.forEach(o => { map[o.name] = o.id; });
//         setOrganizations(orgNames);
//         setOrgNameToIdMap(map);
//         if (!selectedOrg && orgNames[0]) setSelectedOrg(orgNames[0]);
//       } else {
//         setOrganizations([]);
//       }
//     } catch (err) {
//       console.error('Error fetching gateway organizations:', err);
//       setOrganizations([]);
//     } finally {
//       setLoadingOrgs(false);
//     }
//   };

//   // --- NEW: Fetch business units using selected org name -> id ---
//   const fetchBusinessUnits = async (orgName) => {
//     if (!orgName) return;
//     const orgId = orgNameToIdMap[orgName];
//     if (!orgId) return;
//     setLoadingBUs(true);
//     try {
//       const response = await fetch(
//         `https://forgegateway.probestack.io/gatewayonboarding/api/v1/gateway-organizations/${orgId}/business-units`
//       );
//       if (!response.ok) throw new Error(`HTTP ${response.status}`);
//       const result = await response.json();
//       if (result.status === 'SUCCESS' && result.data?.businessUnits) {
//         setBusinessUnits(result.data.businessUnits);
//         if (!selectedBU && result.data.businessUnits[0]) {
//           setSelectedBU(result.data.businessUnits[0].id);
//         }
//       } else {
//         setBusinessUnits([]);
//       }
//     } catch (err) {
//       console.error('Error fetching BUs:', err);
//       setBusinessUnits([]);
//     } finally {
//       setLoadingBUs(false);
//     }
//   };

//   // --- Fetch environments (unchanged, but ensure array) ---
//   const fetchEnvironments = async (org) => {
//     if (!org) return;
//     setLoadingEnvs(true);
//     try {
//       const token = await fetchToken();
//       if (!token) return;
//       const res = await fetch(`${apiBaseUrl}/organizations/${org}/environments`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       // Ensure environments is always an array
//       let envs = Array.isArray(data) ? data : (data.environments || []);
//       setEnvironments(envs);
//       if (!selectedEnv && envs[0]) setSelectedEnv(envs[0]);
//     } catch (err) {
//       console.error(err);
//       setEnvironments([]);
//     } finally {
//       setLoadingEnvs(false);
//     }
//   };

//   // Initial load
//   useEffect(() => {
//     fetchOrganizations();
//   }, []);

//   // When org changes, fetch environments and BUs
//   useEffect(() => {
//     if (selectedOrg) {
//       fetchEnvironments(selectedOrg);
//     //   fetchBusinessUnits(selectedOrg);
//     }
//   }, [selectedOrg]);
//   useEffect(() => {
//   if (selectedOrg && orgNameToIdMap[selectedOrg]) {
//     fetchBusinessUnits(selectedOrg);
//   }
// }, [selectedOrg, orgNameToIdMap]);

//   // Defensive renderSelect – ensures options is always an array
//   const renderSelect = ({ label, value, onChange, options, loading, disabled, placeholder, getOptionLabel, getOptionValue, minWidth = '180px' }) => {
//     const safeOptions = Array.isArray(options) ? options : [];
//     return (
//       <div className="relative border border-[#2a3550] rounded-md bg-[#0f1117] focus-within:ring-1 focus-within:ring-[#ff5b1f] focus-within:border-[#ff5b1f] transition-all">
//         <label className="absolute -top-2 left-3 px-1 text-xs font-medium text-slate-400 bg-[#0f1117] z-10">
//           {label}
//         </label>
//         <div className="relative">
//           <select
//             value={value || ''}
//             onChange={(e) => onChange(e.target.value)}
//             className="w-full bg-transparent border-0 rounded-md px-3 py-2 pr-8 text-sm text-white focus:outline-none appearance-none cursor-pointer"
//             disabled={disabled || loading}
//             style={{ minWidth }}
//           >
//             <option value="" className="bg-[#0f1117] text-slate-400">{placeholder}</option>
//             {safeOptions.map(opt => (
//               <option key={getOptionValue(opt)} value={getOptionValue(opt)} className="bg-[#1a1f2e] text-white">
//                 {getOptionLabel(opt)}
//               </option>
//             ))}
//           </select>
//           {!loading && (
//             <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
//           )}
//           {loading && (
//             <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
//           )}
//         </div>
//       </div>
//     );
//   };

//   // Fetch organizations
// //   const fetchOrganizations = async () => {
// //     setLoadingOrgs(true);
// //     try {
// //       const token = await fetchToken();
// //       if (!token) return;
// //       const res = await fetch(`${apiBaseUrl}/organizations`, {
// //         headers: { Authorization: `Bearer ${token}` },
// //       });
// //       const data = await res.json();
// //       let orgs = data.organizations?.map(o => o.organization).filter(Boolean) || [];
// //       if (orgs.length === 0) orgs = ['gen-ai-poc-onboarding'];
// //       setOrganizations(orgs);
// //       if (!selectedOrg && orgs[0]) setSelectedOrg(orgs[0]);
// //     } catch (err) {
// //       console.error(err);
// //       setOrganizations(['gen-ai-poc-onboarding']);
// //     } finally {
// //       setLoadingOrgs(false);
// //     }
// //   };

// //   // Fetch environments for selected organization
// //   const fetchEnvironments = async (org) => {
// //     if (!org) return;
// //     setLoadingEnvs(true);
// //     try {
// //       const token = await fetchToken();
// //       if (!token) return;
// //       const res = await fetch(`${apiBaseUrl}/organizations/${org}/environments`, {
// //         headers: { Authorization: `Bearer ${token}` },
// //       });
// //       const data = await res.json();
// //       setEnvironments(data);
// //       if (!selectedEnv && data[0]) setSelectedEnv(data[0]);
// //     } catch (err) {
// //       console.error(err);
// //       setEnvironments([]);
// //     } finally {
// //       setLoadingEnvs(false);
// //     }
// //   };

// //   // Fetch business units from backend and filter by selected organization
// //   const fetchBusinessUnits = async (org) => {
// //     if (!org) return;
// //     setLoadingBUs(true);
// //     try {
// //       const res = await fetch(`${API_BASE_URL || 'http://localhost:8080'}/gatewayonboarding/api/v1/business-units`);
// //       const result = await res.json();
// //       const allBUs = result.data || [];
// //       // Filter BUs that belong to the selected organization (adjust field name as needed)
// //       const filtered = allBUs.filter(bu => bu.gatewayOrgName === org);
// //       setBusinessUnits(filtered);
// //       if (!selectedBU && filtered[0]) setSelectedBU(filtered[0].id);
// //     } catch (err) {
// //       console.error('Error fetching BUs:', err);
// //       setBusinessUnits([]);
// //     } finally {
// //       setLoadingBUs(false);
// //     }
// //   };

// //   // Initial load
// //   useEffect(() => {
// //     fetchOrganizations();
// //   }, []);

// //   // When org changes, fetch environments and BUs
// //   useEffect(() => {
// //     if (selectedOrg) {
// //       fetchEnvironments(selectedOrg);
// //       fetchBusinessUnits(selectedOrg);
// //     }
// //   }, [selectedOrg]);
// //   const renderSelect = ({ label, value, onChange, options, loading, disabled, placeholder, getOptionLabel, getOptionValue, minWidth = '180px' }) => (
// //     <div className="relative border border-[#2a3550] rounded-md bg-[#0f1117] focus-within:ring-1 focus-within:ring-[#ff5b1f] focus-within:border-[#ff5b1f] transition-all">
// //       <label className="absolute -top-2 left-3 px-1 text-xs font-medium text-slate-400 bg-[#0f1117] z-10">
// //         {label}
// //       </label>
// //       <div className="relative">
// //         <select
// //           value={value || ''}
// //           onChange={(e) => onChange(e.target.value)}
// //           className="w-full bg-transparent border-0 rounded-md px-3 py-2 pr-8 text-sm text-white focus:outline-none appearance-none cursor-pointer"
// //           disabled={disabled || loading}
// //           style={{ minWidth }}
// //         >
// //           <option value="" className="bg-[#0f1117] text-slate-400">{placeholder}</option>
// //           {options.map(opt => (
// //             <option key={getOptionValue(opt)} value={getOptionValue(opt)} className="bg-[#1a1f2e] text-white">
// //               {getOptionLabel(opt)}
// //             </option>
// //           ))}
// //         </select>
// //         {!loading && (
// //           <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
// //         )}
// //         {loading && (
// //           <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
// //         )}
// //       </div>
// //     </div>
// //   );

//   return (
//     <div className="flex items-center gap-4 flex-wrap">
//       {renderSelect({
//         label: 'Gateway Org',
//         value: selectedOrg,
//         onChange: setSelectedOrg,
//         options: organizations,
//         loading: loadingOrgs,
//         disabled: loadingOrgs,
//         placeholder: 'Select Org',
//         getOptionLabel: (org) => org,
//         getOptionValue: (org) => org,
//         minWidth: '180px',
//       })}

//       {renderSelect({
//         label: 'BU Name',
//         value: selectedBU,
//         onChange: setSelectedBU,
//         options: businessUnits,
//         loading: loadingBUs,
//         disabled: loadingBUs,
//         placeholder: 'Select BU',
//         getOptionLabel: (bu) => bu.teamName,
//         getOptionValue: (bu) => bu.id,
//         minWidth: '180px',
//       })}

//       {showEnv && renderSelect({
//         label: 'Gateway Env',
//         value: selectedEnv,
//         onChange: setSelectedEnv,
//         options: environments,
//         loading: loadingEnvs,
//         disabled: loadingEnvs,
//         placeholder: 'Select Env',
//         getOptionLabel: (env) => env,
//         getOptionValue: (env) => env,
//         minWidth: '140px',
//       })}
//     </div>
//     // <div className="flex items-center gap-3 flex-wrap">
//     //   {/* Gateway Organization */}
//     //   <div className="relative">
//     //     <select
//     //       value={selectedOrg || ''}
//     //       onChange={(e) => setSelectedOrg(e.target.value)}
//     //       className="bg-[#1a1f2e] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#ff5b1f] min-w-[140px]"
//     //       disabled={loadingOrgs}
//     //     >
//     //       <option value="">Gateway Org</option>
//     //       {organizations.map(org => (
//     //         <option key={org} value={org}>{org}</option>
//     //       ))}
//     //     </select>
//     //     {loadingOrgs && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
//     //   </div>

//     //   {/* Business Unit */}
//     //   <div className="relative">
//     //     <select
//     //       value={selectedBU || ''}
//     //       onChange={(e) => setSelectedBU(e.target.value)}
//     //       className="bg-[#1a1f2e] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#ff5b1f] min-w-[140px]"
//     //       disabled={loadingBUs}
//     //     >
//     //       <option value="">BU Name</option>
//     //       {businessUnits.map(bu => (
//     //         <option key={bu.id} value={bu.id}>{bu.teamName}</option>
//     //       ))}
//     //     </select>
//     //     {loadingBUs && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
//     //   </div>

//     //   {/* Gateway Environment (optional) */}
//     //   {showEnv && (
//     //     <div className="relative">
//     //       <select
//     //         value={selectedEnv || ''}
//     //         onChange={(e) => setSelectedEnv(e.target.value)}
//     //         className="bg-[#1a1f2e] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#ff5b1f] min-w-[140px]"
//     //         disabled={loadingEnvs}
//     //       >
//     //         <option value="">Gateway Env</option>
//     //         {environments.map(env => (
//     //           <option key={env} value={env}>{env}</option>
//     //         ))}
//     //       </select>
//     //       {loadingEnvs && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
//     //     </div>
//     //   )}
//     // </div>
//   );
// };