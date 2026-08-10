import React from "react";
import "./Spinner.css";

function Spinner({ size = 44, showTrack = true }) {
  const sizeClass = size <= 32 ? "h-8 w-8" : size <= 44 ? "h-11 w-11" : "h-14 w-14";
  const insetClass = showTrack ? "inset-1" : "inset-1.5";

  return (
    <div className={`relative inline-block ${sizeClass}`}>
      <div className="h-full w-full animate-spin rounded-full bg-[conic-gradient(#00C9A7,#00D4FF,#ff5b1f,#00C9A7)] blur-[0.5px]" />
      <div className={`absolute ${insetClass} rounded-full bg-[#0b0f14]`} />
      {showTrack && <div className="absolute inset-0 rounded-full border border-white/5" />}
    </div>
  );
}

export default Spinner;

export function ProbestackSpinner({ text = "" }) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 py-10">
      <Spinner />
      <div className="text-xs tracking-[0.05em] text-white/55">{text}</div>
    </div>
  );
}
