import { useLocation, useNavigate } from 'react-router-dom'

const TABS = [
  { key: 'map', label: 'Map', path: '/', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { key: 'feed', label: 'Feed', path: '/feed', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { key: 'my-reports', label: 'My Reports', path: '/my-reports', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
] as const

export function TabBar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-border bg-bg-primary safe-bottom">
      {TABS.map((tab) => {
        const isActive = location.pathname === tab.path
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => { void navigate(tab.path) }}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 text-xs transition-colors ${
              isActive ? 'text-action' : 'text-text-tertiary'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2.5 : 1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
            </svg>
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
