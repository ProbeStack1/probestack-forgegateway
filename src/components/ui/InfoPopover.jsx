import { useState, useEffect, useRef } from 'react';
import { Info } from 'lucide-react';

const INFO_CONTENT = {
  functional: {
    title: 'Functional Requirements',
    description: 'Define what the microservice must do — its capabilities and behaviors.',
    items: [
      { label: 'Endpoints', example: 'POST /orders, GET /orders/{id}, DELETE /orders/{id}' },
      { label: 'Business Logic', example: 'Validate stock before confirming an order' },
      { label: 'Data Operations', example: 'Create, read, update, delete order records' },
      { label: 'Integrations', example: 'Call Payment Service after order is placed' },
      { label: 'Auth & Access', example: 'Only ADMIN role can delete orders' },
    ],
  },
  nonFunctional: {
    title: 'Non-Functional Requirements',
    description: 'Define how the microservice must perform — quality attributes.',
    items: [
      { label: 'Performance', example: 'p99 latency < 200ms under 500 concurrent users' },
      { label: 'Availability', example: '99.9% uptime SLA with auto-restart on failure' },
      { label: 'Scalability', example: 'Horizontally scalable; support 10k TPS at peak' },
      { label: 'Security', example: 'JWT auth, TLS 1.2+, no secrets in code' },
      { label: 'Observability', example: 'Structured JSON logs, /health and /metrics endpoints' },
    ],
  },
};

export default function InfoPopover({ type }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const content = INFO_CONTENT[type];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        className="text-gray-500 hover:text-primary transition-colors focus:outline-none"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="absolute left-5 top-0 z-50 w-72 rounded-xl border border-dark-700 shadow-2xl"
          style={{ backgroundColor: '#0f1729', boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,91,31,0.08)' }}
        >
          <div className="px-4 pt-3 pb-2 border-b border-dark-700/60">
            <p className="text-xs font-semibold text-primary">{content.title}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{content.description}</p>
          </div>
          <ul className="px-4 py-3 space-y-2.5">
            {content.items.map((item) => (
              <li key={item.label} className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-gray-200">{item.label}</span>
                <span className="text-[10px] text-gray-500 leading-relaxed">{item.example}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
