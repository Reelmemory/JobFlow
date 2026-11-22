import Link from 'next/link'

export function BrandMark({
  href = '/',
  size = 'md',
  onDark = true,
}: {
  href?: string
  size?: 'sm' | 'md' | 'lg'
  onDark?: boolean
}) {
  const type =
    size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg'
  const mark = size === 'lg' ? 'h-8 w-8' : size === 'sm' ? 'h-6 w-6' : 'h-7 w-7'

  return (
    <Link href={href} className="inline-flex items-center gap-2.5 group">
      <span
        className={`${mark} relative grid place-items-center rounded-md bg-blue-700`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-[58%] w-[58%] text-white" fill="none">
          <path
            d="M4 14c3.5-1 5.5-5 8-5s4.5 4 8 5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M4 18c3.5-1 5.5-5 8-5s4.5 4 8 5"
            className="opacity-45"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span
        className={`${type} font-semibold tracking-tight ${
          onDark ? 'text-white group-hover:text-slate-100' : 'text-slate-900 group-hover:text-slate-700'
        }`}
      >
        JobFlow
      </span>
    </Link>
  )
}
