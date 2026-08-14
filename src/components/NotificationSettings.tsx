import { usePushNotifications } from '@/hooks/usePushNotifications'
import { TypingLine } from '@/components/TypingLine'

/**
 * Notification preferences (S13.7).
 *
 * iOS shapes this entire component. Safari exposes Push only to a site already
 * installed on the Home Screen, so on iOS-in-a-tab the honest UI is an
 * instruction, not a button — a control that silently fails is worse than no
 * control. Email stays the primary channel (PRD §6.5); push is additive.
 */
export function NotificationSettings() {
  const { support, permission, isSubscribed, subscribe } = usePushNotifications()

  return (
    <section aria-label="Notification settings" className="space-y-3 border border-border px-4 py-3">
      <h2 className="font-mono text-xs text-text-primary">notifications</h2>

      <p className="font-mono text-xs text-text-tertiary">
        &gt; email is the primary channel. push is optional and never required.
      </p>

      {support === 'needs-install' && (
        <div className="space-y-1">
          <TypingLine text="install ripple to enable push" />
          <p className="font-mono text-xs text-text-tertiary">
            On iPhone: tap Share, then <span className="text-text-secondary">Add to Home Screen</span>.
            Safari only allows notifications for installed apps.
          </p>
        </div>
      )}

      {support === 'unsupported' && (
        <p className="font-mono text-xs text-text-tertiary">
          &gt; this browser does not support push notifications
        </p>
      )}

      {support === 'supported' && (
        <>
          {isSubscribed ? (
            <p className="font-mono text-xs text-status-fixed">
              &gt; push notifications are on for this device
            </p>
          ) : permission === 'denied' ? (
            <p className="font-mono text-xs text-text-tertiary">
              &gt; notifications are blocked. re-enable them in your browser settings.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void subscribe()}
              className="w-full border border-action px-3 py-2 font-mono text-xs text-action transition-colors hover:bg-action hover:text-bg-primary"
            >
              [ enable push notifications ]
            </button>
          )}
        </>
      )}
    </section>
  )
}
