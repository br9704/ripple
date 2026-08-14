import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// React Testing Library does not auto-clean when `globals: true` is combined
// with Vitest's own lifecycle, so do it explicitly.
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// ── jsdom gaps ──
// jsdom implements neither of these, and both are used on the report flow's
// critical path (compressImage revokes object URLs; useCameraCapture creates them).
if (typeof URL.createObjectURL === 'undefined') {
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: vi.fn(() => 'blob:mock'),
  })
}
if (typeof URL.revokeObjectURL === 'undefined') {
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: vi.fn() })
}

// matchMedia is required by any component branching on `prefers-reduced-motion`
// (MOTION.md hard rule) and is absent from jsdom.
if (typeof window.matchMedia === 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }),
  })
}
