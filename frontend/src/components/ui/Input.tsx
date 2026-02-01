import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, id, value, onChange, type, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');
    const [isFocused, setIsFocused] = useState(false);
    const [localValue, setLocalValue] = useState(() =>
      value !== undefined && value !== null ? String(value) : ''
    );
    const lastExternalValue = useRef(value);

    // Only sync external value when NOT focused and value actually changed externally
    useEffect(() => {
      if (!isFocused) {
        // For numbers, use tolerance comparison to avoid floating point issues
        const lastVal = lastExternalValue.current;
        let hasChanged = value !== lastVal;

        if (type === 'number' && typeof value === 'number' && typeof lastVal === 'number') {
          // Use relative tolerance for floating point comparison
          hasChanged = Math.abs(value - lastVal) > Math.abs(value) * 1e-10 + 1e-10;
        }

        if (hasChanged) {
          const newVal = value !== undefined && value !== null ? String(value) : '';
          setLocalValue(newVal);
          lastExternalValue.current = value;
        }
      }
    }, [value, isFocused, type]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);

      // For non-number inputs, update immediately
      if (type !== 'number' && onChange) {
        onChange(e);
      }
    }, [type, onChange]);

    const handleFocus = useCallback(() => {
      setIsFocused(true);
    }, []);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);

      // For number inputs, update on blur
      if (type === 'number' && onChange) {
        // Update the ref so we don't sync back immediately
        const numValue = parseFloat(e.target.value);
        if (!isNaN(numValue)) {
          lastExternalValue.current = numValue;
        }
        onChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
      }
    }, [type, onChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      // Update on Enter key for number inputs
      if (type === 'number' && e.key === 'Enter' && onChange) {
        const target = e.target as HTMLInputElement;
        const numValue = parseFloat(target.value);
        if (!isNaN(numValue)) {
          lastExternalValue.current = numValue;
        }
        onChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
        target.blur();
      }
    }, [type, onChange]);

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
          type={type}
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
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
