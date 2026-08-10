export const C = {
  navy: "#0A1628",
  dark: "#0D1F35",
  card: "#161b30",
  deep: "#0f1629",
  border: "#272749",
  cardBorder: "#334155",
  surface: "#0C1E38",
  orange: "#ff5b1f",
  teal: "#00C9A7",
  green: "#39B54A",
  cyan: "#00D4FF",
  white: "#FFFFFF",
  muted: "#b3b3b3",
  inp: "#0f172a80",
  sub: "#94A3B8FF",
  dim: "#475569",
  red: "#FF5050",
  amber: "#FFBC42",
  purple: "#7B5FFF",
  pink: "#EC4899",
};

// Organization id used for Probestack Onboarding API calls (see
// http-service/onboardingClient.js). Hardcoded for now, same as the backend.
export const ONBOARDING_ORG_ID =
  import.meta.env.VITE_ONBOARDING_ORG_ID || "f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c";
