import { useState } from 'react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

const DISMISS_KEY = 'ripple_install_dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getInitialDismissed(): boolean {
  const dismissedAt = localStorage.getItem(DISMISS_KEY)
  if (!dismissedAt) return false
  const elapsed = Date.now() - parseInt(dismissedAt, 10)
  return elapsed < DISMISS_DURATION_MS
}

export function InstallBanner() {
  const { canInstall, isInstalled, isIOSDevice, install } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(getInitialDismissed)

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }

  const handleInstall = async () => {
    const accepted = await install()
    if (accepted) handleDismiss()
  }

  if (isInstalled || dismissed) return null
  if (!canInstall && !isIOSDevice) return null

  // The bottom band stacks: tab bar (0–56) → camera control (72–132, and z-50)
  // → the map's report counter (144) → this banner. At the previous bottom-20
  // it collided with the camera control, which being z-50 sat on top of this
  // banner's own text — the install instructions were unreadable on the exact
  // 375px viewport the product is designed for.
  return (
    <div
      role="banner"
      className="fixed bottom-[196px] left-4 right-4 z-40 flex items-center gap-3 bg-bg-secondary border border-border-bright p-4"
    >
      <div className="flex-1">
        <p className="text-sm font-semibold text-text-primary">
          Add Ripple to your home screen
        </p>
        {isIOSDevice ? (
          <p className="mt-1 text-xs text-text-secondary">
            Tap <span className="font-semibold">Share</span> then <span className="font-semibold">Add to Home Screen</span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-text-secondary">
            Get the full app experience — fast access, offline support.
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!isIOSDevice && (
          <button
            onClick={() => { void handleInstall() }}
            className="rounded-md bg-action px-3 py-2 text-xs font-semibold text-bg-primary transition-colors hover:bg-action-hover active:bg-action-hover"
          >
            Install
          </button>
        )}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install banner"
          className="rounded-md p-2 text-text-tertiary hover:text-text-secondary transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
