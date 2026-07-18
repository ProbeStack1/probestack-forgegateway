import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  FileChartColumnIncreasing,
  FileX,
  GitBranch,
  KeyRound,
  Network,
  Plug,
  Route,
  Server,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import SpecServiceSteps from "../Steps/SpecServiceSteps";
import Services from "../Kong/Services/Services";
import Routes from "../Kong/Routes/Routes";
import Plugins from "../Kong/Plugins/Plugins";
import Consumer from "../Kong/Consumers/Consumer";
import Upstream from "../Kong/Upstream/Upstream";
import Vaults from "../Kong/Vaults/Vaults";
import TLSCertificates from "../Kong/TLS/TLSCertificates";
import CACertificates from "../Kong/CA/CACertificates";
import RedisConfig from "../Kong/RedisConfig/RedisConfig";
import ExistingOnboardingModal from "../Steps/ExistingOnboardingModal";
import OnboardingCascadeSelect from "../Apigee/components/OnboardingCascadeSelect";
import { getKongControlPlaneId } from "../../config/kongConfig";
import {
  loadKongOnboardingOptions,
} from "../Kong/kongTracking";

const GatewayServices = (props) => {
  const getInitialView = () => {
    if (props.startInGatewayBuilder) return "MANUAL";
    if (props.startInSpecFlow) return "SPEC_FLOW";
    return "HOME";
  };

  const [view, setView] = useState(getInitialView);
  // HOME | SPEC_FLOW | MANUAL
  const [manualResource, setManualResource] = useState("Services");
  const [autoSpecFlowApplied, setAutoSpecFlowApplied] = useState(Boolean(props.startInSpecFlow));
  const [autoGatewayBuilderApplied, setAutoGatewayBuilderApplied] = useState(Boolean(props.startInGatewayBuilder));

  const [showExistingOnboardingModal, setShowExistingOnboardingModal] = useState(false);

  useEffect(() => {
    if (props.startInGatewayBuilder && !autoGatewayBuilderApplied) {
      setView("MANUAL");
      setAutoGatewayBuilderApplied(true);
      return;
    }

    if (props.startInSpecFlow && !autoSpecFlowApplied) {
      setView("SPEC_FLOW");
      setAutoSpecFlowApplied(true);
    }

    if (!props.startInSpecFlow && autoSpecFlowApplied) {
      setAutoSpecFlowApplied(false);
    }

    if (!props.startInGatewayBuilder && autoGatewayBuilderApplied) {
      setAutoGatewayBuilderApplied(false);
    }
  }, [autoGatewayBuilderApplied, autoSpecFlowApplied, props.startInGatewayBuilder, props.startInSpecFlow]);

  // const handleProceed = () => {
  //   setShowExistingOnboardingModal(false);
  //   setView("SPEC_FLOW");
  // };

  const handleProceed = async () => {
    if (!props.selectedExistingApp || !props.selectedExistingSpec) return;

    let microserviceId = props.selectedExistingSpec.id;

    const result = await props.onboardingService.getOnboardingById(microserviceId);

    if (!result.success) {
      showMessage(result.error, "error");
      return;
    }

    const d = result.data?.data?.microservice || result.data?.microservice || {};
    const req = result.data?.data?.requirement || result.data?.requirement || {};
    const design = result.data?.data?.apiDesign || result.data?.apiDesign || null;
    const consumers =
      result.data?.data?.consumerInformation ||
      result.data?.consumerInformation ||
      [];

    // Microservice details
    props.setOnboardingTeamName?.(d.teamName || "");
    props.setOnboardingApplicationName?.(d.applicationName || "");
    props.setOnboardingApplicationId?.(d.applicationId || "");
    props.setOnboardingBusinessUnit?.(d.businessUnit || "");
    props.setOnboardingProjectOwner?.(d.projectOwner || "");
    props.setOnboardingOwnerEmail?.(d.ownerEmail || "");
    props.setOnboardingProjectSME?.(d.projectSME || "");
    props.setOnboardingProjectSMEEmail?.(d.projectSMEEmail || "");
    props.setOnboardingProjectDLEmail?.(d.projectDLEmail || "");
    props.setOnboardingGoLiveDate?.(d.expectedGoLiveDate || "");
    props.setOnboardingTesterName?.(d.testerName || "");
    props.setOnboardingTesterEmail?.(d.testerEmail || "");
    props.setOnboardingServiceNowGroup?.(d.serviceNowGroupName || "");
    props.setOnboardingServiceNowEmail?.(d.serviceNowEmail || "");
    props.setOnboardingId?.(d.id || null);
    props.setExistingConfigId?.(d.connectorId || null);

    // Consumers
    props.setSelectedOnboardingConsumers?.(consumers.map((c) => c.id));

    // Requirements
    if (req.functionalRequirements) {
      props.setFunctionalReqs?.(req.functionalRequirements);
    }
    if (req.nonFunctionalRequirements) {
      props.setNonFunctionalReqs?.(req.nonFunctionalRequirements);
    }

    // API Design
    if (design?.specMetadata) {
      const spec = {
        id: design.specMetadata.id,
        name: design.specMetadata.fileName,
        specName: design.specMetadata.specName,
        source: "template",
      };

      props.setProxyDesignSelectedSpec?.(spec);
      props.setProxySelectedDesignSpecs?.([spec.id]);

      localStorage.setItem(
        "probeStack_proxyDesignSelectedSpec",
        JSON.stringify(spec)
      );
      localStorage.setItem(
        "probeStack_proxySelectedDesignSpecs",
        JSON.stringify([spec.id])
      );
    }

    // Cleanup + Navigation
    setShowExistingOnboardingModal(false);
    props.setSelectedExistingApp?.(null);
    props.setSelectedExistingSpec?.(null);
    props.setExistingAppOnboarding?.([]);

    showMessage(
      `Loaded onboarding data for ${d.applicationName || props.selectedExistingApp
      }`,
      "success"
    );

    // go to next screen
    setView("SPEC_FLOW");
  };

  const showMessage = useCallback((text, type = "success") => {
    props.setMessage({ text, type });
    props.setToast({ message: text, type });
  }, [props.setMessage, props.setToast]);

  let content;

  if (view === "SPEC_FLOW") {
    content = (
      <SpecServiceSteps
        {...props}
        onBack={() => setView("HOME")}
      />
    );
  } else if (view === "MANUAL") {
    content = (
      <GatewayBuilder
        {...props}
        onBack={() => setView("HOME")}
        selectedResource={manualResource}
        onSelectResource={setManualResource}
      />
    );
  } else {
    content = (
      <div className="flex justify-center items-center min-h-[70vh] px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">

          {/* Spec2Service */}
          <Card className="rounded-2xl shadow-md hover:shadow-lg transition-all border">
            <CardContent className="p-6 flex flex-col justify-between h-full text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 rounded-2xl border border-primary bg-dark-100">
                  <FileChartColumnIncreasing size={32} />
                </div>
                <h2 className="text-lg font-semibold">Spec2Service Builder</h2>
                <p className="text-sm text-gray-500 max-w-[220px]">
                  Create a Kong Service using OpenAPI Specification
                </p>
              </div>
              <Button
                className="mt-6 w-full"
                onClick={() => {
                  if (props.onboardingId || props.onboardingContextId) {
                    setView("SPEC_FLOW");
                    return;
                  }

                  setShowExistingOnboardingModal(true);
                  props.setIsFetchingAppNames(true);

                  props.onboardingService
                    .getApplicationNames(props.getProjectType())
                    .then((result) => {
                      if (result.success) {
                        const names = result.data?.data || result.data || [];
                        props.setExistingAppNames(Array.isArray(names) ? names : []);
                      } else {
                        showMessage(result.error, "error");
                      }
                    })
                    .finally(() => {
                      props.setIsFetchingAppNames(false);
                    });
                }}
              >
                Get Started
              </Button>
            </CardContent>
          </Card>

          {/* Manual */}
          <Card className="rounded-2xl shadow-md hover:shadow-lg transition-all border">
            <CardContent className="p-6 flex flex-col justify-between h-full text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 rounded-2xl border border-primary bg-dark-100">
                  <FileX size={32} />
                </div>
                <h2 className="text-lg font-semibold">Gateway Builder</h2>
                <p className="text-sm text-gray-500 max-w-[220px]">
                  Manage services, routes, plugins, consumers, upstreams, and gateway configuration
                </p>
              </div>

              <Button
                className="mt-6 w-full"
                onClick={() => setView("MANUAL")}
              >
                Get Started
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    );
  }

  return (
    <>
      {content}

      {showExistingOnboardingModal && (
        <ExistingOnboardingModal
          {...props}
          onClose={() => {
            setShowExistingOnboardingModal(false);
            props.setSelectedExistingApp?.(null);
            props.setSelectedExistingSpec?.(null);
          }}
          handleProceed={handleProceed}
          showMessage={showMessage}
        />
      )}
    </>
  );
};

function GatewayBuilder({ selectedResource, onSelectResource, onBack, onOpenKongConfig, ...props }) {
  const configAutoOpenedRef = useRef(false);
  const [kongOnboardingOptions, setKongOnboardingOptions] = useState([]);
  const [isFetchingKongOnboardings, setIsFetchingKongOnboardings] = useState(false);
  const [kongOnboardingError, setKongOnboardingError] = useState("");
  const [selectedKongOnboardingId, setSelectedKongOnboardingId] = useState("");
  const [selectedKongOnboarding, setSelectedKongOnboarding] = useState(null);

  useEffect(() => {
    if (configAutoOpenedRef.current || getKongControlPlaneId()) {
      return;
    }

    configAutoOpenedRef.current = true;
    onOpenKongConfig?.();
  }, [onOpenKongConfig]);

  useEffect(() => {
    let isMounted = true;

    setIsFetchingKongOnboardings(true);
    setKongOnboardingError("");

    loadKongOnboardingOptions()
      .then((options) => {
        if (!isMounted) return;

        setKongOnboardingOptions(options);

      })
      .catch((error) => {
        if (!isMounted) return;
        setKongOnboardingError(error.message || "Failed to load Kong onboarding contexts");
      })
      .finally(() => {
        if (isMounted) {
          setIsFetchingKongOnboardings(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleKongOnboardingChange = useCallback((onboardingId, option) => {
    setSelectedKongOnboardingId(onboardingId || "");
    setSelectedKongOnboarding(option || null);
  }, []);

  const resources = [
    { id: "Services", label: "Services", description: "Create and manage Kong gateway services.", icon: Server },
    { id: "Routes", label: "Routes", description: "Configure route matching and traffic entry points.", icon: Route },
    { id: "Plugins", label: "Plugins", description: "Attach auth, traffic, and security plugins.", icon: Plug },
    { id: "Consumers", label: "Consumers", description: "Manage gateway consumers and credentials.", icon: Users },
    { id: "Upstream Services", label: "Upstreams", description: "Manage upstream targets and load balancing.", icon: Network },
    { id: "Vaults", label: "Vaults", description: "Store and reference gateway secrets.", icon: KeyRound },
    { id: "CA Certificates", label: "CA Certificates", description: "Manage trusted certificate authorities.", icon: ShieldCheck },
    { id: "TLS Certificates", label: "TLS Certificates", description: "Manage TLS certificates for gateway traffic.", icon: ShieldCheck },
    { id: "Redis Configurations", label: "Redis", description: "Configure Redis-backed gateway capabilities.", icon: GitBranch },
  ];

  const renderSelectedResource = () => {
    const resourceProps = {
      ...props,
      selectedKongOnboardingId,
      selectedKongOnboarding,
    };

    switch (selectedResource) {
      case "Routes":
        return <Routes {...resourceProps} />;
      case "Plugins":
        return <Plugins {...resourceProps} />;
      case "Consumers":
        return <Consumer {...resourceProps} />;
      case "Upstream Services":
        return <Upstream {...resourceProps} />;
      case "Vaults":
        return <Vaults {...resourceProps} />;
      case "TLS Certificates":
        return <TLSCertificates {...resourceProps} />;
      case "CA Certificates":
        return <CACertificates {...resourceProps} />;
      case "Redis Configurations":
        return <RedisConfig {...resourceProps} />;
      case "Services":
      default:
        return <Services {...resourceProps} />;
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Gateway Builder</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Gateway Configuration</h1>
          <p className="mt-1 text-sm text-slate-400">
            Build and manage the Kong resources that support this gateway service.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
          onClick={onOpenKongConfig}
        >
          <Settings className="mr-2 h-4 w-4" />
          Config
        </Button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#11182c]/80 p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Onboarding Context</p>
            <p className="mt-1 text-sm text-slate-400">
              Select all three fields to filter the Kong resource list by onboarding application.
            </p>
          </div>
        </div>
        <OnboardingCascadeSelect
          value={selectedKongOnboardingId}
          onChange={handleKongOnboardingChange}
          options={kongOnboardingOptions}
          isLoading={isFetchingKongOnboardings}
          required
          selectClassName="w-full rounded-lg border border-white/10 bg-[#1f2937] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        />
        {kongOnboardingError && (
          <p className="mt-3 text-sm text-red-400">{kongOnboardingError}</p>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-white/10 bg-[#11182c]/80 p-3">
          <div className="mb-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Resources
          </div>
          <div className="max-h-[calc(100vh-335px)] space-y-2 overflow-y-auto pr-2 [scrollbar-color:rgba(71,85,105,0.75)_transparent] [scrollbar-width:thin]">
            {resources.map(({ id, label, description, icon: Icon }) => {
              const active = selectedResource === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectResource(id)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                    active
                      ? "border-primary/40 bg-primary/10 text-white"
                      : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 ${active ? "text-primary" : "text-slate-500"}`} />
                  <span className="min-w-0">
                    <span className={`block text-sm font-semibold ${active ? "text-primary" : "text-slate-200"}`}>{label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a]/70">
          {renderSelectedResource()}
        </section>
      </div>
    </div>
  );
}

export default GatewayServices;
