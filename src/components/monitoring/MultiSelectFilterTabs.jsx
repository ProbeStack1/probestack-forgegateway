import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// --- Cap on how many items (proxies, target hosts, ...) can be selected at once — each
// selected item gets its own tab with its own set of graphs rendered separately, so this
// also bounds how many parallel Apigee stats calls a single filter change can trigger. ---
export const MAX_SELECTED_OPTIONS = 5;

/**
 * Multi-select checkbox dropdown (max `maxSelected`) for picking one or more items — same
 * interaction model as API Monitoring's Proxy filter. Selection state is controlled by the
 * caller; this component only renders the dropdown UI and calls `onToggle(key)`.
 */
export function MultiSelectFilterDropdown({
  label,
  items,
  getItemLabel = (item) => item,
  getItemKey = (item) => item,
  selected,
  onToggle,
  loading = false,
  error = null,
  onRetry,
  loadingLabel = 'Loading...',
  errorLabel = 'Error loading options',
  emptyLabel = 'No options available',
  placeholderLabel = 'Select options',
  maxSelected = MAX_SELECTED_OPTIONS,
  minWidthClass = 'min-w-[160px]',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('relative', minWidthClass)} ref={dropdownRef}>
      <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">
        {label}
      </label>
      {loading ? (
        <div className="w-full h-9 flex items-center justify-center rounded-md border border-dark-700 bg-[#1a1f33] text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin mr-1" />
          <span className="text-xs">{loadingLabel}</span>
        </div>
      ) : error ? (
        <div className="w-full h-9 flex items-center justify-between px-3 rounded-md border border-red-500/50 bg-[#1a1f33] text-red-400 text-xs">
          <span>{errorLabel}</span>
          {onRetry && <button onClick={onRetry} className="ml-2 underline">Retry</button>}
        </div>
      ) : (
        <>
          <button
            onClick={() => setIsOpen((p) => !p)}
            disabled={items.length === 0}
            className="w-full h-9 pl-3 pr-8 text-left text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 hover:border-gray-500 transition-colors flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="truncate">
              {items.length === 0
                ? emptyLabel
                : selected.length === 0
                ? placeholderLabel
                : `${selected.length} selected`}
            </span>
            <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform shrink-0', isOpen && 'rotate-180')} />
          </button>
          {isOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 z-30 rounded-md border border-dark-700 bg-[#15192b] shadow-xl overflow-hidden max-h-80 overflow-y-auto">
              <div className="px-3 py-2 text-[10px] text-gray-500 border-b border-dark-700/60">
                Select up to {maxSelected} ({selected.length}/{maxSelected})
              </div>
              <div className="p-1.5">
                {items.map((item) => {
                  const key = getItemKey(item);
                  const isChecked = selected.includes(key);
                  const isDisabled = !isChecked && selected.length >= maxSelected;
                  return (
                    <label
                      key={key}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded text-sm text-gray-300 hover:bg-dark-800/60 cursor-pointer',
                        isDisabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
                      )}
                    >
                      <div className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0', isChecked ? 'border-primary bg-primary' : 'border-dark-600 bg-dark-800/70')}>
                        {isChecked && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <input type="checkbox" checked={isChecked} disabled={isDisabled} onChange={() => onToggle(key)} className="hidden" />
                      <span className="truncate">{getItemLabel(item)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Tab bar for switching between selected items' individual graph views. Callers only render
 * this when there's more than one selected item — a single selection needs no tab.
 */
export function FilterTabs({ items, activeItem, onSelect, icon: Icon, badgeCount }) {
  return (
    <div className="flex items-center gap-1 mb-5 border-b border-dark-700/60 overflow-x-auto">
      {items.map((item) => {
        const isActive = activeItem === item;
        return (
          <button
            key={item}
            onClick={() => onSelect(item)}
            className={cn(
              'relative shrink-0 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
              isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'
            )}
          >
            <span className="flex items-center gap-2">
              {Icon && <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-primary' : 'text-gray-600')} />}
              <span className="truncate max-w-[180px]">{item}</span>
              {typeof badgeCount === 'number' && (
                <span
                  className={cn(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none',
                    isActive ? 'bg-primary/20 text-primary' : 'bg-dark-800 text-gray-500'
                  )}
                >
                  {badgeCount}
                </span>
              )}
            </span>
            {isActive && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />}
          </button>
        );
      })}
    </div>
  );
}
