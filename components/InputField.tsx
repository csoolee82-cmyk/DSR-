import React from 'react';

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  unit?: string;
  step?: number;
  placeholder?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  unit,
  step = 1,
  placeholder
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove commas for the actual numeric value
    const rawValue = e.target.value.replace(/,/g, '');
    
    if (rawValue === '') {
      onChange(0);
      return;
    }

    const numberValue = parseFloat(rawValue);
    if (!isNaN(numberValue)) {
      onChange(numberValue);
    }
  };

  // Format display value with commas
  const displayValue = value === 0 ? '' : value.toLocaleString('ko-KR');

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative rounded-md shadow-sm">
        <input
          type="text" 
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="block w-full rounded-md border-slate-300 py-2 pl-3 pr-10 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm bg-white border"
        />
        {unit && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-slate-500 sm:text-sm">{unit}</span>
          </div>
        )}
      </div>
    </div>
  );
};