import { useEffect, useMemo, useState } from "react";

const uniqueValues = (items, key) => [
  ...new Set(items.map((item) => item[key]).filter(Boolean)),
].sort((a, b) => a.localeCompare(b));

const defaultSelectClassName =
  "w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60";

export default function OnboardingCascadeSelect({
  value,
  onChange,
  options = [],
  isLoading = false,
  required = false,
  allowAll = false,
  className = "",
  selectClassName = defaultSelectClassName,
  // The middle tier is "teamName" on the option objects, but callers whose onboarding
  // hierarchy calls that level "Project" rather than "Team" can relabel it here without
  // needing a separate copy of this component.
  teamLabel = "Team Name",
}) {
  const selectedOption = useMemo(
    () => options.find((option) => option.onboardingId === value) || null,
    [options, value]
  );
  const [businessUnit, setBusinessUnit] = useState(selectedOption?.businessUnit || "");
  const [teamName, setTeamName] = useState(selectedOption?.teamName || "");

  useEffect(() => {
    setBusinessUnit(selectedOption?.businessUnit || "");
    setTeamName(selectedOption?.teamName || "");
  }, [selectedOption]);

  const businessUnitOptions = useMemo(
    () => uniqueValues(options, "businessUnit"),
    [options]
  );
  const teamOptions = useMemo(
    () => uniqueValues(options.filter((option) => option.businessUnit === businessUnit), "teamName"),
    [businessUnit, options]
  );
  const applicationOptions = useMemo(
    () => options.filter((option) => (
      option.businessUnit === businessUnit &&
      option.teamName === teamName &&
      option.applicationId
    )),
    [businessUnit, teamName, options]
  );

  const handleBusinessUnitChange = (nextBusinessUnit) => {
    setBusinessUnit(nextBusinessUnit);
    setTeamName("");
    onChange?.("", null);
  };

  const handleTeamChange = (nextTeamName) => {
    setTeamName(nextTeamName);
    onChange?.("", null);
  };

  const handleApplicationChange = (nextOnboardingId) => {
    const option = options.find((item) => item.onboardingId === nextOnboardingId) || null;
    onChange?.(nextOnboardingId, option);
  };

  return (
    <div className={`grid grid-cols-1 gap-4 md:grid-cols-3 ${className}`}>
      <div>
        <label className="block text-sm text-gray-300 mb-2">
          Business Unit{required ? "*" : ""}
        </label>
        <select
          value={businessUnit}
          disabled={isLoading}
          className={selectClassName}
          onChange={(event) => handleBusinessUnitChange(event.target.value)}
        >
          <option value="">
            {isLoading ? "Loading business units..." : allowAll ? "All Business Units" : "Select Business Unit"}
          </option>
          {businessUnitOptions.map((unit) => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-2">
          {teamLabel}{required ? "*" : ""}
        </label>
        <select
          value={teamName}
          disabled={isLoading || !businessUnit}
          className={selectClassName}
          onChange={(event) => handleTeamChange(event.target.value)}
        >
          <option value="">
            {businessUnit ? (allowAll ? `All ${teamLabel}s` : `Select ${teamLabel}`) : "Select a business unit first"}
          </option>
          {teamOptions.map((team) => (
            <option key={team} value={team}>{team}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-2">
          Application ID{required ? "*" : ""}
        </label>
        <select
          value={value || ""}
          disabled={isLoading || !businessUnit || !teamName}
          className={selectClassName}
          onChange={(event) => handleApplicationChange(event.target.value)}
        >
          <option value="">
            {teamName ? (allowAll ? "All Application IDs" : "Select Application ID") : "Select a team first"}
          </option>
          {applicationOptions.map((option) => (
            <option key={option.onboardingId} value={option.onboardingId}>
              {option.applicationId}
              {option.applicationName ? ` - ${option.applicationName}` : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

