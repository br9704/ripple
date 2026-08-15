import { useState } from 'react'
import { motion } from 'framer-motion'
import { useReferral } from '@/hooks/useReferral'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { buildInviteUrl } from '@/lib/referralLink'
import { shareReport, type ShareOutcome } from '@/lib/share'

export interface ReferralCardProps {
  className?: string
}

/** MOTION.md:11,13 — fade + 16px up, 400ms, ease-out only. */
const REVEAL_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const REVEAL = { duration: 0.4, ease: REVEAL_EASE }

/** MOTION.md:101 — nothing animates on the critical input path. */
const TAP_TARGET = 'min-h-[44px] w-full px-3 py-2 font-mono text-xs'

const SHARE_LABEL: Record<ShareOutcome, string> = {
  shared: '[ invite shared ]',
  copied: '[ link copied ]',
  // `shareReport` returns 'unavailable' both when the user cancels the native
  // sheet and when neither share nor clipboard is reachable. It cannot tell
  // them apart, so this label does not claim to either — it states what is true
  // in both cases and points at the code, which is on screen regardless.
  unavailable: '[ not shared — code is above ]',
}

/**
 * Invite link and referral count (S21.5, PRD §5.5).
 *
 * The security property this component exists to preserve: the shared URL
 * carries the eight-character referral *code*, never the reporter token.
 * Migration 015 makes that token a bearer credential, so a link containing it
 * would hand write access to every group chat it landed in. Migration 026's
 * first design note is the long version. Nothing here reads the token.
 */
export function ReferralCard({ className = '' }: ReferralCardProps) {
  const { code, referralCount, isLoading, isCreating, error, createCode } = useReferral()
  const reducedMotion = useReducedMotion()
  const [shareResult, setShareResult] = useState<ShareOutcome | null>(null)

  const inviteUrl = code ? buildInviteUrl(window.location.origin, code) : null

  const handleShare = async () => {
    if (!inviteUrl) return
    setShareResult(
      await shareReport({
        title: 'Ripple',
        text: 'Report a pothole, broken light or dumped rubbish to your council in about ten seconds. No account needed.',
        url: inviteUrl,
      })
    )
  }

  return (
    <motion.section
      aria-label="Invite someone to Ripple"
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={REVEAL}
      className={`space-y-3 border border-border px-4 py-3 ${className}`}
    >
      <h2 className="font-mono text-xs text-text-primary">invite</h2>

      <p className="font-mono text-xs text-text-tertiary">
        &gt; the link carries an invite code, never your reporter token. it cannot be used to
        read or change your reports.
      </p>

      {code ? (
        <>
          <p className="font-mono text-lg tracking-[0.3em] text-action">
            {/* Read out as individual characters: a screen reader pronouncing
                an eight-character code as a word is unusable, and the code is
                designed to survive being spoken — migration 026's alphabet
                omits I, O, 0 and 1 precisely so it can be. */}
            <span className="sr-only">{[...code].join(' ')}</span>
            <span aria-hidden="true">{code}</span>
          </p>

          <button
            type="button"
            onClick={() => void handleShare()}
            className={`${TAP_TARGET} border border-action text-action transition-colors hover:bg-action hover:text-bg-primary`}
          >
            {shareResult ? SHARE_LABEL[shareResult] : '[ share invite ]'}
          </button>

          <p className="font-mono text-xs text-text-tertiary" aria-live="polite">
            {referralCount === 0
              ? '> nobody has used your code yet. it does not expire.'
              : referralCount === 1
                ? '> 1 person has joined with your code.'
                : `> ${referralCount} people have joined with your code.`}
          </p>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => void createCode()}
            disabled={isCreating}
            className={`${TAP_TARGET} border border-border-bright text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50`}
          >
            {isCreating ? '[ working... ]' : '[ show my invite code ]'}
          </button>

          {/* Explains the button rather than nagging about the empty state: the
              code is minted the first time it is asked for, so no record exists
              for anyone who never intends to invite anybody. */}
          <p className="font-mono text-xs text-text-tertiary">
            &gt; your code is created the first time you ask for it, and stays the same after
            that.
          </p>

          {/* Only surfaced once there is something real to say. A "0 invited"
              line for someone who has not opted into the mechanic at all reads
              as a score, which is the shape PRD §13.4 rules out. */}
          {!isLoading && referralCount > 0 && (
            <p className="font-mono text-xs text-text-secondary">
              {referralCount === 1
                ? '> 1 person has already joined with your code.'
                : `> ${referralCount} people have already joined with your code.`}
            </p>
          )}
        </>
      )}

      {error !== null && (
        <p className="font-mono text-xs text-text-tertiary" role="status">
          &gt; could not reach the server. nothing was lost — try again.
        </p>
      )}
    </motion.section>
  )
}
