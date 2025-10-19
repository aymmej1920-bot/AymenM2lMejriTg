import React from 'react';
import { useFormContext, Controller, FieldValues, Path } from 'react-hook-form';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Calendar } from 'lucide-react'; // For date input icon

interface FormFieldProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'tel' | 'email' | 'password';
  placeholder?: string;
  options?: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
  step?: string;
}

const FormField = <TFieldValues extends FieldValues>({
  name,
  label,
  type = 'text',
  placeholder,
  options,
  disabled = false,
  className,
  min,
  max,
  step,
}: FormFieldProps<TFieldValues>) => {
  const { control, formState: { errors } } = useFormContext<TFieldValues>();
  const errorMessage = errors[name]?.message as string | undefined;

  return (
    <div className={className}>
      {type !== 'checkbox' && (
        <Label htmlFor={name} className="block text-sm font-semibold mb-2 text-gray-900">
          {label}
        </Label>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          switch (type) {
            case 'select':
              return (
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ''}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder={placeholder || `Sélectionner ${label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            case 'textarea':
              return (
                <Textarea
                  id={name}
                  placeholder={placeholder || `Entrer ${label.toLowerCase()}`}
                  disabled={disabled}
                  {...field}
                  value={field.value || ''}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              );
            case 'checkbox':
              return (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={name}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                  />
                  <Label htmlFor={name} className="text-sm font-semibold text-gray-900">
                    {label}
                  </Label>
                </div>
              );
            case 'date':
              return (
                <div className="relative flex items-center">
                  <Input
                    id={name}
                    type="date"
                    placeholder={placeholder || `Sélectionner une date`}
                    disabled={disabled}
                    {...field}
                    value={field.value ? String(field.value).split('T')[0] : ''} // Ensure date format for input
                    className="w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Calendar className="absolute right-3 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              );
            case 'number':
              return (
                <Input
                  id={name}
                  type="number"
                  placeholder={placeholder || `Entrer ${label.toLowerCase()}`}
                  disabled={disabled}
                  {...field}
                  onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))} // Handle null for empty number input
                  value={field.value === null || field.value === undefined ? '' : field.value}
                  min={min}
                  max={max}
                  step={step}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              );
            default:
              return (
                <Input
                  id={name}
                  type={type}
                  placeholder={placeholder || `Entrer ${label.toLowerCase()}`}
                  disabled={disabled}
                  {...field}
                  value={field.value || ''}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              );
          }
        }}
      />
      {errorMessage && <p className="text-red-500 text-sm mt-1">{errorMessage}</p>}
    </div>
  );
};

export default FormField;