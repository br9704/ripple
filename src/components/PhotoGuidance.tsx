import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * The three photography rules, shown on the camera screen (S21.6).
 *
 * PRD §13.1.3 and §13.4 do not ask for a policy document — they ask for the
 * *submission flow itself* to instruct users not to photograph people. So this
 * sits where the instruction can still change the outcome: above the shutter,
 * before a photo exists. Guidance on the review screen would arrive after the
 * picture had already been taken.
 *
 * Deliberately not a dialog. A modal in front of the shutter is dismissed
 * reflexively by the second report and read by nobody after the first, and
 * PRD §15 calls the mitigation "clear UI guidance", not a consent gate. This
 * stays on screen for the whole time the user is framing the shot.
 *
 * Three lines, no scroll, no "read more" — someone standing on a footpath in
 * the rain with one hand free reads three lines or none.
 */
export function PhotoGuidance() {
  const reduced = useReducedMotion()

  return (
    <motion.aside
      aria-label="Photography guidance"
      // MOTION.md's inherited reveal: fade + 16px translate-up, 400ms ease-out.
      // Reduced motion means static, so the enter animation is skipped outright
      // rather than run faster.
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8 w-full max-w-sm border border-border px-4 py-3"
    >
      <p className="font-mono text-xs text-action">&gt; photograph the problem, not people</p>

      <ul className="mt-2 space-y-1 font-mono text-xs text-text-secondary">
        <li>no faces, no people in frame</li>
        <li>public infrastructure only — not private property</li>
        <li>every photo you submit is published publicly</li>
      </ul>

      <Link
        to="/terms"
        className="mt-3 inline-block font-mono text-xs text-text-tertiary underline-offset-4 transition-colors hover:text-text-primary hover:underline"
      >
        [ terms &amp; privacy ]
      </Link>
    </motion.aside>
  )
}
