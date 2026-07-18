import React from "react";
import { Card, CardContent } from "../components/ui/card";

export const Framework = ({showHeader = true}) => {
  const frameworks = [
    {
      id: 1,
      name: "API Linting (Standard)",
      githubLocation: "https://github.com/ForgeCrux/api-linting-standard.git",
      url: "https://probestack.io/api-linting-standard",
      cardContent: "Duplicate entry – same as above. Can be used for multi-region or secondary organization deployments with customised environment variables.",
    },
    {
      id: 2,
      name: "API Linting (Custom)",
      githubLocation: "https://github.com/ForgeCrux/api-linting-custom.git",
      url: "https://probestack.io/api-linting-custom",
    },
    {
      id: 3,
      name: "Apigee Linting (Standard)",
      githubLocation: "https://github.com/ForgeCrux/apigee-linting-standard.git",
      url: "https://probestack.io/apigee-linting-standard",
    },
    {
      id: 4,
      name: "Apigee Linting (Custom)",
      githubLocation: "https://github.com/ForgeCrux/apigee-linting-custom.git",
      url: "https://probestack.io/apigee-linting-custom",
    },
    {
      id: 5,
      name: "Apigee CORS",
      githubLocation: "https://github.com/ForgeCrux/apigee-cors.git",
      url: "https://probestack.io/apigee-cors",
    },
    {
      id: 6,
      name: "Apigee Enterprise Logging",
      githubLocation: "https://github.com/ForgeCrux/apigee-logging.git",
      url: "https://probestack.io/apigee-logging",
    },
    {
      id: 7,
      name: "Apigee Security (API Key, Oauth2.0, JWT, OIDC, DPoP, mTLS)",
      githubLocation: "https://github.com/ForgeCrux/apigee-security.git",
      url: "https://probestack.io/apigee-security",
    },
    {
      id: 8,
      name: "Apigee Error Handling",
      githubLocation: "https://github.com/ForgeCrux/apigee-error-handling.git",
      url: "https://probestack.io/apigee-error-handling",
    },
    {
      id: 9,
      name: "Apigee Traffic Management",
      githubLocation: "https://github.com/ForgeCrux/apigee-traffic-management.git",
      url: "https://probestack.io/apigee-traffic-management",
    },
    {
      id: 10,
      name: "Apigee Transformation",
      githubLocation: "https://github.com/ForgeCrux/apigee-transformation.git",
      url: "https://probestack.io/apigee-transformation",
    },
     {
      id: 11,
      name: "Data Encryption",
      githubLocation: "https://github.com/ForgeCrux/data-encryption.git",
      url: "https://probestack.io/data-encryption",
    },
     {
      id: 12,
      name: "Data Decryption",
      githubLocation: "https://github.com/ForgeCrux/data-decryption.git",
      url: "https://probestack.io/data-decryption",
    },
    {
      id: 13,
      name: "HIPAA Safe API",
      githubLocation: "https://github.com/ForgeCrux/hipaa.git",
      url: "https://probestack.io/hipaa",
    },
  ];

  return (
    <div className="min-h-screen bg-background" style={{ backgroundColor: '#0e172a' }}>
      <div className="mx-auto max-w-7xl px-4 p-2">
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-foreground mb-2">Framework</h1>
          <p className="text-muted-foreground">
            Manage API/Apigee X framework configurations, GitHub locations and test url.
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-teal-600 dark:bg-teal-700 text-white">
                    <th className="px-6 py-4 text-left text-sm font-semibold border-b border-teal-700 dark:border-teal-800">
                      Framework Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold border-b border-teal-700 dark:border-teal-800">
                      GitHub Location
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold border-b border-teal-700 dark:border-teal-800">
                      Test URL
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {frameworks.map((framework, index) => (
                    <tr
                      key={framework.id}
                      className={`${
                        index % 2 === 0
                          ? "bg-background-card"
                          : "bg-background-elevated"
                      } hover:bg-background-light transition-colors`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {framework.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground/80">
                        {framework.githubLocation || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground/80">
                        {framework.url || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-8">
          {frameworks.map((framework) => (
            <div key={framework.id} className="space-y-4">
              {/* Framework Name as Header */}
              <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">
                {framework.name}
              </h2>
              
              {/* Full Width Card with Dummy Content */}
              <Card className="w-full">
               <CardContent className="p-6">
                  <p className="text-sm text-foreground/80">
                    {framework.cardContent}
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
