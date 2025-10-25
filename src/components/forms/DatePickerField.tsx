import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; // Import default styles
import { useFormContext, Controller, Path, FieldValues } from 'react-hook-form';
import { Label } from '../ui/label';
import { Input } from '../ui/input'; // Re-using Input for styling consistency
import { Calendar } from 'lucide-react';

interface DatePickerFieldProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const DatePickerField = <TFieldValues extends FieldValues>({
  name,
  label,
  placeholder,
  disabled = false,
  className,
}: DatePickerFieldProps<TFieldValues>) => {
  const { control, formState: { errors } } = useFormContext<TFieldValues>();
  const errorMessage = errors[name]?.message as string | undefined;

  return (
    <div className={className}>
      <Label htmlFor={name} className="block text-sm font-semibold mb-2 text-gray-900">
        {label}
      </Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div className="relative flex items-center">
            <DatePicker
              selected={field.value ? new Date(field.value) : null}
              onChange={(date: Date | null) => field.onChange(date ? date.toISOString().split('T')[0] : '')}
              dateFormat="yyyy-MM-dd"
              placeholderText={placeholder || `Sélectionner une date`}
              disabled={disabled}
              customInput={
                <Input
                  id={name}
                  className="w-full glass border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  readOnly // Prevent manual text input to ensure valid date format
                />
              }
              className="w-full" // Apply width to the DatePicker component itself
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        )}
      />
      {errorMessage && <p className="text-red-500 text-sm mt-1">{errorMessage}</p>}
    </div>
  );
};

export default DatePickerField;