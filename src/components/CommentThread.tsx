import { useState } from 'react'
import { useComments } from '@/hooks/useComments'
import { TypingLine } from '@/components/TypingLine'
import { getReporterToken } from '@/lib/reporterToken'
import { timeAgo } from '@/lib/mapHelpers'
import { COMMENT_MAX_LENGTH } from '@/constants/config'

interface CommentThreadProps {
  reportId: string
}

/**
 * Comment thread, no account required (PRD §6.8).
 *
 * Authors are shown as "you" or an anonymous marker — never as a token, which
 * would be a stable pseudonymous identifier displayed in public and exactly the
 * kind of thing PRD §13.1 says the token must never become.
 */
export function CommentThread({ reportId }: CommentThreadProps) {
  const { comments, isLoading, error, isPosting, post, flag } = useComments(reportId)
  const [draft, setDraft] = useState('')
  const myToken = getReporterToken()

  const remaining = COMMENT_MAX_LENGTH - draft.length
  const canPost = draft.trim().length > 0 && remaining >= 0 && !isPosting

  const handlePost = async () => {
    if (await post(draft)) setDraft('')
  }

  return (
    <section aria-label="Discussion" className="space-y-3">
      <h2 className="font-mono text-xs text-text-tertiary">
        discussion {comments.length > 0 && `(${comments.length})`}
      </h2>

      {isLoading ? (
        <TypingLine text="loading discussion..." />
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="border-l border-border-bright pl-3">
              <p className="flex items-center gap-2 font-mono text-xs text-text-tertiary">
                <span className={c.is_council ? 'text-action' : undefined}>
                  {c.is_council
                    ? 'council'
                    : c.reporter_token === myToken
                      ? 'you'
                      : 'neighbour'}
                </span>
                {c.is_pinned && <span className="text-action">[pinned]</span>}
                <span>{timeAgo(c.created_at)}</span>
              </p>
              <p className="mt-1 text-sm text-text-secondary">{c.body}</p>
              {c.reporter_token !== myToken && !c.is_council && (
                <button
                  type="button"
                  onClick={() => void flag(c.id)}
                  className="mt-1 font-mono text-xs text-text-tertiary underline-offset-4 hover:text-text-secondary hover:underline"
                >
                  [report this comment]
                </button>
              )}
            </li>
          ))}
          {comments.length === 0 && (
            <li className="font-mono text-xs text-text-tertiary">&gt; no comments yet</li>
          )}
        </ul>
      )}

      <div className="space-y-2">
        <label className="block">
          <span className="sr-only">Add a comment</span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="add to the discussion..."
            className="w-full resize-none border border-border-bright bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-action focus:outline-none"
          />
        </label>

        <div className="flex items-center justify-between">
          <span
            className={`font-mono text-xs tabular-nums ${
              remaining < 0 ? 'text-status-declined' : 'text-text-tertiary'
            }`}
          >
            {remaining}
          </span>
          <button
            type="button"
            onClick={() => void handlePost()}
            disabled={!canPost}
            className="border border-action px-3 py-1.5 font-mono text-xs text-action transition-colors hover:bg-action hover:text-bg-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-action"
          >
            {isPosting ? '[posting...]' : '[ post ]'}
          </button>
        </div>

        {error && <p className="font-mono text-xs text-text-tertiary">&gt; {error}</p>}
      </div>
    </section>
  )
}
