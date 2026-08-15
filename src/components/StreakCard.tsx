import { motion } from 'framer-motion'
import { useStreak } from '@/hooks/useStreak'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { TypingLine } from '@/components/TypingLine'
import { timeAgo } from '@/lib/mapHelpers'

export interface StreakCardProps {
  className?: string
}

/** MOTION.md:13 — scroll reveal is fade + 16px translate-up, 400ms ease-out.
    MOTION.md:11 — ease-out or linear only. No bounce, no spring, no overshoot. */
const REVEAL_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const REVEAL = { duration: 0.4, ease: REVEAL_EASE }

const weeks = (n: number) => (n === 1 ? '1 week' : `${n} weeks`)

/**
 * The caller's reporting streak (S21.4, PRD §5.5).
 *
 * Three states, and the two quiet ones carry the design:
 *
 * A user who has never reported sees no number at all — not "0", which reads as
 * a score they are losing. A user whose run has lapsed sees their longest run
 * and an explicit statement that pausing is the intended behaviour. PRD §13.4
 * bars gamification that pushes people toward reporting things that are not
 * there, and a counter that shames you for a quiet fortnight does exactly that:
 * the person with nothing to report is the system working, not a failure.
 *
 * The figure is weeks, and the footnote says so, because a user who assumes it
 * counts reports would draw exactly the wrong conclusion about what to do next.
 */
export function StreakCard({ className = '' }: StreakCardProps) {
  const { streak, isLoading, error } = useStreak()
  const reducedMotion = useReducedMotion()

  return (
    <motion.section
      aria-label="Reporting streak"
      // `initial={false}` starts at the animate values, so under reduced motion
      // the card is simply present. MOTION.md admits no exceptions here.
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={REVEAL}
      className={`space-y-3 border border-border px-4 py-3 ${className}`}
    >
      <h2 className="font-mono text-xs text-text-primary">streak</h2>

      {isLoading ? (
        <TypingLine text="reading your weeks..." />
      ) : error !== null || !streak ? (
        <p className="font-mono text-xs text-text-tertiary">
          &gt; could not read your streak — nothing has been lost, try again later
        </p>
      ) : streak.weeksActive === 0 ? (
        <NeverReported />
      ) : (
        <Counted
          currentWeeks={streak.currentWeeks}
          longestWeeks={streak.longestWeeks}
          weeksActive={streak.weeksActive}
          lastReportAt={streak.lastReportAt}
        />
      )}
    </motion.section>
  )
}

/**
 * Nobody has reported anything yet. There is no number here on purpose: "0" in
 * the same slot the streak later occupies frames an empty history as a failed
 * one.
 */
function NeverReported() {
  return (
    <>
      <p className="font-mono text-xs text-text-secondary">nothing counted yet</p>
      <p className="font-mono text-xs text-text-tertiary">
        &gt; this fills in on its own the first week you report something. it is a record of
        what happened, not a target to hit.
      </p>
    </>
  )
}

interface CountedProps {
  currentWeeks: number
  longestWeeks: number
  weeksActive: number
  lastReportAt: string | null
}

function Counted({ currentWeeks, longestWeeks, weeksActive, lastReportAt }: CountedProps) {
  const running = currentWeeks > 0

  return (
    <>
      {running ? (
        <p className="flex items-baseline gap-2">
          {/* Amber is the one accent (index.css), but it is never the only
              signal: the words beside it say what the number means, and the
              lapsed state below differs in wording rather than in colour —
              PRD §10.2, "colour never the only differentiator". */}
          <span className="font-mono text-2xl tabular-nums text-action">
            {String(currentWeeks).padStart(2, '0')}
          </span>
          <span className="font-mono text-xs text-text-secondary">
            {currentWeeks === 1 ? 'week in a row' : 'weeks in a row'}
          </span>
        </p>
      ) : (
        <p className="font-mono text-xs text-text-secondary">no run in progress</p>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
        <dt className="text-text-tertiary">longest run</dt>
        <dd className="tabular-nums text-text-secondary">{weeks(longestWeeks)}</dd>
        <dt className="text-text-tertiary">weeks reported in</dt>
        <dd className="tabular-nums text-text-secondary">{weeksActive}</dd>
        {lastReportAt && (
          <>
            <dt className="text-text-tertiary">last report</dt>
            <dd className="text-text-secondary">{timeAgo(lastReportAt)}</dd>
          </>
        )}
      </dl>

      <p className="font-mono text-xs text-text-tertiary">
        {running
          ? '> a week counts once, however many reports you file in it.'
          : '> a run pauses when there is nothing to report. that is the intended behaviour, not a lapse.'}
      </p>
    </>
  )
}
