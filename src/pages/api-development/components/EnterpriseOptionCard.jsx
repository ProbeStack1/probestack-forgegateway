import React from 'react';
import { cn } from '../../../lib/utils';

export default function EnterpriseOptionCard({
  type = 'radio',
  name,
  checked,
  disabled = false,
  label,
  description,
  badge,
  onChange,
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 transition-all',
        disabled
          ? 'cursor-not-allowed border-dark-700 bg-[#0f172a]/40 opacity-60'
          : 'cursor-pointer border-dark-700 bg-[#0f172a]/50 hover:border-primary/60',
        checked && !disabled && 'border-primary bg-primary/10 shadow-[0_0_10px_rgba(255,91,31,0.22)]'
      )}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-1 h-3.5 w-3.5 accent-primary"
      />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
          {label}
          {badge && (
            <span className="rounded-full bg-dark-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-1 block text-xs leading-5 text-gray-400">{description}</span>
      </span>
    </label>
  );
}
