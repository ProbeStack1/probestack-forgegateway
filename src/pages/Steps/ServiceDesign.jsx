import { ArrowLeft, ArrowRight, Download, FileCode, PenTool, Plus } from "lucide-react";
import { apiDesignService } from "../../services/apiDesignService";
import { Card, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import { useCallback, useEffect } from "react";

const ServiceDesign = ({
    onBack,
    onNext,
    setProxyApiDesignSpecs,
    setBusy,
    proxyDesignFileInputRef,
    proxyDesignUrlInput,
    proxyApiDesignSpecs,
    proxyDesignSelectedSpec,
    setProxyDesignImportMode,
    proxyDesignImportMode,
    setProxyShowForgeStudioModal,
    setProxyDesignUrlInput,
    onboardingId,
    onboardingContextId,
    onboardingService,
    setOnboardingId,
    setMessage,
    setToast,
    setProxyDesignSelectedSpec,
    setProxySelectedDesignSpecs,
    setProxyDesignImportedSpecs,
}) => {
    const showMessage = useCallback((text, type = 'success') => {
        setMessage({ text, type });
        setToast({ message: text, type });
    }, [setMessage, setToast]);

    const unwrapData = (value) => value?.data?.data || value?.data || value || {};

    const getResourceIdFromResponse = (value) => {
        const data = unwrapData(value);
        return data.resource?.microservice?.id
            || data.resource?.id
            || data.microservice?.id
            || data.id
            || null;
    };

    const normalizeUploadedSpec = (result, fallbackName) => {
        const data = unwrapData(result);
        const specData = Array.isArray(data) ? data[data.length - 1] : data;
        const metadata = specData?.specMetadata
            || specData?.apiDesign?.specMetadata
            || specData?.metadata
            || specData?.spec
            || specData
            || {};
        const specName = metadata.specName
            || specData?.specName
            || metadata.name
            || metadata.fileName
            || fallbackName
            || 'Uploaded specification';
        const specMetadataId = metadata.id
            || specData?.specMetadataId
            || specData?.specMetadata?.id
            || specData?.id
            || specName;

        return {
            ...metadata,
            id: specMetadataId,
            name: specName,
            specName,
            fileName: metadata.fileName || specData?.fileName || fallbackName || specName,
            source: 'imported',
            specMetadataId,
        };
    };

    const createKongResourceFromSpec = async (specName) => {
        if (onboardingId) return { resourceId: onboardingId, created: false };

        if (!onboardingContextId) {
            throw new Error('Please select an existing onboarding before uploading the service specification.');
        }

        const userEmail = localStorage.getItem('userEmail') || '';
        const resourceResult = await onboardingService.createResourceForOnboarding(onboardingContextId, {
            projectType: 'KONG_GATEWAY_SERVICE',
            apiName: specName,
            connectorId: null,
            createdBy: userEmail,
            updatedBy: userEmail,
        });

        if (!resourceResult.success) {
            throw new Error(resourceResult.error || 'Failed to create Kong gateway service resource.');
        }

        const resourceId = getResourceIdFromResponse(resourceResult);
        if (!resourceId) {
            throw new Error('Kong gateway service was created but no resource id was returned.');
        }

        setOnboardingId?.(resourceId);
        localStorage.setItem('probeStack_proxyOnboardingId', resourceId);
        localStorage.setItem('probeStack_onboardingId', resourceId);
        return { resourceId, created: true };
    };

    const rememberUploadedSpec = (spec) => {
        setProxyDesignSelectedSpec?.(spec);
        setProxySelectedDesignSpecs?.([spec.id]);
        setProxyDesignImportedSpecs?.((prev = []) => (
            prev.some((item) => item.id === spec.id) ? prev : [...prev, spec]
        ));
        setProxyApiDesignSpecs?.((prev = []) => (
            prev.some((item) => item.id === spec.id) ? prev : [...prev, spec]
        ));
        localStorage.setItem('probeStack_proxyDesignSelectedSpec', JSON.stringify(spec));
        localStorage.setItem('probeStack_proxySelectedDesignSpecs', JSON.stringify([spec.id]));
    };

    const handleUploadedSpec = async (result, successMessage, fallbackName) => {
        if (!result.success) {
            showMessage(result.error || 'Failed to upload spec', 'error');
            return;
        }

        const uploadedSpec = normalizeUploadedSpec(result, fallbackName);
        const { resourceId, created } = await createKongResourceFromSpec(uploadedSpec.specName);
        rememberUploadedSpec(uploadedSpec);

        if (created && uploadedSpec.specMetadataId) {
            const designResult = await apiDesignService.createApiDesign({
                microserviceId: resourceId,
                specMetadataId: uploadedSpec.specMetadataId,
                apiType: 'REST API',
                authenticationType: 'OAuth 2.0',
                dataFormat: 'JSON',
            });

            if (!designResult.success) {
                throw new Error(designResult.error || 'Kong resource created, but failed to link the uploaded specification.');
            }
        }

        const importedRes = await apiDesignService.getImportedByMicroservice(resourceId);
        if (importedRes.success) {
            const importedSpecs = importedRes.data?.data || importedRes.data || [];
            setProxyApiDesignSpecs(Array.isArray(importedSpecs) && importedSpecs.length ? importedSpecs : [uploadedSpec]);
        }

        showMessage(successMessage, 'success');
    };
    useEffect(() => {
        const fetchData = async () => {
            if (onboardingId) {
                try {
                    const importedRes = await apiDesignService.getImportedByMicroservice(onboardingId);

                    if (importedRes?.success) {
                        setProxyApiDesignSpecs(
                            importedRes.data?.data || importedRes.data || []
                        );
                    }
                } catch (err) {
                    console.error("Error fetching API specs:", err);
                }
            }
        };

        fetchData();
    }, [onboardingId]);
    return (
        <div className="space-y-6">
            <div className="flex justify-between">
                <h1 className="text-2xl font-bold text-white">Service Design</h1>
            </div>
            <Card className="p-5" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                <CardTitle className="mb-4 flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-primary" />
                    API Design Specifications
                </CardTitle>

                {/* Import Options Buttons */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <button
                        type="button"
                        onClick={() => setProxyDesignImportMode('LOCAL')}
                        className={cn(
                            'px-4 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5',
                            proxyDesignImportMode === 'LOCAL'
                                ? 'border-primary bg-primary/20 text-primary shadow-md shadow-primary/25'
                                : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                        )}
                    >
                        <FileCode className="w-4 h-4" />
                        Import from LOCAL
                    </button>
                    <button
                        type="button"
                        onClick={() => setProxyDesignImportMode('URL')}
                        className={cn(
                            'px-4 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5',
                            proxyDesignImportMode === 'URL'
                                ? 'border-primary bg-primary/20 text-primary shadow-md shadow-primary/25'
                                : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                        )}
                    >
                        <Download className="w-4 h-4" />
                        Import from URL
                    </button>
                    <button
                        type="button"
                        onClick={() => setProxyShowForgeStudioModal(true)}
                        className={cn(
                            'px-4 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5',
                            'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                        )}
                    >
                        <Plus className="w-4 h-4" />
                        CREATE
                    </button>
                </div>

                {/* LOCAL Import Section */}
                {proxyDesignImportMode === 'LOCAL' && (
                    <div className="mb-6">
                        <input
                            ref={proxyDesignFileInputRef}
                            type="file"
                            accept=".yaml,.yml,.json"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    setBusy(true);
                                    try {
                                        const result = await apiDesignService.uploadSpec('f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c', 'LOCAL', file, null, null, onboardingId);
                                        await handleUploadedSpec(result, `Uploaded: ${file.name}`, file.name);
                                    } catch (error) {
                                        showMessage(error.message || 'Failed to upload spec', 'error');
                                    } finally {
                                        setBusy(false);
                                    }
                                }
                            }}
                        />
                        <div
                            onClick={() => proxyDesignFileInputRef.current?.click()}
                            className={cn(
                                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-dark-700 py-8 px-4 text-center transition-colors cursor-pointer hover:border-primary/50 hover:bg-primary/5'
                            )}
                            style={{ backgroundColor: 'rgba(10, 10, 46, 0.4)' }}
                        >
                            <FileCode className="mb-2 h-10 w-10 text-gray-500" />
                            <p className="text-sm font-medium text-white">Drop spec file or click to browse</p>
                            <p className="mt-1 text-xs text-gray-500">YAML or JSON, max 10MB</p>
                        </div>
                    </div>
                )}

                {/* URL Import Section */}
                {proxyDesignImportMode === 'URL' && (
                    <div className="mb-6 space-y-3">
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://api.example.com/openapi.json"
                                value={proxyDesignUrlInput}
                                onChange={(e) => setProxyDesignUrlInput(e.target.value)}
                                className="h-10 text-sm flex-1 bg-dark-900 border-dark-700 text-white"
                            />
                            <button
                                type="button"
                                onClick={async () => {
                                    if (proxyDesignUrlInput.trim()) {
                                        setBusy(true);
                                        const sourceUrl = proxyDesignUrlInput.trim();
                                        try {
                                            const result = await apiDesignService.uploadSpec('f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c', 'URL', null, sourceUrl, null, onboardingId);
                                            await handleUploadedSpec(result, `Imported from URL: ${sourceUrl}`, sourceUrl.split('/').pop() || sourceUrl);
                                            setProxyDesignUrlInput('');
                                        } catch (error) {
                                            showMessage(error.message || 'Failed to import spec', 'error');
                                        } finally {
                                            setBusy(false);
                                        }
                                    } else {
                                        showMessage('Please enter a URL', 'error');
                                    }
                                }}
                                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                            >
                                <Download className="w-4 h-4" />
                                Import
                            </button>
                        </div>
                    </div>
                )}

                {/* Specification Library */}
                {/* Imported Specifications - only show if data exists */}
                {proxyApiDesignSpecs.length > 0 && (
                    <div className="mb-6">
                        <p className="text-sm text-gray-400 mb-3">Imported Specifications (Select one)</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {proxyApiDesignSpecs.map((spec) => {
                                const isSelected = proxyDesignSelectedSpec?.id === spec.id;
                                return (
                                    <>
                                        <div
                                            key={spec.id}
                                            onClick={() => {
                                                const s = { id: spec.id, name: spec.specName || spec.fileName, specName: spec.specName, fileName: spec.fileName, source: 'imported' };
                                                setProxyDesignSelectedSpec(s);
                                                setProxySelectedDesignSpecs([s.id]);
                                                localStorage.setItem('probeStack_proxyDesignSelectedSpec', JSON.stringify(s));
                                                localStorage.setItem('probeStack_proxySelectedDesignSpecs', JSON.stringify([s.id]));
                                            }}
                                            className={cn(
                                                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                                                isSelected ? 'border-primary bg-primary/10 shadow-[0_0_10px_rgba(255,91,31,0.2)]' : 'border-dark-700 bg-[#0f172a]/50 hover:border-primary/50'
                                            )}
                                        >
                                            <div className={cn('w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center', isSelected ? 'border-primary bg-primary' : 'border-gray-600')}>
                                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                            </div>
                                            <FileCode className="w-4 h-4 text-primary flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{spec.specName || spec.fileName}</p>
                                                <p className="text-xs text-gray-400 truncate">{spec.fileName}</p>
                                            </div>
                                        </div>
                                    </>
                                );
                            })}
                        </div>
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
    )
}
export default ServiceDesign;
