import React, { useEffect, useRef, useState } from 'react';

// --- Format helpers for turning raw epoch-ms timestamps into readable labels ---
export const formatClockTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
export const formatFullDateTime = (ts) =>
  ts ? new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' }) : '—';
export const formatMetricValue = (value, unit) => {
  const n = typeof value === 'number' ? value : parseFloat(value) || 0;
  const rounded = Number.isInteger(n) ? n : Math.round(n * 100) / 100;
  return `${rounded.toLocaleString()}${unit ? ` ${unit}` : ''}`;
};

// --- Catmull-Rom → cubic-Bézier smoothing, so the line reads as a soft curve instead of
// jagged straight segments (the look every modern analytics dashboard — Vercel, Linear,
// Stripe — uses for a time series). Falls back to a straight segment for 2 points.
const buildSmoothPath = (coords) => {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0][0]},${coords[0][1]}`;
  if (coords.length === 2) return `M ${coords[0][0]},${coords[0][1]} L ${coords[1][0]},${coords[1][1]}`;
  let d = `M ${coords[0][0]},${coords[0][1]}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? 0 : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
};

// --- Trend Chart: a smooth gradient-fill line with a tracking crosshair and a floating
// tooltip card — the current standard for time-series analytics UI (Vercel Analytics,
// Linear Insights, Stripe Dashboard). One point is always direct-labeled (the latest);
// every other point's exact value/time surfaces on hover instead of being printed on the
// chart, so the line stays clean at any density.
export const TrendChart = ({ points, color = '#ff5b1f', unit = '', label = '', emptyMessage, isExpanded = false }) => {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(280);
  const [hoverIndex, setHoverIndex] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const update = () => setWidth(el.clientWidth || 280);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!points || points.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-center text-gray-500 text-xs px-4">
        {emptyMessage}
      </div>
    );
  }

  const n = points.length;
  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const range = rawMax - rawMin || Math.max(Math.abs(rawMax), 1) * 0.2;
  const pad = range * 0.15;
  const scaleMin = rawMin >= 0 ? Math.max(0, rawMin - pad) : rawMin - pad;
  const scaleMax = rawMax + pad || 1;
  const span = scaleMax - scaleMin || 1;

  const topMargin = 18;
  const bottomSpace = 20;
  const plotHeight = isExpanded ? 210 : 92;
  const height = topMargin + plotHeight + bottomSpace;

  const xAt = (i) => (n === 1 ? width / 2 : (i / (n - 1)) * width);
  const yAt = (v) => topMargin + plotHeight * (1 - (v - scaleMin) / span);
  const coords = points.map((p, i) => [xAt(i), yAt(p.value)]);

  const linePath = buildSmoothPath(coords);
  const baselineY = topMargin + plotHeight;
  const areaPath = `${linePath} L ${coords[n - 1][0]},${baselineY} L ${coords[0][0]},${baselineY} Z`;

  const gridLevels = [1, 0.5, 0];
  const gradId = `trend-grad-${color.replace('#', '')}`;

  const handleMove = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const fraction = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    setHoverIndex(n === 1 ? 0 : Math.round(fraction * (n - 1)));
  };

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const hoveredCoord = hoverIndex !== null ? coords[hoverIndex] : null;
  const lastCoord = coords[n - 1];

  const tooltipWidthPx = 172;
  const halfTooltip = tooltipWidthPx / 2 + 6;
  const clampedLeft = hoveredCoord
    ? Math.min(Math.max(hoveredCoord[0], halfTooltip), Math.max(width - halfTooltip, halfTooltip))
    : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none cursor-crosshair"
      onMouseMove={handleMove}
      onMouseLeave={() => setHoverIndex(null)}
    >
      <svg width={width} height={height} className="block overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLevels.map((lvl) => {
          const y = topMargin + plotHeight * (1 - lvl);
          const val = scaleMin + span * lvl;
          return (
            <g key={lvl}>
              <line x1={0} x2={width} y1={y} y2={y} stroke="#232a42" strokeWidth="1" />
              <text x={2} y={y - 3} fontSize="9" fill="#5b6478" className="font-mono">
                {Math.round(val).toLocaleString()}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Direct label: only the latest point is ever labeled on the chart itself */}
        <circle cx={lastCoord[0]} cy={lastCoord[1]} r="4" fill={color} stroke="#1a1f33" strokeWidth="2" />

        <text x={2} y={height - 5} fontSize="9" fill="#5b6478">{formatClockTime(points[0].timestamp)}</text>
        <text x={width - 2} y={height - 5} fontSize="9" fill="#5b6478" textAnchor="end">{formatClockTime(points[n - 1].timestamp)}</text>

        {hoveredCoord && (
          <>
            <line x1={hoveredCoord[0]} x2={hoveredCoord[0]} y1={topMargin} y2={baselineY} stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity="0.65" />
            <circle cx={hoveredCoord[0]} cy={hoveredCoord[1]} r="4.5" fill={color} stroke="#1a1f33" strokeWidth="2" />
          </>
        )}
      </svg>

      {/* Floating tooltip card — every value a bare-hover reader needs, in one place */}
      {hovered && (
        <div
          className="absolute top-0 pointer-events-none z-20 rounded-lg border border-dark-600 bg-[#0e172a]/95 backdrop-blur-sm shadow-xl px-3 py-2"
          style={{ left: clampedLeft, width: tooltipWidthPx, transform: 'translateX(-50%)' }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[10px] uppercase tracking-wide text-gray-500 truncate">{label}</span>
          </div>
          <div className="text-base font-bold text-white leading-none">{formatMetricValue(hovered.value, unit)}</div>
          <div className="text-[10px] text-gray-500 mt-1">{formatFullDateTime(hovered.timestamp)}</div>
        </div>
      )}
    </div>
  );
};
