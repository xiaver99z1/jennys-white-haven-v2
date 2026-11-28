interface FieldErrorProps {
  id?: string
  message?: string | null
  className?: string
}

/**
 * Accessible inline validation error message placed below form inputs.
 */
export function FieldError({ id, message, className = '' }: FieldErrorProps) {
  if (!message) return null
  return (
    <p
      id={id}
      role="alert"
      className={`mt-1 text-[11px] font-medium text-rose-600 leading-snug ${className}`.trim()}
    >
      {message}
    </p>
  )
}

/**
 * Appends rose error border/ring styling when a field has a validation error.
 */
export function getFieldValidationClass(
  baseClassName: string,
  hasError: boolean,
): string {
  if (!hasError) return baseClassName
  return `${baseClassName} border-rose-400 focus:border-rose-500 focus:ring-rose-500/20`
}
