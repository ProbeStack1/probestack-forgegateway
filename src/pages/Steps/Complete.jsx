import React from "react";
import { Card, CardTitle } from "../../components/ui/card";
import { ArrowLeft, ArrowRight, CheckCircle, FileText } from "lucide-react";

const Complete = ({
    onBack,onNext,
    selectedGateway,
    selectedFramework,

    // Kong response
    kongApiResponse,

    // Spec
    proxyDesignSelectedSpec,
    proxyDesignImportMode,

    // Config
    proxyName,
    basePath,
    targetUrl,

    // Import
    importSource,
    specFile,
    urlInput,

    // Policies (non-kong)
    policies
}) => {
    return (
        <Card className="p-8 text-center bg-[#161b30]">
            <div className="space-y-6">

                {/* Success Icon */}
                <div className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-green-400" />
                </div>

                {/* Header */}
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Generation Complete!
                    </h2>
                    <p className="text-gray-400">
                        {selectedGateway === "Kong"
                            ? "Your service has been generated and deployed successfully."
                            : "Your proxy has been successfully generated and is ready for deployment."}
                    </p>
                </div>

                {/* Kong Deployment Summary */}
                {selectedGateway === "Kong" &&
                    kongApiResponse?.success && (
                        <Card className="p-6 text-left bg-green-500/10 border border-green-500/30">
                            <h3 className="text-lg text-white mb-3">Deployment Summary</h3>

                            <div className="text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Spec Title:</span>
                                    <span className="text-white">{kongApiResponse.specTitle}</span>
                                </div>

                                {kongApiResponse.services?.map((service, idx) => (
                                    <div key={idx} className="pt-2 border-t border-green-500/20">
                                        <div className="flex justify-between">
                                            <span>Service Name:</span>
                                            <span>{service.serviceName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Routes:</span>
                                            <span>{service.routeIds?.length || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Plugins:</span>
                                            <span>{service.pluginIds?.length || 0}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                {/* MAIN SUMMARY */}
                <Card className="p-6 text-left bg-[#1a1f35]">
                    <CardTitle className="mb-4 flex items-center gap-2 text-lg">
                        <FileText className="w-5 h-5 text-primary" />
                        Generation Summary
                    </CardTitle>

                    <div className="grid md:grid-cols-2 gap-6 text-sm">

                        {/* Spec */}
                        <div>
                            <h3 className="text-primary text-xs mb-2 uppercase">
                                Specification
                            </h3>
                            <p>Name: {proxyDesignSelectedSpec?.name || "N/A"}</p>
                            <p>Source: {proxyDesignSelectedSpec?.source || "N/A"}</p>
                            <p>Mode: {proxyDesignImportMode}</p>
                        </div>

                        {/* Platform */}
                        <div>
                            <h3 className="text-primary text-xs mb-2 uppercase">
                                Platform
                            </h3>
                            <p>
                                {selectedGateway === "Kong"
                                    ? "Kong Konnect"
                                    : selectedFramework}
                            </p>
                        </div>

                        {/* Config */}
                        <div>
                            <h3 className="text-primary text-xs mb-2 uppercase">
                                Configuration
                            </h3>
                            <p>Name: {proxyName}</p>
                            <p>Path: {basePath}</p>
                            <p>Target: {targetUrl}</p>
                        </div>

                        {/* Import */}
                        <div>
                            <h3 className="text-primary text-xs mb-2 uppercase">
                                Import
                            </h3>
                            <p>Source: {importSource}</p>
                            {specFile && <p>File: {specFile.name}</p>}
                            {urlInput && <p>URL: {urlInput}</p>}
                        </div>

                        {/* Plugins / Policies */}
                        <div className="md:col-span-2">
                            <h3 className="text-primary text-xs mb-2 uppercase">
                                {selectedGateway === "Kong" ? "Plugins" : "Policies"}
                            </h3>

                            {selectedGateway === "Kong" ? (
                                kongApiResponse?.services?.[0]?.pluginIds?.length ? (
                                    kongApiResponse.services[0].pluginIds.map((id, i) => (
                                        <p key={id}>{i + 1}. {id}</p>
                                    ))
                                ) : (
                                    <p className="text-gray-500">No plugins configured</p>
                                )
                            ) : (
                                policies?.length ? (
                                    policies.map((p, i) => (
                                        <p key={p.id}>
                                            {i + 1}. {p.name} ({p.enabled ? "Enabled" : "Disabled"})
                                        </p>
                                    ))
                                ) : (
                                    <p className="text-gray-500">No policies configured</p>
                                )
                            )}
                        </div>

                    </div>
                </Card>
            </div>
            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6 pt-6 border-t border-dark-700">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-6 py-2 rounded-lg font-semibold text-sm transition-all bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-600 flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    className="px-6 py-2 rounded-lg font-semibold text-sm transition-all bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 flex items-center gap-2"
                >
                    Next
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </Card>
    );
};

export default Complete;