import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Layers, TestTube, Rocket, Shield,
  ChevronRight, ChevronLeft, Activity, Zap, ClipboardCheck,
  Server as ServerIcon, Globe, Cpu,
  ScrollText,
  AlertCircle, Clock, Database, Target, BarChart2,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── data ────────────────────────────────────────────────
const gatewayGroups = [
  {
    name: 'Apigee X',
    icon: Globe,
    color: '#3b82f6',
    items: [
      { label: 'Proxy',       gateway: 'Apigee X', resource: 'Proxy',         path: '/proxy-generate', onboarding: true  },
      { label: 'Shared Flow', gateway: 'Apigee X', resource: 'Shared Flow',   path: '/proxy-generate', onboarding: true  },
      { label: 'Config',      gateway: 'Apigee X', resource: 'Target Server', path: '/proxy-generate', onboarding: false },
    ],
  },
  {
    name: 'Kong Konnect',
    icon: Cpu,
    color: '#10b981',
    items: [
      { label: 'Gateway Services', gateway: 'Kong', resource: 'Gateway Services', path: '/kong-generate', onboarding: true  },
      { label: 'Gateway Builder',  gateway: 'Kong', resource: 'Gateway Builder',  path: '/kong-generate', onboarding: false },
    ],
  },
  {
    name: 'ForgeSphere Gateway',
    renderName: () => <>ForgeSphere <span className="font-normal normal-case tracking-normal">Gateway</span></>,
    icon: ServerIcon,
    color: '#ff5b1f',
    items: [
      { label: 'API',      gateway: 'ForgeSphere Gateway', resource: 'Proxy',           path: '/fs-gateway-generate', onboarding: true },
      { label: 'Function', gateway: 'ForgeSphere Gateway', resource: 'Shared Function', path: '/fs-gateway-generate', onboarding: true },
      { label: 'Config',          path: '/fs-gateway/config' },
    ],
  },
  {
    name: 'MuleSoft',
    icon: Layers,
    color: '#6366f1',
    disabled: true,
    items: [
      { label: 'Proxy',       disabled: true },
      { label: 'Shared Flow', disabled: true },
    ],
  },
];

const navSections = [
  {
    header: 'Lifecycle',
    items: [
      {
        id: 'proxy-manager',
        label: 'Proxy',
        icon: Layers,
        hasSubmenu: true,
        submenuType: 'gateway',
      },
    ],
  },
  {
    header: 'Management',
    items: [
      { id: 'audit-logs', label: 'Audit Logs', icon: ScrollText, path: '/audit-logs' },
    ],
  },
  {
    header: "Publish & Test",
    items: [
      { id: 'api-deploy', label: 'API Deploy', icon: Rocket, path: '/api-deploy' },
      {
        id: 'test',
        label: 'Test',
        icon: TestTube,
        path: '/testing',
      },
      {
        id: 'governance',
        label: 'Governance',
        icon: Shield,
        hasSubmenu: true,
        submenuType: 'list',
        subItems: [
          { label: 'Compliance',       path: '/governance',       icon: Shield        },
          { label: 'Framework',        path: '/framework',        icon: ClipboardCheck },
          { label: 'Automation',       path: '/automation',       icon: Zap           },
        ],
      },
      {
        id: 'monitoring',
        label: 'Monitoring',
        icon: Activity,
        hasSubmenu: true,
        submenuType: 'list',
        subItems: [
          { label: 'API Monitoring',      path: '/proxy-monitoring',      icon: Activity    },
          { label: 'Error Code Analysis', path: '/error-code-analysis',   icon: AlertCircle },
          { label: 'Latency Analysis',    path: '/latency-analysis',      icon: Clock       },
          { label: 'Cache Performance',   path: '/cache-performance',     icon: Database    },
          { label: 'Target Performance',  path: '/target-performance',    icon: Target      },
          { label: 'Report',              path: '/monitoring-report',     icon: BarChart2   },
        ],
      },
    ],
  },
];

// ─── helpers ───────────────────────────────────────────
function isProxyPath(p)      { return ['/proxy-generate', '/kong-generate', '/gateway', '/fs-gateway'].some((x) => p.startsWith(x)); }
function isTestPath(p)       { return p === '/testing'; }
function isGovernancePath(p) { return ['/governance', '/framework', '/automation'].includes(p); }
function isMonitoringPath(p) {
  return ['/proxy-monitoring', '/error-code-analysis', '/latency-analysis', '/cache-performance', '/target-performance', '/monitoring-report'].includes(p);
}

/* ─── Main Sidebar ────────────────────────────────────── */
export default function Sidebar({ activePage, isMobileOpen, onMobileClose }) {
  const location  = useLocation();
  const navigate  = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem('fs_sidebar_collapsed') !== 'false'; } catch { return true; }
  });

  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const [openMenus, setOpenMenus] = useState(() => ({
    'proxy-manager': isProxyPath(location.pathname),
    test:            isTestPath(location.pathname),
    governance:      isGovernancePath(location.pathname),
    monitoring:      isMonitoringPath(location.pathname),
  }));

  const sidebarRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem('fs_sidebar_collapsed', isCollapsed); } catch {}
  }, [isCollapsed]);

  // 🔥 FIX: content moves ONLY on manual toggle (click), NOT on hover
  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', isCollapsed);
    return () => { document.body.classList.remove('sidebar-collapsed'); };
  }, [isCollapsed]);

  // 🔥 Only called when mouse leaves the sidebar entirely
  const handleSidebarMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsHovered(false);
    }, 180);
  };

  // 🔥 Called when mouse enters any icon button
  const handleIconMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  // 🔥 Called when mouse enters any submenu container (to keep expanded)
  const handleSubmenuMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const expanded = !isCollapsed || isHovered;

  const toggleCollapse = () => setIsCollapsed((p) => !p);

  const toggleMenu = (id) => setOpenMenus((p) => ({ ...p, [id]: !p[id] }));

  const handleNavClick = (item, e) => {
    if (expanded) {
      if (item.hasSubmenu) {
        toggleMenu(item.id);
      } else {
        navigate(item.path);
        onMobileClose?.();
      }
    } else {
      if (!item.hasSubmenu && item.path) {
        navigate(item.path);
        onMobileClose?.();
      }
    }
  };

  const handleGatewayNavigate = (sub) => {
    if (sub.gateway) {
      localStorage.setItem('probeStack_proxySelectedGateway', sub.gateway);
      localStorage.setItem('probeStack_proxyResourceType', sub.resource);
      navigate(sub.path, {
        state: {
          selectedGateway: sub.gateway,
          resourceType:    sub.resource,
          openOnboarding:  Boolean(sub.onboarding),
        },
      });
    } else {
      navigate(sub.path);
    }
    onMobileClose?.();
  };

  const isItemActive = (item) => {
    const p = location.pathname;
    switch (item.id) {
      case 'proxy-manager':         return isProxyPath(p);
      case 'audit-logs':            return p === '/audit-logs';
      case 'api-deploy':            return p.startsWith('/api-deploy');
      case 'test':                  return isTestPath(p);
      case 'governance':            return isGovernancePath(p);
      case 'monitoring':            return isMonitoringPath(p);
      default:                      return item.id === activePage;
    }
  };

  const isSubItemActive = (sub) => {
    const sp = `${location.pathname}${location.search}`;
    return sp === sub.path || location.pathname === sub.path;
  };

  const renderNav = (forMobile = false) => {
    const isExpanded = forMobile || expanded;
    const collapsed = !isExpanded;

    return (
      <div className="flex h-full flex-col">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -left-8 top-10 h-56 w-40 rounded-full opacity-[0.08] blur-3xl"
            style={{ background: 'radial-gradient(circle, #ff5b1f, transparent 70%)' }}
          />
          <div
            className="absolute bottom-20 left-4 h-40 w-32 rounded-full opacity-[0.05] blur-3xl"
            style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }}
          />
        </div>

        <nav
          className="relative flex-1 overflow-y-auto navbar-scrollbar"
          style={{ padding: collapsed ? '16px 8px' : '16px 12px' }}
        >
          {/* ── "Main Menu" heading — ALWAYS RENDERED, hidden in collapsed ── */}
          <div
            className={cn(
              'mb-3 px-3 overflow-hidden whitespace-nowrap',
              collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-400">
              Main Menu
            </p>
          </div>

          <div className={cn('space-y-3', collapsed && 'space-y-1')}>
            {navSections.map((section, sIdx) => (
              <div key={sIdx}>
                {/* ── SECTION HEADER — Always rendered to keep space, hidden when collapsed ── */}
                {section.header && (
                  <div
                    className={cn(
                      'mb-1 px-3 overflow-hidden whitespace-nowrap',
                      collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-400">
                      {section.header}
                    </p>
                  </div>
                )}

                {collapsed && !section.header && sIdx > 0 && (
                  <div className="mx-auto my-3 h-px rounded-full bg-white/[0.06]" />
                )}

                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isItemActive(item);
                    const isOpen   = openMenus[item.id];

                    return (
                      <div key={item.id}>
                        {/* ── primary button ── */}
                        <button
                          onClick={(e) => handleNavClick(item, e)}
                          onMouseEnter={handleIconMouseEnter} // 🔥 Expand on icon hover
                          className={cn(
                            'group relative flex w-full rounded-xl transition-all duration-150 min-w-0',
                            collapsed
                              ? 'flex-col items-center justify-center gap-0 px-1 py-2.5'
                              : 'flex-row items-center gap-3 px-3 py-2.5 text-sm font-medium',
                            isActive
                              ? (collapsed
                                  ? 'bg-gradient-to-r from-[#ff5b1f]/20 via-[#ff5b1f]/10 to-[#ff5b1f]/5 text-[#ff8a5c]'
                                  : 'bg-gradient-to-r from-[#ff5b1f]/20 via-[#ff5b1f]/10 to-[#ff5b1f]/5 text-[#ff8a5c] border-l-2 border-l-[#ff8a5c]/80'
                                )
                              : 'text-gray-200 hover:bg-white/[0.05] hover:text-white',
                          )}
                        >
                          {/* ── ICON ── */}
                          <Icon
                            style={{ width: collapsed ? 18 : 16, height: collapsed ? 18 : 16 }}
                            className={cn(
                              'shrink-0 transition-colors',
                              isActive
                                ? 'text-[#ff5b1f]'
                                : 'text-gray-300 group-hover:text-white',
                            )}
                          />

                          {/* ── LABEL — ONLY when expanded ── */}
                          {!collapsed && (
                            <>
                              <span className="flex-1 min-w-0 text-left leading-none whitespace-nowrap overflow-hidden">
                                {item.renderLabel ? item.renderLabel() : item.label}
                              </span>
                              {item.hasSubmenu && (
                                <ChevronRight
                                  style={{ width: 14, height: 14 }}
                                  className={cn(
                                    'shrink-0 text-gray-400 transition-transform duration-200',
                                    isOpen && 'rotate-90',
                                  )}
                                />
                              )}
                            </>
                          )}

                          {/* collapsed: submenu indicator dot */}
                          {collapsed && item.hasSubmenu && (
                            <span
                              className={cn(
                                'absolute -right-0.5 top-1.5 h-2 w-2 rounded-full border-2 border-[#0b0e21] transition-colors',
                                'bg-gray-700 group-hover:bg-gray-500',
                              )}
                            />
                          )}
                        </button>

                        {/* ── gateway submenu (expanded only) ── */}
                        {!collapsed && item.hasSubmenu && item.submenuType === 'gateway' && isOpen && (
                          <div
                            className="ml-3 mt-1 space-y-3 border-l border-white/[0.06] pl-3 pb-2"
                            onMouseEnter={handleSubmenuMouseEnter} // 🔥 Keep expanded when hovering submenu
                          >
                            {gatewayGroups.map((group) => {
                              const GIcon = group.icon;
                              return (
                                <div key={group.name}>
                                  <div
                                    className={cn(
                                      'mb-1 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.18em] overflow-hidden whitespace-nowrap',
                                      group.disabled ? 'text-gray-500' : 'text-gray-300',
                                    )}
                                  >
                                    <GIcon style={{ width: 12, height: 12 }} className="shrink-0" />
                                    <span className="truncate">
                                      {group.renderName ? group.renderName() : group.name}
                                    </span>
                                    {group.disabled && (
                                      <span className="ml-1 rounded bg-gray-800 px-1 py-0.5 text-[9px] normal-case text-gray-400 shrink-0">
                                        soon
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-0.5">
                                    {group.items.map((sub) => {
                                      const subActive =
                                        !group.disabled && !sub.disabled &&
                                        location.pathname === sub.path &&
                                        (sub.gateway
                                          ? localStorage.getItem('probeStack_proxySelectedGateway') === sub.gateway &&
                                            localStorage.getItem('probeStack_proxyResourceType') === sub.resource
                                          : true);
                                      return (
                                        <button
                                          key={sub.label}
                                          disabled={group.disabled || sub.disabled}
                                          onClick={() => !group.disabled && !sub.disabled && handleGatewayNavigate(sub)}
                                          className={cn(
                                            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors min-w-0',
                                            group.disabled || sub.disabled
                                              ? 'cursor-not-allowed text-gray-500'
                                              : subActive
                                                ? 'bg-[#ff5b1f]/10 text-[#ff8a5c]'
                                                : 'text-gray-300 hover:bg-white/[0.04] hover:text-white',
                                          )}
                                        >
                                          <span className={cn('h-1 w-1 shrink-0 rounded-full', subActive ? 'bg-[#ff5b1f]' : 'bg-gray-500')} />
                                          <span className="truncate">{sub.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* ── list submenu (expanded only) ── */}
                        {!collapsed && item.hasSubmenu && item.submenuType === 'list' && isOpen && (
                          <div
                            className="ml-3 mt-0.5 space-y-0.5 border-l border-white/[0.06] pl-3 pb-1"
                            onMouseEnter={handleSubmenuMouseEnter} // 🔥 Keep expanded when hovering submenu
                          >
                            {item.subItems.map((sub) => {
                              const SubIcon = sub.icon;
                              const subActive = isSubItemActive(sub);
                              return (
                                <button
                                  key={sub.label}
                                  onClick={() => { navigate(sub.path); onMobileClose?.(); }}
                                  className={cn(
                                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs font-medium transition-colors min-w-0',
                                    subActive
                                      ? 'bg-[#ff5b1f]/10 text-[#ff8a5c]'
                                      : 'text-gray-300 hover:bg-white/[0.04] hover:text-white',
                                  )}
                                >
                                  <SubIcon
                                    style={{ width: 14, height: 14 }}
                                    className={cn('shrink-0', subActive ? 'text-[#ff5b1f]' : 'text-gray-400')}
                                  />
                                  <span className="truncate">{sub.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </div>
    );
  };

  // ── desktop sidebar ──
  return (
    <>
      <aside
        ref={sidebarRef}
        onMouseLeave={handleSidebarMouseLeave} // 🔥 Only collapse when mouse leaves sidebar
        className={cn(
          'fixed bottom-0 left-0 top-16 z-40 hidden lg:flex lg:flex-col',
          expanded ? 'w-56' : 'w-16',
        )}
        style={{
          background: 'linear-gradient(180deg, rgba(11,14,33,0.97) 0%, rgba(8,10,24,0.99) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          transition: 'width 500ms cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'width',
        }}
      >
        {renderNav(false)}

        {/* collapse toggle button */}
        <button
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'group absolute -right-3.5 top-8 z-50',
            'flex h-7 w-7 items-center justify-center rounded-full',
            'border border-white/[0.1] bg-[#0b0e21]',
            'shadow-[0_2px_14px_rgba(0,0,0,0.55)]',
            'transition-all duration-200',
            'hover:border-[#ff5b1f]/50 hover:bg-[#ff5b1f]/10 hover:shadow-[0_0_14px_rgba(255,91,31,0.28)]',
          )}
        >
          <ChevronLeft
            style={{ width: 14, height: 14 }}
            className={cn(
              'text-gray-500 transition-all duration-300 group-hover:text-[#ff8a5c]',
              !isCollapsed && 'rotate-180',
            )}
          />
        </button>
      </aside>

      {/* mobile overlay sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close sidebar"
            className="absolute inset-0 h-full w-full bg-black/60 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside
            className="absolute left-0 top-0 flex h-full w-72 flex-col"
            style={{
              background: 'linear-gradient(180deg, rgba(11,14,33,0.98) 0%, rgba(8,10,24,1) 100%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRight: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3 cursor-pointer hover:opacity-85 transition-opacity"
              onClick={() => { window.location.href = 'https://forgesphere.probestack.io'; }}
            >
              <img
                src="/assets/justlogo.png"
                alt="ForgeGateway"
                className="h-8 w-auto"
                onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
              />
              <div className="flex flex-col">
                <span className="text-[0.6rem] leading-tight text-gray-500">ProbeStack</span>
                <span
                  className="font-heading text-base font-extrabold leading-tight"
                  style={{
                    background: 'linear-gradient(90deg,#ff5b1f,#ffb400 40%,#1fbf9a)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  ForgeGateway
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">{renderNav(true)}</div>
          </aside>
        </div>
      )}
    </>
  );
}