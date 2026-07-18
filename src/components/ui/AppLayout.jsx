import { Outlet, useLocation } from 'react-router-dom';
import { Globe, Cpu, Server as ServerIcon } from 'lucide-react';
import Header from './header';
import { useLayout } from '../../context/LayoutContext';

const GW_CONFIGS = {
  '/proxy-generate': {
    brand: 'Apigee',
    color: '#3b82f6',
    colorAlpha: (a) => `rgba(59,130,246,${a})`,
    icon: Globe,
  },
  '/kong-generate': {
    brand: 'Kong',
    color: '#10b981',
    colorAlpha: (a) => `rgba(16,185,129,${a})`,
    icon: Cpu,
  },
  '/fs-gateway-generate': {
    brand: 'ForgeSphere',
    color: '#ff5b1f',
    colorAlpha: (a) => `rgba(255,91,31,${a})`,
    icon: ServerIcon,
  },
  '/fs-gateway': {
    brand: 'ForgeSphere',
    color: '#ff5b1f',
    colorAlpha: (a) => `rgba(255,91,31,${a})`,
    icon: ServerIcon,
  },
};

function GatewayContextBanner() {
  const { pathname } = useLocation();

  const match = Object.entries(GW_CONFIGS).find(([key]) => pathname.startsWith(key));
  if (!match) return null;

  const [, cfg] = match;
  const Icon = cfg.icon;

  return (
    <div className="gw-strip-wrap">
      <div
        className="gw-strip-in"
        style={{
          background: 'linear-gradient(135deg, #0e1829 0%, #0b1220 100%)',
          border: `1px solid ${cfg.colorAlpha(0.3)}`,
          boxShadow: `0 2px 12px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.colorAlpha(0.07)}, 0 6px 24px ${cfg.colorAlpha(0.12)}`,
        }}
      >
        {/* Left accent + brand label */}
        <div className="gw-strip-brand" style={{ borderLeft: `2px solid ${cfg.color}` }}>
          <Icon style={{ width: 11, height: 11, color: cfg.color, flexShrink: 0 }} />
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            color: cfg.color,
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}>
            {cfg.brand}
          </span>
          <span aria-hidden="true" style={{ color: cfg.colorAlpha(0.4), fontSize: 9, lineHeight: 1 }}>•</span>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 9.5,
            fontWeight: 600,
            color: 'rgba(148,163,184,0.65)',
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}>
            API Gateway
          </span>
        </div>

        {/* Right: live pulse dot */}
        <span
          className="gw-dot-pulse"
          aria-hidden="true"
          style={{
            display: 'block',
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: cfg.color,
            boxShadow: `0 0 5px ${cfg.colorAlpha(0.7)}`,
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { hideNav } = useLayout();
  const { pathname } = useLocation();

  // remount banner (replay animation) whenever the active gateway changes
  const gwKey = Object.keys(GW_CONFIGS).find((k) => pathname.startsWith(k)) ?? 'none';

  return (
    <>
      <Header hideNav={hideNav} />
      <GatewayContextBanner key={gwKey} />
      <Outlet />
    </>
  );
}
