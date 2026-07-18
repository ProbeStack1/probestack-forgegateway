import { getKongSourceInfo } from "../kongTracking";

export default function KongSourceBadge({ resource }) {
  const source = getKongSourceInfo(resource);
  const onboarding = source.onboarding || {};
  const details = [
    source.onboardingId ? `Onboarding: ${source.onboardingId}` : "",
    onboarding.businessUnit ? `Business Unit: ${onboarding.businessUnit}` : "",
    onboarding.teamName ? `Team: ${onboarding.teamName}` : "",
    onboarding.applicationId ? `Application: ${onboarding.applicationId}` : "",
  ].filter(Boolean);

  return (
    <span
      className={`kong-source-badge ${source.isForgeSphere ? "kong-source-badge--forge" : "kong-source-badge--kong"}`}
      title={details.length ? details.join(" | ") : source.label}
    >
      {source.label}
    </span>
  );
}
