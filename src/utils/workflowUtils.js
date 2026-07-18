export const getCurrentUserEmail = () =>
  localStorage.getItem('userEmail') || 'admin@forgecrux.com';

export const getCurrentOrganization = () => {
  try {
    const raw = localStorage.getItem('probeStack_onboardingData');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.organizationId) return parsed.organizationId;
    }
  } catch {
    // fall through to legacy key
  }
  return localStorage.getItem('userOrganization') || 'Probestack';
};

// Steps 1 (Onboarding), 3 (Design), 7 (Development), 11 (Complete) are always required
export const ALWAYS_REQUIRED_STEP_IDS = new Set([1, 3, 7, 11]);

export const CONFIGURABLE_STEPS = [
  { id: 2, name: 'Requirement', description: 'Functional & non-functional requirements' },
  { id: 4, name: 'Design Validation', description: 'API design validation and linting' },
  { id: 5, name: 'Mock Service', description: 'Generate mock server from spec' },
  { id: 6, name: 'Contract Testing', description: 'Contract testing & stakeholder approval' },
  { id: 8, name: 'Test Cases', description: 'Auto-generate test cases' },
  { id: 9, name: 'Code Analysis', description: 'Static analysis & security scanning' },
  { id: 10, name: 'Code Review', description: 'Peer code review & approval' },
];

export const isStepRequired = (workflow, stepId) => {
  if (ALWAYS_REQUIRED_STEP_IDS.has(stepId)) return true;
  if (!workflow) return true;
  return workflow.steps?.[stepId]?.required !== false;
};

export const buildDefaultStepConfig = () => {
  const steps = {};
  CONFIGURABLE_STEPS.forEach((s) => {
    steps[s.id] = { required: true };
  });
  return steps;
};
