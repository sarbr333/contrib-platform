export function Card({
  title,
  extra,
  footer,
  className = '',
  bodyClassName = '',
  children
}: {
  title?: React.ReactNode
  extra?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  return (
    <div className={`bg-white rounded-md border border-gray-200 shadow-card ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="font-medium text-gray-800">{title}</div>
          {extra}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
      {footer && <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">{footer}</div>}
    </div>
  )
}
