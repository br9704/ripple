import { useEffect, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface TypingLineProps {
  text: string
  /** ms per character — SIGNAL specifies 40. */
  speed?: number
  /** Show the blinking cursor once typing completes. */
  cursor?: boolean
  className?: string
}

/**
 * Types text out at 40ms/char behind a `>` prompt, then blinks a cursor.
 *
 * This is the system's substitute for a spinner on short waits — MOTION.md:83
 * is explicit that the GPS line must never show one, because the typing line
 * already communicates work.
 *
 * The full string is always present in the DOM for screen readers; only the
 * visible slice animates. Under `prefers-reduced-motion` the text appears
 * complete immediately and no timer runs at all — reduced motion means static,
 * not merely faster.
 */
export function TypingLine({ text, speed = 40, cursor = true, className = '' }: TypingLineProps) {
  const reducedMotion = useReducedMotion()
  const [typed, setTyped] = useState('')

  // Reset when the text changes, adjusting state during render rather than in
  // an effect. This is React's documented pattern for deriving state from
  // props, and avoids the one-frame flash of the previous string that an
  // effect-based reset would produce.
  const [renderedFor, setRenderedFor] = useState(text)
  if (renderedFor !== text) {
    setRenderedFor(text)
    setTyped('')
  }

  useEffect(() => {
    if (reducedMotion) return

    let index = 0
    const id = setInterval(() => {
      index += 1
      setTyped(text.slice(0, index))
      if (index >= text.length) clearInterval(id)
    }, speed)

    return () => clearInterval(id)
  }, [text, speed, reducedMotion])

  const visible = reducedMotion ? text : typed
  const done = visible.length >= text.length

  return (
    <p className={`font-mono text-xs text-text-secondary ${className}`}>
      <span aria-hidden="true">&gt; </span>
      {/* The complete text, announced once rather than character by character. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{visible}</span>
      {cursor && done && (
        <span aria-hidden="true" className="cursor-blink text-action">
          ▊
        </span>
      )}
    </p>
  )
}
