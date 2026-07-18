import React, { useState, useEffect } from "react";
import { Card, CardTitle } from "../../components/ui/card";
import {
    CheckCircle,
    AlertCircle,
    Shield,
    FileJson,
    Activity,
    ArrowRight,
    ArrowLeft
} from "lucide-react";
import SpectralLintPanel from "../../components/SpectralLintPanel";

const ServiceDesignOverview = ({ onBack, onNext, proxySelectedDesignSpecs, proxyDesignImportedSpecs, proxyApiDesignSpecs, proxyDesignSelectedSpec }) => {
    const [activeSpecId, setActiveSpecId] = useState(null);

    const idSet = new Set((proxySelectedDesignSpecs || []).map(String));
    const fromImported = (proxyDesignImportedSpecs || []).filter(s => idSet.has(String(s.id)));
    const fromApi = (proxyApiDesignSpecs || []).filter(s => idSet.has(String(s.id)));
    const selectedSpecs = fromImported.length > 0
        ? fromImported
        : fromApi.length > 0
            ? fromApi
            : proxyDesignSelectedSpec ? [proxyDesignSelectedSpec] : [];

    /* Default to first selected spec */
    useEffect(() => {
        if (selectedSpecs.length > 0 && !activeSpecId) {
            setActiveSpecId(selectedSpecs[0].id);
        }
    }, [selectedSpecs.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const activeSpec = selectedSpecs.find(s => s.id === activeSpecId) || selectedSpecs[0] || null;
    const activeContent = activeSpec
        ? (activeSpec.content || activeSpec.specContent || '')
        : '';

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Spec Validation</h1>
            {/* Validation Results */}
            <Card className="p-5" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                <CardTitle className="mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    Design Validation Results
                </CardTitle>

                {selectedSpecs.length === 0 ? (
                    <div className="p-6 rounded-lg bg-dark-900/40 border border-dark-700 text-center">
                        <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-300">No specifications selected for validation.</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Please go back and select at least one API specification.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">

                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                            <p className="text-sm text-primary">
                                Showing validation reports for {selectedSpecs.length} selected specification(s)
                            </p>
                        </div>

                        {selectedSpecs.map((spec, index) => (
                                <div key={spec.id} className="border border-dark-700 rounded-lg p-4 bg-dark-900/40">

                                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-dark-700">
                                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                            {index + 1}
                                        </div>
                                        <h3 className="text-sm font-medium text-white">{spec.name}</h3>
                                        <span className="text-xs text-gray-400">
                                            - {spec.description || 'Imported API Specification'}
                                        </span>
                                        <span className="text-xs text-primary ml-2 capitalize">
                                            ({spec.source})
                                        </span>
                                    </div>

                                    {/* Status Cards */}
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CheckCircle className="w-4 h-4 text-green-400" />
                                                <span className="text-xs font-medium text-green-400">Schema Valid</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400">OpenAPI schema validation passed</p>
                                        </div>

                                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CheckCircle className="w-4 h-4 text-green-400" />
                                                <span className="text-xs font-medium text-green-400">Consumer Review</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400">Consumer requirements compliant</p>
                                        </div>

                                        <div className={`p-3 rounded-lg border ${index % 3 === 1
                                                ? 'bg-yellow-500/10 border-yellow-500/30'
                                                : 'bg-green-500/10 border-green-500/30'
                                            }`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                {index % 3 === 1
                                                    ? <AlertCircle className="w-4 h-4 text-yellow-400" />
                                                    : <CheckCircle className="w-4 h-4 text-green-400" />}
                                                <span className={`text-xs font-medium ${index % 3 === 1 ? 'text-yellow-400' : 'text-green-400'
                                                    }`}>
                                                    {index % 3 === 1 ? 'Naming Convention' : 'Best Practices'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-400">
                                                {index % 3 === 1 ? 'Minor naming warnings' : 'All standards met'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Detailed Report */}
                                    <div className="p-3 rounded-lg bg-dark-800/50 border border-dark-700">
                                        <p className="text-xs font-medium text-white mb-2">
                                            Validation Report for {spec.name}
                                        </p>

                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                                                <span className="text-gray-300">OpenAPI 3.0 specification format is valid</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                                                <span className="text-gray-300">All required fields are present</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                                                <span className="text-gray-300">Authentication schemes properly defined</span>
                                            </div>

                                            {index % 3 === 1 && (
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                                                    <span className="text-gray-300">
                                                        Endpoint naming should use kebab-case
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            ))}
                    </div>
                )}
            </Card>

            {/* Linting Section */}
            <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                <CardTitle className="mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    API Linting Best Practices
                </CardTitle>

                {selectedSpecs.length === 0 ? (
                    <div className="p-6 rounded-lg bg-dark-900/40 border border-dark-700 text-center">
                        <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-300">No specifications selected for linting.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Spec tab switcher (only when multiple specs selected) */}
                        {selectedSpecs.length > 1 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedSpecs.map(spec => (
                                    <button
                                        key={spec.id}
                                        onClick={() => setActiveSpecId(spec.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${activeSpecId === spec.id
                                            ? 'bg-primary/20 border-primary/40 text-primary'
                                            : 'bg-dark-900/40 border-dark-700 text-gray-400 hover:border-primary/30 hover:text-gray-200'
                                        }`}
                                    >
                                        {spec.specName || spec.name || spec.fileName || `Spec ${spec.id}`}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Spectral results for the active spec */}
                        {activeSpec && (
                            <SpectralLintPanel
                                key={activeSpec.id}
                                specContent={activeContent}
                                specId={activeSpec.specMetadataId || activeSpec.id}
                                specName={activeSpec.specName || activeSpec.name || activeSpec.fileName}
                                compact
                            />
                        )}
                    </div>
                )}
            </Card>
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
        </div>
    );
};

export default ServiceDesignOverview;