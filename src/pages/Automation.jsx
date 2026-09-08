import React from "react";
import { Card, CardContent } from "../components/ui/card";

export const Automation = ({showHeader = true}) => {
  const automations = [
    {
      id: 1,
      name: "API SCM Onboarding Pipeline",
      githubLocation: "https://github.com/ForgeCrux/api-scm-onboarding-pipeline.git",
      url: "https://probestack.io/api-scm-onboarding-pipeline",
    },
    {
      id: 2,
      name: "SCM Onboarding Pipeline",
      githubLocation: "https://github.com/ForgeCrux/apigee-scm-onboarding-pipeline.git",
      url: "https://probestack.io/apigee-scm-onboarding-pipeline",
    },
    {
      id: 3,
      name: "API CI Pipeline",
      githubLocation: "https://github.com/ForgeCrux/api-ci-pipeline.git",
      url: "https://probestack.io/api-ci-pipeline",
    },
    {
      id: 4,
      name: "API CD Pipeline",
      githubLocation: "https://github.com/ForgeCrux/api-cd-pipeline.git",
      url: "https://probestack.io/api-cd-pipeline",
    },
    {
      id: 5,
      name: "CICD Pipeline (Edge/X)",
      githubLocation: "https://github.com/ForgeCrux/apigee-cicd-pipeline.git",
      url: "https://probestack.io/apigee-cicd-pipeline",
    },
    {
      id: 6,
      name: "CICD Pipeline (Edge/X)",
      githubLocation: "https://github.com/ForgeCrux/apigee-cicd-pipeline.git",
      url: "https://probestack.io/apigee-cicd-pipeline",
    },
    {
      id: 7,
      name: "Oneclick Deploymnet",
      githubLocation: "https://github.com/ForgeCrux/apigee-deployment-pipeline.git",
      url: "https://probestack.io/apigee-deployment-pipeline",
    },
    
    {
      id: 8,
      name: "API BU Onboarding Pipeline",
      githubLocation: "https://github.com/ForgeCrux/api-bu-onboarding-pipeline.git",
      url: "https://probestack.io/api-bu-onboarding-pipeline",
    },
    {
      id: 9,
      name: "ReactJS CICD Pipeline",
      githubLocation: "https://github.com/ForgeCrux/reactjs-cicd-pipeline.git",
      url: "https://probestack.io/reactjs-cicd-pipeline",
    },
    {
      id: 10,
      name: "GKE Cluster Creation Pipeline",
      githubLocation: "https://github.com/ForgeCrux/gke-cluster-create-pipeline.git",
      url: "https://probestack.io/gke-cluster-create-pipeline",
    },
    {
      id: 11,
      name: "GKE IAM Pipeline",
      githubLocation: "https://github.com/ForgeCrux/gke-iam-pipeline.git",
      url: "https://probestack.io/gke-iam-pipeline",
    },
  ];
   
  return (
    <div className="min-h-screen bg-background" style={{ backgroundColor: '#0e172a' }}>
      <div className="mx-auto max-w-7xl p-2 px-4">
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-foreground mb-2">Automation</h1>
          <p className="text-muted-foreground">
            Manage API automation resources, GitHub locations and test pipeline urls.
          </p>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-teal-600 dark:bg-teal-700 text-white">
                    <th className="px-6 py-4 text-left text-sm font-semibold border-b border-teal-700 dark:border-teal-800">
                      Automation Pipeline Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold border-b border-teal-700 dark:border-teal-800">
                      GitHub Location
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold border-b border-teal-700 dark:border-teal-800">
                      Test Pipeline URL
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {automations.map((automation, index) => (
                    <tr
                      key={automation.id}
                      className={`${
                        index % 2 === 0
                          ? "bg-background-card"
                          : "bg-background-elevated"
                      } hover:bg-background-light transition-colors`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {automation.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground/80">
                        {automation.githubLocation || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground/80">
                        {automation.url || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-8">
          {automations.map((automation) => (
            <div key={automation.id} className="space-y-4">
              {/* Automation Name as Header */}
              <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">
                {automation.name}
              </h2>
              
              {/* Full Width Card with Dummy Content */}
              <Card className="w-full">
                <CardContent className="p-6">
                  <p className="text-sm text-foreground/80">
                    Lorem ipsum dolsssadsafffffor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                  </p>
                  <p className="text-sm text-foreground/80 mt-4">
                    Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
            <div className="flex items-center gap-2">
              <img
                src="/assets/justlogo.png"
                alt="ProbeStack logo"
                className="h-6 w-auto"
              />
              <span className="font-semibold gradient-text">
                ProbeStack
              </span>
              <span className="text-muted-foreground">
                © {new Date().getFullYear()} All rights reserved
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="/privacy-policy"
                className="hover:text-primary transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/terms-of-service"
                className="hover:text-primary transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="/security"
                className="hover:text-primary transition-colors"
              >
                Security
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
