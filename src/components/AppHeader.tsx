import { useNavigate } from 'react-router-dom'
import { CitySelector } from '@/components/CitySelector'
import { AppMenu } from '@/components/AppMenu'

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
          // 44px, not the 36px this was: the header is where a one-handed user
          // aims with a thumb, and it sat under the touch-target floor.
          className="flex h-11 w-11 items-center justify-center text-text-secondary transition-colors hover:text-text-primary"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Was a permanently disabled hamburger — the one dead control in the
            app — because there was nowhere for it to go. S21.6 built the
            destination, so S21.7 gives it the menu it was always meant to
            open. */}
        <AppMenu />
      </div>
    </header>
  )
}
