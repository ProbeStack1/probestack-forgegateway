export const MICROSERVICE_CLOUD_RUN_SUFFIX = "spipnh6wiq-uc.a.run.app";

export const getRepoNameFromValue = (value) => {
  if (!value) return "";

  const rawValue = String(value).trim();
  const withoutGitSuffix = rawValue.replace(/\.git$/i, "");
  const withoutGithubUrl = withoutGitSuffix.replace(/^https?:\/\/github\.com\//i, "");
  const repoName = withoutGithubUrl.split("/").filter(Boolean).pop() || "";

  return repoName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
};

export const buildMicroserviceDeploymentUrl = (repoName) => {
  const normalizedRepoName = getRepoNameFromValue(repoName);
  return normalizedRepoName ? `https://${normalizedRepoName}-${MICROSERVICE_CLOUD_RUN_SUFFIX}` : "";
};

export const getMicroserviceDeploymentUrlFromCodeGen = (codeGen = {}) =>
  buildMicroserviceDeploymentUrl(
    codeGen.repoName ||
      codeGen.repositoryName ||
      codeGen.repository ||
      codeGen.repo ||
      codeGen.gitRepository ||
      codeGen.pushedRepoFullName ||
      codeGen.artifactId,
  );

export const getMicroserviceDeploymentUrlFromResource = (resource = {}) => {
  const codeGenResults = Array.isArray(resource.codeGenResults) ? resource.codeGenResults : [];
  const codeGen = codeGenResults.find((result) => result?.status === "SUCCESS") || codeGenResults[0] || {};
  const sourceCodeManagement = resource.connectorConfiguration?.sourceCodeManagement || {};

  return buildMicroserviceDeploymentUrl(
    sourceCodeManagement.repo ||
      sourceCodeManagement.repository ||
      sourceCodeManagement.repoName ||
      resource.microservice?.repoName ||
      resource.microservice?.repositoryName ||
      codeGen.repoName ||
      codeGen.repositoryName ||
      codeGen.repository ||
      codeGen.repo ||
      codeGen.gitRepository ||
      codeGen.pushedRepoFullName ||
      codeGen.artifactId,
  );
};
