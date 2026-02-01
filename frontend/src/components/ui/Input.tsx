import * as React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs text-gray-400">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'flex h-9 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-1 text-sm text-white',
            'placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
