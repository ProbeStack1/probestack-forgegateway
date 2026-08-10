import React, { useEffect } from 'react';
import { FiChevronDown, FiSettings } from 'react-icons/fi';
import { X } from 'lucide-react';
import { C } from '../../utils/constants';
import { cn } from '../../lib/utils';
import { Card as UICard, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge as UIBadge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';

const cx = cn;

const COLOR_KEY = {
  [C.green]: 'success',
  [C.red]: 'destructive',
  [C.amber]: 'warning',
  [C.orange]: 'primary',
  [C.teal]: 'teal',
  [C.cyan]: 'cyan',
  [C.purple]: 'purple',
  [C.white]: 'white',
  [C.muted]: 'muted',
  [C.dim]: 'dim',
  '#10a37f': 'openai',
  '#cc774e': 'anthropic',
  '#4285f4': 'google',
  '#ff9900': 'aws',
};

const TEXT_CLASS = {
  success: 'text-green-400',
  destructive: 'text-red-400',
  warning: 'text-yellow-400',
  primary: 'text-primary',
  teal: 'text-teal-400',
  cyan: 'text-cyan-400',
  purple: 'text-purple-400',
  white: 'text-white',
  muted: 'text-gray-400',
  dim: 'text-gray-500',
  openai: 'text-[#10a37f]',
  anthropic: 'text-[#cc774e]',
  google: 'text-[#4285f4]',
  aws: 'text-[#ff9900]',
};

const DOT_CLASS = {
  success: 'bg-green-400',
  destructive: 'bg-red-400',
  warning: 'bg-yellow-400',
  primary: 'bg-primary',
  teal: 'bg-teal-400',
  cyan: 'bg-cyan-400',
  purple: 'bg-purple-400',
  white: 'bg-white',
  muted: 'bg-gray-400',
  dim: 'bg-gray-500',
  openai: 'bg-[#10a37f]',
  anthropic: 'bg-[#cc774e]',
  google: 'bg-[#4285f4]',
  aws: 'bg-[#ff9900]',
};

const SOFT_CLASS = {
  success: 'border-green-500/25 bg-green-500/15 text-green-400',
  destructive: 'border-red-500/25 bg-red-500/15 text-red-400',
  warning: 'border-yellow-500/25 bg-yellow-500/15 text-yellow-400',
  primary: 'border-primary/25 bg-primary/15 text-primary',
  teal: 'border-teal-500/25 bg-teal-500/15 text-teal-400',
  cyan: 'border-cyan-500/25 bg-cyan-500/15 text-cyan-400',
  purple: 'border-purple-500/25 bg-purple-500/15 text-purple-400',
  white: 'border-white/20 bg-white/10 text-white',
  muted: 'border-gray-500/25 bg-gray-500/15 text-gray-400',
  dim: 'border-gray-600/25 bg-gray-600/15 text-gray-500',
  openai: 'border-[#10a37f]/25 bg-[#10a37f]/15 text-[#10a37f]',
  anthropic: 'border-[#cc774e]/25 bg-[#cc774e]/15 text-[#cc774e]',
  google: 'border-[#4285f4]/25 bg-[#4285f4]/15 text-[#4285f4]',
  aws: 'border-[#ff9900]/25 bg-[#ff9900]/15 text-[#ff9900]',
};

const BADGE_VARIANT = {
  success: 'success',
  destructive: 'destructive',
};

function keyFor(color) {
  return COLOR_KEY[color] || 'dim';
}

const tone = (color) => {
  const key = keyFor(color);
  return {
    badge: SOFT_CLASS[key],
    dot: DOT_CLASS[key],
    soft: SOFT_CLASS[key],
    glow: cx(SOFT_CLASS[key], 'shadow-[0_0_20px_-4px_var(--tw-shadow-color)]'),
  };
};

const textTone = (color) => TEXT_CLASS[keyFor(color)] || 'text-white';

const Badge = ({ c = C.teal, children, className = '' }) => {
  const key = keyFor(c);
  const variant = BADGE_VARIANT[key];

  if (variant) {
    return (
      <UIBadge variant={variant} className={className}>
        {children}
      </UIBadge>
    );
  }

  return (
    <UIBadge variant="outline" className={cx(SOFT_CLASS[key], className)}>
      {children}
    </UIBadge>
  );
};

const GLOW_SHADOW = {
  success: 'shadow-soft',
  destructive: 'shadow-soft',
  warning: 'shadow-soft',
  primary: 'shadow-soft',
  teal: 'shadow-soft',
};

const Card = ({ children, glow, className = '', style }) => (
  <UICard
    className={cx(
      'p-5 font-body',
      glow && cx('border-current/30', GLOW_SHADOW[keyFor(glow)]),
      className
    )}
    style={style}
  >
    {children}
  </UICard>
);

// Onboarding-specific Card with a more visible border + solid background.
// Used inside src/pages/Onboarding/* so we don't have to change the
// global src/components/ui/card.jsx (which is shared with every other page).
const OnbCard = ({ children, className = '', style }) => (
  <div
    className={cx('rounded-xl text-white shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_2px_8px_rgba(0,0,0,0.25)] font-body p-5', className)}
    style={{
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      borderColor: '#334155',
      borderWidth: '1px',
      ...style,
    }}
  >
    {children}
  </div>
);

const btnVariantProps = {
  primary: { variant: 'default' },
  teal: { variant: 'default', className: 'bg-teal-500 text-white hover:bg-teal-600' },
  ghost: { variant: 'outline' },
  danger: { variant: 'destructive' },
  green: { variant: 'outline', className: 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20' },
  purple: { variant: 'outline', className: 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20' },
};

const Btn = ({ children, onClick, v = 'primary', sm, disabled, className = '' }) => {
  const preset = btnVariantProps[v] || btnVariantProps.primary;

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant={preset.variant}
      size={sm ? 'sm' : 'default'}
      className={cx(preset.className, className)}
    >
      {children}
    </Button>
  );
};

const Toggle = ({ on, onChange }) => (
  <Switch checked={!!on} onCheckedChange={onChange} />
);

const Stat = ({ label, val, sub, col = C.white, icon }) => (
  <div
    className="rounded-xl px-4 py-3.5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_2px_8px_rgba(0,0,0,0.25)]"
    style={{
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      borderColor: '#334155',
      borderWidth: '1px',
    }}
  >
    <div className="flex items-start justify-between">
      <div>
        <div className="mb-1.5 text-[10px] uppercase tracking-[0.1em] text-gray-400">{label}</div>
        <div className="font-body text-2xl font-extrabold leading-none text-white">{val}</div>
        {sub && <div className="mt-1 text-[10px] text-gray-500">{sub}</div>}
      </div>
      {icon && (
        <div className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone(col).soft)}>
          {icon}
        </div>
      )}
    </div>
  </div>
);

const SectionHead = ({ title, sub, action }) => (
  <div className="mb-[18px] flex items-start justify-between">
    <div>
      <div className="font-heading text-3xl font-bold leading-9 tracking-normal text-white">{title}</div>
      {sub && <div className="mt-1 text-sm leading-5 text-gray-400">{sub}</div>}
    </div>
    {action}
  </div>
);

const Tabs = ({ tabs, active, onChange }) => (
  <div className="mb-4 flex flex-wrap gap-1.5">
    {tabs.map(t => (
      <button
        key={t}
        onClick={() => onChange(t)}
        className={cx(
          'rounded-lg px-3.5 py-1.5 font-body text-[11px] font-semibold transition-all duration-200',
          active === t ? 'bg-primary text-white' : 'bg-dark-700/50 text-gray-400 hover:bg-dark-700 hover:text-gray-200'
        )}
      >
        {t}
      </button>
    ))}
  </div>
);

const Modal = ({ title, onClose, footer, children }) => {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[85vh] w-[80vw] max-w-[80vw] flex-col overflow-hidden rounded-xl border shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
        style={{
          backgroundColor: '#15192b',
          borderColor: '#334155',
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4 pr-12">
          <h2 className="font-heading text-lg font-semibold leading-none tracking-tight text-white">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-sm text-gray-400 opacity-70 transition-opacity hover:text-white focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
        {footer && (
          <div className="flex shrink-0 flex-col-reverse border-t border-border px-6 py-4 sm:flex-row sm:justify-end sm:space-x-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

const Inp = ({ label, value, onChange, placeholder, type = 'text', required, disabled }) => (
  <div className="mb-[18px]">
    {label && (
      <Label className="mb-1.5 block text-white">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
    )}
    <Input
      type={type}
      value={value}
      onChange={e => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  </div>
);

const selectClassName = cn(
  'h-11 w-full cursor-pointer rounded-lg px-3 text-sm text-white outline-none transition-all',
  'focus:outline-none focus:ring-2 focus:ring-primary/30'
);

const Sl = ({ label, value, onChange, opts, required }) => (
  <div className="mb-[18px]">
    {label && (
      <Label className="mb-1.5 block text-white">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
    )}
    <select
      value={value}
      onChange={e => onChange && onChange(e.target.value)}
      className={selectClassName}
      style={{ backgroundColor: '#0f172a80', borderColor: '#232942', borderWidth: '1px' }}
    >
      {opts.map(o => (
        <option key={o.v || o} value={o.v || o}>
          {o.l || o}
        </option>
      ))}
    </select>
  </div>
);

const THead = ({ cols }) => (
  <thead>
    <tr className="border-b border-border">
      {cols.map(c => (
        <th key={c} className="px-2.5 py-[7px] text-left text-[9px] font-bold uppercase tracking-[0.1em] text-gray-400">{c}</th>
      ))}
    </tr>
  </thead>
);

const ConfigDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const options = [
    { v: 'git', l: 'Git Configuration' },
    { v: 'gcs', l: 'Google Cloud Storage' },
    { v: 'standard', l: 'API Standard Linting' },
    { v: 'custom', l: 'Api Custom Linting' },
  ];

  const select = (v) => {
    onChange(v);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <Button
        type="button"
        variant={value ? 'default' : 'outline'}
        size="sm"
        className="gap-1.5"
        onClick={() => setIsOpen(open => !open)}
      >
        <FiSettings className="h-[13px] w-[13px]" />
        <span>Config</span>
        <FiChevronDown className={cx('h-3 w-3 transition-transform duration-200', isOpen && 'rotate-180')} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-[110%] z-[100] min-w-[200px] rounded-xl border border-border bg-background-card p-1.5 shadow-soft-lg">
          {options.map((opt) => (
            <button
              key={opt.v}
              onClick={() => select(opt.v)}
              className={cx(
                'flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-gray-300 transition-all duration-150 hover:bg-white/5 hover:text-white',
                value === opt.v && 'bg-white/10 text-white'
              )}
            >
              <FiSettings className="h-[13px] w-[13px] opacity-60" />
              {opt.l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConfigDropdown;

export {
  Badge,
  Card,
  OnbCard,
  CardContent,
  Stat,
  Btn,
  Toggle,
  SectionHead,
  Tabs,
  Modal,
  Inp,
  Sl,
  THead,
  ConfigDropdown,
  cx,
  tone,
  textTone,
};
