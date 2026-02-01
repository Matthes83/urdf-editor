import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '../../utils/cn';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = true,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {(label || showValue) && (
        <div className="flex justify-between text-xs text-gray-400">
          {label && <span>{label}</span>}
          {showValue && <span>{value.toFixed(step < 1 ? 2 : 0)}</span>}
        </div>
      )}
      <SliderPrimitive.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
      >
        <SliderPrimitive.Track className="bg-gray-700 relative grow rounded-full h-1.5">
          <SliderPrimitive.Range className="absolute bg-blue-500 rounded-full h-full" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block w-4 h-4 bg-white rounded-full shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </SliderPrimitive.Root>
    </div>
  );
};
