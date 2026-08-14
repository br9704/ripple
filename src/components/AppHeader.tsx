import { useNavigate } from 'react-router-dom'
import { CitySelector } from '@/components/CitySelector'

export function AppHeader() {
  const navigate = useNavigate()

  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-[52px] items-center justify-between border-b border-border bg-bg-primary/85 px-4 backdrop-blur-md">
      <button
        type="button"
        onClick={() => { void navigate('/') }}
        className="font-display text-lg font-bold tracking-wide text-action"
        aria-label="Ripple — go to map"
      >
        RIPPLE
      </button>

      <div className="flex items-center gap-2">
        <CitySelector />
        {/* Wired in Sprint 12. Until then this button had no onClick at all —
            it looked enabled and did nothing. */}
        <button
          type="button"
          onClick={() => { void navigate('/search') }}
          aria-label="Search reports"
          className="flex h-9 w-9 items-center justify-center text-text-secondary transition-colors hover:text-text-primary"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Menu has no destination yet. SIGNAL forbids dead links, so rather
            than render an enabled-looking control that does nothing, it is
            explicitly disabled and marked as such. */}
        <button
          type="button"
          disabled
          aria-label="Menu (coming soon)"
          title="Coming soon"
          className="flex h-9 w-9 cursor-not-allowed items-center justify-center text-text-tertiary opacity-50"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  )
}
