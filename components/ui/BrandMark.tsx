import { BRAND } from '@/lib/branding'

export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const boxSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${boxSize} rounded-md bg-gradient-to-br from-primary-600 to-primary-800
                    flex items-center justify-center text-white font-bold`}
        aria-hidden
      >
        <StarIcon />
      </div>
      <span className={`${textSize} font-semibold text-gray-800 whitespace-nowrap`}>
        {BRAND.name}
      </span>
    </div>
  )
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2.2}
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M3 12h18M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7" />
    </svg>
  )
}
