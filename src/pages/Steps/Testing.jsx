import React from "react";
import { Card, CardTitle } from "../../components/ui/card";
import { Activity, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";

const Testing = ({onBack, onNext, proxyDesignSelectedSpec,testCases = []}) => {
    const passedCount = testCases.length;
    const failedCount = 0;
    const skippedCount = 0;
    const passRate = passedCount > 0 ? "100%" : "0%";

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Testing</h1>
            <Card
                className="p-5"
                style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}
            >
                <CardTitle className="mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Test Execution Results

                    {proxyDesignSelectedSpec && (
                        <span className="ml-auto text-xs text-gray-400">
                            Spec:{" "}
                            <span className="text-primary">
                                {proxyDesignSelectedSpec.name}
                            </span>
                        </span>
                    )}
                </CardTitle>

                <div className="space-y-4">

                    {/* Summary */}
                    <div className="grid grid-cols-4 gap-4">

                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                            <p className="text-3xl font-bold text-green-400">
                                {passedCount}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Passed</p>
                        </div>

                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                            <p className="text-3xl font-bold text-red-400">
                                {failedCount}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Failed</p>
                        </div>

                        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                            <p className="text-3xl font-bold text-yellow-400">
                                {skippedCount}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Skipped</p>
                        </div>

                        <div className="p-4 rounded-lg bg-dark-700 border border-dark-700 text-center">
                            <p className="text-3xl font-bold text-white">
                                {passRate}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Pass Rate</p>
                        </div>

                    </div>

                    {/* Test Cases List */}
                    <div
                        style={{ backgroundColor: "#0f172a80" }}
                        className="p-4 rounded-lg border border-dark-700"
                    >
                        <p className="text-sm font-medium text-white mb-3">
                            Test Cases Executed ({testCases.length})
                        </p>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {testCases.map((testCase) => (
                                <div
                                    key={testCase.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-[#0f172a]/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-500/20">
                                            <CheckCircle className="w-4 h-4 text-green-400" />
                                        </div>

                                        <div>
                                            <p className="text-sm text-white">
                                                {testCase.name}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {testCase.type}
                                            </p>
                                        </div>
                                    </div>

                                    <span className="text-xs text-green-400">
                                        Passed
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
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

export default Testing;