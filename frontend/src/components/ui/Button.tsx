import * as React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          // Variants
          variant === 'default' && 'bg-gray-700 text-white hover:bg-gray-600',
          variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-500',
          variant === 'ghost' && 'hover:bg-gray-700 text-gray-300',
          variant === 'danger' && 'bg-red-600 text-white hover:bg-red-500',
          // Sizes
          size === 'sm' && 'h-8 px-3 text-xs',
          size === 'md' && 'h-10 px-4 text-sm',
          size === 'lg' && 'h-12 px-6 text-base',
          size === 'icon' && 'h-10 w-10',
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
