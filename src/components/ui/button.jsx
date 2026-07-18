import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-white hover:bg-primary/90',
        secondary:
          'bg-dark-700 text-white hover:bg-dark-600',
        outline:
          'border border-dark-700 bg-transparent hover:bg-dark-700/50 text-gray-300',
        ghost: 'bg-transparent text-gray-300 hover:bg-dark-700/50',
        gradient: 'bg-gradient-to-r from-primary via-amber-500 to-teal-500 text-white hover:opacity-90',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
      },
      size: {
        default: 'px-4 py-2 text-sm',
        sm: 'px-3 py-1.5 text-xs',
        lg: 'px-6 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export const Button = React.forwardRef(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = 'Button';
