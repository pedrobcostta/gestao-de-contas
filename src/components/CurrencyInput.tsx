import React from 'react';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onValueChange: (value: number) => void;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onValueChange, ...props }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = Number(rawValue.replace(/\D/g, '')) / 100;
    onValueChange(isNaN(numericValue) ? 0 : numericValue);
  };

  return (
    <Input
      {...props}
      value={formatCurrency(value)}
      onChange={handleInputChange}
      type="text"
      inputMode="decimal"
    />
  );
};