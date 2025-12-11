import React from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import './phone-input.css';
import { cn } from '@/lib/utils';

interface PhoneInputWithCountryProps {
  value: string;
  onChange: (value: string) => void;
  countryCode?: string;
  onCountryChange?: (country: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  error?: string;
  onBlur?: () => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export function PhoneInputWithCountry({
  value,
  onChange,
  countryCode = 'US',
  onCountryChange,
  disabled = false,
  required = false,
  placeholder = 'Phone number',
  className,
  error,
  onBlur,
  onFocus,
}: PhoneInputWithCountryProps) {
  const handleChange = (value: string | undefined) => {
    onChange(value || '');
  };

  return (
    <div className={cn('phone-input-wrapper', className)}>
      <PhoneInput
        international
        defaultCountry={countryCode as any}
        value={value}
        onChange={handleChange}
        onCountryChange={onCountryChange as any}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        className="flex items-center gap-2"
        numberInputProps={{
          className: cn(
            'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-base md:text-sm',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-destructive' : 'border-input'
          ),
          inputMode: 'tel',
          autoComplete: 'tel',
          onBlur,
          onFocus,
        }}
        countrySelectProps={{
          className: cn(
            'h-10 rounded-md border bg-background px-2',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            error ? 'border-destructive' : 'border-input'
          ),
        }}
      />
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}
