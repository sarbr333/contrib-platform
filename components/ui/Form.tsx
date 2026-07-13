import { forwardRef } from 'react'

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={`w-full h-9 px-3 rounded border border-gray-300 bg-white text-sm text-gray-900
                  placeholder-gray-400 transition-colors
                  focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20
                  disabled:bg-gray-50 disabled:text-gray-500 ${className}`}
      {...rest}
    />
  )
})

export function Textarea({
  className = '',
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full px-3 py-2 rounded border border-gray-300 bg-white text-sm text-gray-900
                  placeholder-gray-400 transition-colors leading-relaxed
                  focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20 ${className}`}
      {...rest}
    />
  )
}

export function Select({
  className = '',
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full h-9 pl-3 pr-8 rounded border border-gray-300 bg-white text-sm text-gray-900
                  transition-colors appearance-none
                  focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20 ${className}`}
      {...rest}
    >
      {children}
    </select>
  )
}

export function FormField({
  label,
  hint,
  error,
  children
}: {
  label?: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      {children}
      {hint && !error && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
