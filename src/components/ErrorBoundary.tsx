import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Last line of defence (S16.7).
 *
 * CLAUDE.md §6 says functional components only, and this is the documented
 * exception: React has no hook equivalent of componentDidCatch, so an error
 * boundary must be a class. Without one, any render-time throw unmounts the
 * whole tree and leaves a blank white screen — which CLAUDE.md §4 calls a bug
 * outright, and which is indistinguishable from the app being broken.
 *
 * PRD §13.2 forbids logging PII, so the error is logged without any request or
 * report context attached.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ripple] render error:', error.message, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-bg-primary px-6 text-center">
        <p className="font-mono text-sm text-text-primary">something broke</p>
        <p className="font-mono text-xs text-text-secondary">
          &gt; this screen failed to render
        </p>
        <p className="max-w-xs font-mono text-xs text-text-tertiary">
          Any report you had queued offline is still saved on this device and will
          submit when you reconnect.
        </p>
        <button
          type="button"
          onClick={() => window.location.assign('/')}
          className="mt-4 border border-action px-3 py-1.5 font-mono text-xs text-action transition-colors hover:bg-action hover:text-bg-primary"
        >
          [ reload ]
        </button>
      </div>
    )
  }
}
