import React from 'react'; // Import React for React.BaseSyntheticEvent
import { useForm, FormProvider, FieldValues, Path, DefaultValues, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FormField from './FormField';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';

// Define a type for the form field configuration
export interface DynamicFormFieldConfig<TFieldValues extends FieldValues> {
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
  gridColumn?: string; // For Tailwind CSS grid column spanning, e.g., 'col-span-2'
}

interface DynamicFormProps<TFieldValues extends FieldValues> { // Ensure TFieldValues extends FieldValues
  schema: z.ZodSchema<TFieldValues>;
  defaultValues: DefaultValues<TFieldValues>;
  onSubmit: SubmitHandler<TFieldValues>; // Use SubmitHandler here
  fields: DynamicFormFieldConfig<TFieldValues>[];
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  className?: string;
  gridCols?: string; // For Tailwind CSS grid columns, e.g., 'col-span-1' or 'col-cols-2'
}

const DynamicForm = <TFieldValues extends FieldValues>({ // Ensure TFieldValues extends FieldValues
  schema,
  defaultValues,
  onSubmit,
  fields,
  submitLabel = 'Sauvegarder',
  cancelLabel = 'Annuler',
  onCancel,
  className = 'space-y-4 py-4',
  gridCols = 'grid-cols-1',
}: DynamicFormProps<TFieldValues>) => {
  const methods = useForm<TFieldValues>({
    resolver: zodResolver(schema), // This should now correctly infer types
    defaultValues,
  });

  const { handleSubmit } = methods;

  // Define an intermediate handler to help TypeScript resolve generics
  const formSubmitHandler: SubmitHandler<TFieldValues> = (data, event) => {
    onSubmit(data, event);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(formSubmitHandler)} className={className}>
        <div className={`grid ${gridCols} gap-4`}>
          {fields.map((fieldConfig) => (
            <FormField
              key={fieldConfig.name as string}
              name={fieldConfig.name}
              label={fieldConfig.label}
              type={fieldConfig.type}
              placeholder={fieldConfig.placeholder}
              options={fieldConfig.options}
              disabled={fieldConfig.disabled}
              className={fieldConfig.gridColumn} // Apply grid column class here
              min={fieldConfig.min}
              max={fieldConfig.max}
              step={fieldConfig.step}
            />
          ))}
        </div>
        <DialogFooter>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}
          <Button type="submit">{submitLabel}</Button>
        </DialogFooter>
      </form>
    </FormProvider>
  );
};

export default DynamicForm;