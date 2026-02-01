import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select...',
  className,
  disabled = false,
}) => {
  // Filter out options with empty values (Radix Select requires non-empty values)
  const validOptions = options.filter((opt) => opt.value !== '');

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <label className="text-xs text-gray-400">{label}</label>}
      <SelectPrimitive.Root value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="overflow-hidden bg-gray-800 rounded-md shadow-lg border border-gray-600 z-[100]"
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1">
              {validOptions.length === 0 ? (
                <div className="px-8 py-2 text-sm text-gray-400">Keine Optionen</div>
              ) : (
                validOptions.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    className={cn(
                      'relative flex items-center px-8 py-2 text-sm text-white rounded',
                      'focus:bg-gray-700 focus:outline-none cursor-pointer',
                      'data-[highlighted]:bg-gray-700'
                    )}
                  >
                    <SelectPrimitive.ItemIndicator className="absolute left-2">
                      <Check className="h-4 w-4" />
                    </SelectPrimitive.ItemIndicator>
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))
              )}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
};
