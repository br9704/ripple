export function AppHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex h-[52px] items-center justify-between px-4 bg-bg-primary/85 backdrop-blur-md border-b border-border/50">
      <span className="font-display text-lg font-bold text-action tracking-wide">
        RIPPLE
      </span>
      <div className="flex items-center gap-2">
        {/* Search — placeholder until Sprint 12 */}
        <button
          type="button"
          aria-label="Search reports"
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        {/* Menu — placeholder */}
        <button
          type="button"
          aria-label="Menu"
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  )
}
