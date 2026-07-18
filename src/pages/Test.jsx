/**
 * Test — hosts APITest under the gateway's testing route.
 *
 * MCP testing was dropped from this codebase (ForgeGateway is API-gateway
 * scoped only); APITest renders in `embedded` mode (its own <Header> is
 * hidden so the parent shell owns the chrome).
 */
import APITest from './APITest';

export default function Test() {
  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ backgroundColor: '#0e172a' }} data-testid="test-page">
      <div className="flex-1 overflow-hidden">
        <APITest embedded />
      </div>
    </div>
  );
}
