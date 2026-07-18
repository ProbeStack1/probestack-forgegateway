import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useCallback } from "react";

export default function ExistingOnboardingModal({
    onClose,
    existingAppNames,
    isFetchingAppNames,
    selectedExistingApp,
    setSelectedExistingApp,
    existingAppOnboarding,
    setExistingAppOnboarding,
    isFetchingAppOnboarding,
    setIsFetchingAppOnboarding,
    selectedExistingSpec,
    setSelectedExistingSpec,
    onboardingService,
    showMessage,
    handleProceed,
}) {
    

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div
                className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col"
                style={{ backgroundColor: "rgb(22 27 48 / var(--tw-bg-opacity, 1))" }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
                    <h3 className="text-lg font-semibold text-white">
                        Choose from Existing Onboarding
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Applications */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-gray-300">
                                Select Application ID
                            </h4>

                            {isFetchingAppNames ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                </div>
                            ) : existingAppNames.length === 0 ? (
                                <div className="p-4 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                                    <p className="text-sm text-gray-500">
                                        No applications found
                                    </p>
                                </div>
                            ) : (
                                existingAppNames.map((appName) => (
                                    <button
                                        key={appName}
                                        onClick={() => {
                                            setSelectedExistingApp(appName);
                                            setSelectedExistingSpec(null);
                                            setExistingAppOnboarding([]);
                                            setIsFetchingAppOnboarding(true);

                                            onboardingService
                                                .getByApplicationId(appName)
                                                .then((result) => {
                                                    if (result.success) {
                                                        const data =
                                                            result.data?.data || result.data;
                                                        setExistingAppOnboarding(
                                                            Array.isArray(data)
                                                                ? data
                                                                : data
                                                                    ? [data]
                                                                    : []
                                                        );
                                                    } else {
                                                        showMessage(result.error, "error");
                                                    }
                                                    setIsFetchingAppOnboarding(false);
                                                });
                                        }}
                                        className={cn(
                                            "w-full p-3 rounded-lg border text-left transition-all",
                                            selectedExistingApp === appName
                                                ? "border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.2)]"
                                                : "border-dark-700 bg-[#0f172a]/50 hover:border-primary/50"
                                        )}
                                    >
                                        <p className="text-sm font-medium text-white">
                                            {appName}
                                        </p>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Onboarding Records */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-gray-300">
                                {selectedExistingApp
                                    ? `Onboarding for ${selectedExistingApp}`
                                    : "Select Application First"}
                            </h4>

                            {isFetchingAppOnboarding ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                </div>
                            ) : selectedExistingApp &&
                                existingAppOnboarding.length > 0 ? (
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                    {existingAppOnboarding.map((item, idx) => (
                                        <div
                                            key={item.id || idx}
                                            onClick={() => setSelectedExistingSpec(item)}
                                            className={cn(
                                                "w-full p-3 rounded-lg border cursor-pointer transition-all",
                                                selectedExistingSpec?.id === item.id
                                                    ? "border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.2)]"
                                                    : "border-dark-700 bg-[#0f172a]/50 hover:border-primary/50"
                                            )}
                                        >
                                            <p className="text-sm font-medium text-white">
                                                {item.applicationName ||
                                                    item.name ||
                                                    selectedExistingApp}
                                            </p>

                                            {item.teamName && (
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Team: {item.teamName}
                                                </p>
                                            )}
                                            {item.applicationId && (
                                                <p className="text-xs text-gray-400">
                                                    App ID: {item.applicationId}
                                                </p>
                                            )}
                                            {item.projectOwner && (
                                                <p className="text-xs text-gray-400">
                                                    Owner: {item.projectOwner}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : selectedExistingApp ? (
                                <div className="p-4 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                                    <p className="text-sm text-gray-500">
                                        No onboarding data found
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                                    <p className="text-sm text-gray-500">
                                        Please select an Application ID first
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700 bg-[#0f172a]/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-800"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleProceed}
                        disabled={!selectedExistingApp || !selectedExistingSpec}
                        className={cn(
                            "px-6 py-2 rounded-lg font-semibold text-sm",
                            selectedExistingApp && selectedExistingSpec
                                ? "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25"
                                : "bg-dark-700 text-gray-500 cursor-not-allowed"
                        )}
                    >
                        Proceed
                    </button>
                </div>
            </div>
        </div>
    );
}