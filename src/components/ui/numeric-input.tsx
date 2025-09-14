import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, min = 0, max = 999, step = 1, ...props }, ref) => {
    const handleIncrement = () => {
      const newValue = Math.min(max, (value || 0) + step);
      onChange(newValue);
    };

    const handleDecrement = () => {
      const newValue = Math.max(min, (value || 0) - step);
      onChange(newValue);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const num = parseInt(e.target.value, 10);
        if (!isNaN(num)) {
            onChange(Math.max(min, Math.min(max, num)));
        } else if (e.target.value === '') {
            onChange(min);
        }
    }

    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={handleDecrement}
          disabled={value <= min}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          ref={ref}
          type="number"
          className="text-center"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          {...props}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={handleIncrement}
          disabled={value >= max}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }
);

NumericInput.displayName = "NumericInput";