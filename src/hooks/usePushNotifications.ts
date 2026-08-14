import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getReporterToken } from '@/lib/reporterToken'

export type PushSupport = 'supported' | 'needs-install' | 'unsupported'

export interface PushState {
  support: PushSupport
  permission: NotificationPermission | 'default'
  isSubscribed: boolean
  subscribe: () => Promise<boolean>
}

/** True when running as an installed PWA rather than a browser tab. */
function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari's non-standard flag, still the only reliable signal there.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/**
 * Web Push registration (S13.6, deferred into S16 where the install flow lives).
 *
 * iOS is the constraint that shapes this whole hook: Safari only exposes Push
 * to a site installed on the Home Screen, so on iOS the honest states are
 * "install first" and "not available", never "click to enable". Reporting
 * `needs-install` lets the UI say the true thing instead of showing a button
 * that silently fails.
 *
 * Email remains the primary notification channel (PRD §6.5); push is additive.
 */
export function usePushNotifications(): PushState {
  // Read once at mount rather than set from an effect: Notification.permission
  // is a synchronous browser value, so it is knowable at first render.
  const [permission, setPermission] = useState<NotificationPermission | 'default'>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [isSubscribed, setIsSubscribed] = useState(false)

  const hasApis =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window

  const support: PushSupport = !hasApis
    ? isStandalone()
      ? 'unsupported'
      : 'needs-install'
    : 'supported'

  useEffect(() => {
    if (!hasApis) return

    let cancelled = false
    void (async () => {
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      if (!cancelled) setIsSubscribed(Boolean(existing))
    })()

    return () => {
      cancelled = true
    }
  }, [hasApis])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!hasApis) return false

    const result = await Notification.requestPermission()
    setPermission(result)
    if (result !== 'granted') return false

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      // Owner-gated (OG10). Fail visibly in dev rather than silently no-oping.
      console.warn('[ripple] VITE_VAPID_PUBLIC_KEY not set — push unavailable')
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      })

      const { error } = await supabase.from('user_notifications').insert({
        reporter_token: getReporterToken(),
        notification_type: 'push',
        push_subscription: subscription.toJSON(),
        is_active: true,
      })

      if (error) return false
      setIsSubscribed(true)
      return true
    } catch {
      return false
    }
  }, [hasApis])

  return { support, permission, isSubscribed, subscribe }
}
