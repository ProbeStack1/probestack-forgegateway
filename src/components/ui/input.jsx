import * as React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex h-11 w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all',
      className
    )}
    style={{
      backgroundColor: '#0f172a80',
      borderColor: '#232942',
      borderWidth: '1px',
    }}
    ref={ref}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
