import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppLayout from './components/ui/AppLayout';
import { LayoutProvider } from './context/LayoutContext';
import ProxyGeneration from './pages/ProxyGeneration';
import { ProxyEditor } from './pages/ProxyEditor';
import KongGeneration from './pages/KongGeneration';
import APIDeploy from './pages/APIDeploy';
import APITest from './pages/APITest';
import Profile from './pages/Profile';
import AuditLogs from './pages/AuditLogs';
import CicdAutomationPage from './pages/CicdAutomationPage';
import Governance from './pages/Governance';
import { ApigeeXConfig } from './pages/config/ApigeeXConfig';
import { KongKonnectConfig } from './pages/config/KongKonnectConfig';
import { Automation } from './pages/Automation';
import { Framework } from './pages/Framework';
import Test from './pages/Test';
import ProxyMonitoring from './pages/ProxyMonitoring.jsx';
import ErrorCodeAnalysis from './pages/ErrorCodeAnalysis.jsx';
import LatencyAnalysis from './pages/LatencyAnalysis.jsx';
import CachePerformance from './pages/CachePerformance.jsx';
import TargetPerformance from './pages/TargetPerformance.jsx';
import MonitoringReport from './pages/MonitoringReport.jsx';
import ForgeSphereGateway from './pages/ForgeSphereGateway.jsx';
import FsGatewayProxyGeneration from './pages/FsGatewayProxyGeneration.jsx';
import FsGatewayConfig from './pages/FsGatewayConfig.jsx';
import GatewayPageWrapper from './components/ui/GatewayPageWrapper.jsx';
import { ProxiesView } from './pages/Gateway/ProxiesView.jsx';
import { SharedFlowsView } from './pages/Gateway/SharedFlowsView.jsx';
import { ProxyDetailViewWrapper, SharedFlowDetailViewWrapper } from './pages/GatewayOverview.jsx';
import APIProductsManager from './pages/Gateway/APIProductsManager.jsx';
import ApigeeAppsManager from './pages/Gateway/ApigeeAppsManager.jsx';
import { DevelopersView } from './pages/Gateway/DevelopersView.jsx';
import ApigeeMainPage from './pages/Apigee/ApigeePage.jsx';
import { isAuthenticated, redirectToLogin } from './utils/auth.js';

function AuthHandler() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  // Re-checked on every navigation (not just on mount) so that a logout
  // performed in the main app is picked up the next time the user does
  // anything here, without requiring a manual page reload.
  useEffect(() => {
    // if (isAuthenticated()) {
      setLoading(false);
    //   return;
    // }

    // redirectToLogin();
  }, [location.pathname]);

  // Show a loading state while checking auth (prevents flashing)
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Render routes once authenticated
  return (
    <Routes>
      {/* Routes with their own layout (no shared AppLayout) */}
      <Route path="/" element={<Navigate to="/gateway" replace />} />
      <Route path="/gateway/*" element={<ForgeSphereGateway showHeader={true} />} />

      {/* Authenticated routes — Header + Sidebar rendered once via AppLayout */}
      <Route element={<AppLayout />}>
        <Route path="/proxy-generate" element={<ProxyGeneration gatewayMode="apigee" />} />
        <Route path="/proxy-generate/:id" element={<ProxyGeneration gatewayMode="apigee" />} />
        <Route path="/proxy-editor" element={<ProxyEditor />} />
        <Route path="/kong-generate" element={<KongGeneration />} />
        <Route path="/kong-generate/:id" element={<KongGeneration />} />
        <Route path="/api-deploy" element={<APIDeploy />} />
        <Route path="/api-deploy/history" element={<APIDeploy />} />
        <Route path="/api-deploy/:microserviceId/deploy" element={<APIDeploy />} />
        <Route path="/gateway/api-deploy/:microserviceId/deploy" element={<APIDeploy isGateway={true} />} />
        <Route path="/governance" element={<Governance />} />
        <Route path="/framework" element={<Framework />} />
        <Route path="/automation" element={<Automation />} />
        <Route path="/proxy-monitoring" element={<ProxyMonitoring />} />
        <Route path="/error-code-analysis" element={<ErrorCodeAnalysis />} />
        <Route path="/latency-analysis" element={<LatencyAnalysis />} />
        <Route path="/cache-performance" element={<CachePerformance />} />
        <Route path="/target-performance" element={<TargetPerformance />} />
        <Route path="/monitoring-report" element={<MonitoringReport />} />
        <Route path="/testing" element={<Test />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/cicd-automation" element={<CicdAutomationPage />} />
        <Route path="/config/apigee-x" element={<ApigeeXConfig />} />
        <Route path="/config/apigee-x/add" element={<ApigeeXConfig />} />
        <Route path="/config/kong" element={<KongKonnectConfig />} />
        <Route path="/config/kong/add" element={<KongKonnectConfig />} />
        {/* ForgeSphere Gateway proxy/shared-function generation (same wizard as Apigee X) */}
        <Route path="/fs-gateway-generate" element={<FsGatewayProxyGeneration />} />
        <Route path="/fs-gateway-generate/:id" element={<FsGatewayProxyGeneration />} />
        <Route path="/fs-gateway/config" element={<FsGatewayConfig />} />
        {/* ForgeSphere Gateway sub-pages rendered within main layout */}
        <Route path="/fs-gateway/proxy" element={<GatewayPageWrapper component={ProxiesView} />} />
        <Route path="/fs-gateway/proxy/:proxyName" element={<GatewayPageWrapper component={ProxyDetailViewWrapper} backPath="/fs-gateway/proxy" />} />
        <Route path="/fs-gateway/shared-flow" element={<GatewayPageWrapper component={SharedFlowsView} />} />
        <Route path="/fs-gateway/shared-flow/:sfName" element={<GatewayPageWrapper component={SharedFlowDetailViewWrapper} backPath="/fs-gateway/shared-flow" />} />
        <Route
          path="/fs-gateway/consumer"
          element={
            <GatewayPageWrapper
              component={ApigeeAppsManager}
              orgId="gen-ai-poc-onboarding"
              envId="dev"
              developerEmail="jagruti.d@krelixir.com"
              showAppIdSec={false}
            />
          }
        />
        <Route
          path="/fs-gateway/products"
          element={
            <GatewayPageWrapper
              component={APIProductsManager}
              onBack={() => {}}
              orgId="gen-ai-poc-onboarding"
              envId="dev"
              developerEmail="jagruti.d@krelixir.com"
            />
          }
        />
        <Route path="/fs-gateway/developer" element={<GatewayPageWrapper component={DevelopersView} />} />
        <Route path="/fs-gateway/env-config" element={<ApigeeMainPage showHeader={false} />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <LayoutProvider>
      <AuthHandler />
    </LayoutProvider>
  );
}

export default App;
