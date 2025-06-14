import { useEffect, useCallback } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { useAppStateManager } from "@/hooks/useAppStateManager";

interface PersistentFormWrapperProps {
  formId: string;
  defaultValues?: any;
  children: (form: UseFormReturn<any>) => React.ReactNode;
  onSubmit?: (data: any) => void;
  resetOnSubmit?: boolean;
}

export function PersistentFormWrapper({
  formId,
  defaultValues = {},
  children,
  onSubmit,
  resetOnSubmit = true
}: PersistentFormWrapperProps) {
  const { saveFormData, getFormData } = useAppStateManager();
  
  // Merge saved data with default values
  const savedData = getFormData(formId);
  const initialValues = savedData ? { ...defaultValues, ...savedData } : defaultValues;
  
  const form = useForm({
    defaultValues: initialValues
  });

  // Watch all form values and save them
  const formValues = form.watch();
  
  useEffect(() => {
    // Save form data whenever values change
    const timeoutId = setTimeout(() => {
      saveFormData(formId, formValues);
    }, 500); // Debounce saves

    return () => clearTimeout(timeoutId);
  }, [formValues, formId, saveFormData]);

  // Enhanced submit handler
  const handleSubmit = useCallback((data: any) => {
    if (onSubmit) {
      onSubmit(data);
    }
    
    if (resetOnSubmit) {
      // Clear saved form data after successful submission
      saveFormData(formId, {});
      form.reset(defaultValues);
    }
  }, [onSubmit, resetOnSubmit, formId, saveFormData, form, defaultValues]);

  return <>{children(form)}</>;
}