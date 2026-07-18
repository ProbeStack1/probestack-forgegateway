import React from "react";
import { Card, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { cn } from "../../lib/utils";
import {
    XCircle,
    X,
    UserCircle,
    FileText,
    Users,
    Plug,
    CheckCircle,
    ArrowRight,
    ArrowLeft
} from "lucide-react";

const Onboarding = ({
    setShowOnboardingModal,
    // Alert
    showGatewayAlert,
    setShowGatewayAlert,

    // Business Info
    onboardingBusinessUnit,
    setOnboardingBusinessUnit,
    onboardingTeamName,
    setOnboardingTeamName,
    onboardingApplicationName,
    setOnboardingApplicationName,
    onboardingApplicationId,
    setOnboardingApplicationId,

    // Stakeholder Info
    onboardingProjectOwner,
    setOnboardingProjectOwner,
    onboardingOwnerEmail,
    setOnboardingOwnerEmail,
    onboardingProjectSME,
    setOnboardingProjectSME,
    onboardingProjectSMEEmail,
    setOnboardingProjectSMEEmail,
    onboardingProjectDLEmail,
    setOnboardingProjectDLEmail,
    onboardingGoLiveDate,
    setOnboardingGoLiveDate,
    onboardingTesterName,
    setOnboardingTesterName,
    onboardingTesterEmail,
    setOnboardingTesterEmail,
    onboardingServiceNowGroup,
    setOnboardingServiceNowGroup,
    onboardingServiceNowEmail,
    setOnboardingServiceNowEmail,

    // Consumers
    savedConsumers,
    selectedOnboardingConsumers,
    setSelectedOnboardingConsumers,
    setShowConsumerModal,
    handleEditConsumer,

    // Connector
    setShowConnectorModal
}) => {
    return (
        <div className="space-y-6 p-5">
            <div className="header">
            <h1 className="text-lg font-semibold text-white">
                Onboarding
            </h1>
            <p className="text-sm text-gray-400">
                Fill the details to Application onboard
            </p>
            </div>
            {/* Gateway Selection Alert */}
            {showGatewayAlert && (
                <div className="flex items-center gap-3 p-4 rounded-lg border border-red-500/30 bg-red-500/10 animate-fadeIn">
                    <div className="p-2 rounded-full bg-red-500/20">
                        <XCircle className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-red-400">API Gateway Required</p>
                        <p className="text-xs text-gray-400">Please select an API Gateway from the dropdown above before proceeding.</p>
                    </div>
                    <button
                        onClick={() => setShowGatewayAlert(false)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-dark-700/50 transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Business Unit Information Card */}
            <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                <CardTitle className="mb-4 flex items-center gap-2 text-white">
                    <UserCircle className="w-5 h-5 text-primary" />
                    Business Unit Information
                </CardTitle>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-300">Business Unit</Label>
                        <select
                            className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white cursor-pointer transition-all border border-dark-700"
                            style={{ backgroundColor: '#0f172a80' }}
                            value={onboardingBusinessUnit}
                            onChange={(e) => setOnboardingBusinessUnit(e.target.value)}
                        >
                            <option value="" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Select Business Unit</option>
                            <option value="retail" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Retail Banking</option>
                            <option value="corporate" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Corporate Banking</option>
                            <option value="wealth" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Wealth Management</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-300">Team Name</Label>
                        <Input
                            placeholder="Enter team name"
                            className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                            value={onboardingTeamName}
                            onChange={(e) => setOnboardingTeamName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-300">Application Name</Label>
                        <Input
                            placeholder="Enter application name"
                            className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                            value={onboardingApplicationName}
                            onChange={(e) => setOnboardingApplicationName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-300">Application Id</Label>
                        <Input
                            placeholder="e.g., APP-2024-001"
                            className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                            value={onboardingApplicationId}
                            onChange={(e) => setOnboardingApplicationId(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Stakeholder Information Card */}
            <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                <CardTitle className="mb-4 flex items-center gap-2 text-white">
                    <FileText className="w-5 h-5 text-primary" />
                    Stakeholder Information
                </CardTitle>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-300">Project Owner</Label>
                        <Input
                            placeholder="Enter owner name"
                            className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                            value={onboardingProjectOwner}
                            onChange={(e) => setOnboardingProjectOwner(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-300">Owner Email</Label>
                        <Input
                            type="email"
                            placeholder="owner@company.com"
                            className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                            value={onboardingOwnerEmail}
                            onChange={(e) => setOnboardingOwnerEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-300">Project SME</Label>
                        <Input
                            placeholder="Enter project SME name"
                            className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                            value={onboardingProjectSME}
                            onChange={(e) => setOnboardingProjectSME(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-300">Project SME Email</Label>
                        <Input
                            type="email"
                            placeholder="sme@company.com"
                            className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                            value={onboardingProjectSMEEmail}
                            onChange={(e) => setOnboardingProjectSMEEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-300">Project DL Email</Label>
                        <Input
                            type="email"
                            placeholder="project-dl@company.com"
                            className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                            value={onboardingProjectDLEmail}
                            onChange={(e) => setOnboardingProjectDLEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-300">Expected Go-Live Date</Label>
                        <Input
                            type="date"
                            className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                            value={onboardingGoLiveDate}
                            onChange={(e) => setOnboardingGoLiveDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-300">Tester Name</Label>
                        <Input
                            placeholder="Enter tester name"
                            className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                            value={onboardingTesterName}
                            onChange={(e) => setOnboardingTesterName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-300">Tester Email</Label>
                        <Input
                            type="email"
                            placeholder="tester@company.com"
                            className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                            value={onboardingTesterEmail}
                            onChange={(e) => setOnboardingTesterEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-300">ServiceNow Group Name</Label>
                        <Input
                            placeholder="Enter ServiceNow group name"
                            className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                            value={onboardingServiceNowGroup}
                            onChange={(e) => setOnboardingServiceNowGroup(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-300">ServiceNow Email</Label>
                        <Input
                            type="email"
                            placeholder="servicenow@company.com"
                            className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                            value={onboardingServiceNowEmail}
                            onChange={(e) => setOnboardingServiceNowEmail(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Consumer Information Card */}
            <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                <CardTitle className="mb-4 flex items-center gap-2 text-white">
                    <Users className="w-5 h-5 text-primary" />
                    Consumer Information
                </CardTitle>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-400">Manage API consumers for this project</p>
                        <button
                            type="button"
                            onClick={() => setShowConsumerModal(true)}
                            className={cn(
                                'px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                                'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                'flex items-center gap-1.5 active:scale-[0.98]'
                            )}
                        >
                            Add Consumer
                        </button>
                    </div>

                    {/* Display saved consumers - selectable */}
                    {savedConsumers.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-1"
                            style={{ scrollbarWidth: 'thin', scrollbarColor: '#232942 #0a0a2e' }}
                        >
                            {savedConsumers.map((consumer) => (
                                <div
                                    key={consumer.id}
                                    className={cn(
                                        'p-3 rounded-lg border cursor-pointer transition-all relative group',
                                        selectedOnboardingConsumers.includes(consumer.id)
                                            ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                            : 'border-dark-700 hover:border-primary/50'
                                    )}
                                    style={!selectedOnboardingConsumers.includes(consumer.id) ? { backgroundColor: '#0f172a80' } : undefined}
                                >
                                    <div onClick={() => {
                                        const isSelected = selectedOnboardingConsumers.includes(consumer.id);
                                        if (isSelected) {
                                            setSelectedOnboardingConsumers(selectedOnboardingConsumers.filter(id => id !== consumer.id));
                                        } else {
                                            setSelectedOnboardingConsumers([...selectedOnboardingConsumers, consumer.id]);
                                        }
                                    }}>
                                        <p className="text-xs font-medium text-white truncate pr-6">{consumer.consumerName || 'Unnamed'}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{consumer.consumerPocName || 'No POC'}</p>
                                        {selectedOnboardingConsumers.includes(consumer.id) && (
                                            <div className="mt-1 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3 text-primary" />
                                                <span className="text-[10px] text-primary">Selected</span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditConsumer(consumer);
                                        }}
                                        className="absolute top-2 right-2 p-1 rounded-md bg-dark-800/80 text-gray-400 hover:text-primary hover:bg-dark-700/80 transition-all opacity-0 group-hover:opacity-100"
                                        title="Edit Consumer"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                            <path d="m15 5 4 4" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            {/* Connector Configuration Card */}
            <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                <CardTitle className="mb-4 flex items-center gap-2 text-white">
                    <Plug className="w-5 h-5 text-primary" />
                    Connector Configuration
                </CardTitle>
                <div className="flex justify-start">
                    <button
                        type="button"
                        onClick={() => setShowConnectorModal(true)}
                        className={cn(
                            'px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                            'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                            'flex items-center gap-2'
                        )}
                    >
                        <Plug className="w-4 h-4" />
                        Configure Connectors
                    </button>
                </div>
            </Card>
            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6 pt-6 border-t border-dark-700">
                <button
                    type="button"
                    onClick={() => setShowOnboardingModal(false)}
                    className="px-6 py-2 rounded-lg font-semibold text-sm transition-all bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-600 flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                </button>
                <button
                    type="button"
                    onClick={() => setShowOnboardingModal(false)}
                    className="px-6 py-2 rounded-lg font-semibold text-sm transition-all bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 flex items-center gap-2"
                >
                    Save
                </button>
            </div>
        </div>
    );
};

export default Onboarding;