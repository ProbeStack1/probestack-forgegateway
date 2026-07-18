// Utility functions for demo mode
export const isDemoMode = () => {
  const saved = localStorage.getItem("demoMode");
  return saved === "true";
};

export const setDemoMode = (enabled) => {
  localStorage.setItem("demoMode", enabled.toString());
};

