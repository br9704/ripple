import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getReporterToken } from '@/lib/reporterToken'
import { COMMENT_MAX_LENGTH } from '@/constants/config'
import type { Comment } from '@/types'

export interface UseCommentsResult {
  comments: Comment[]
  isLoading: boolean
  error: string | null
  isPosting: boolean
  post: (body: string) => Promise<boolean>
  flag: (commentId: string) => Promise<void>
}

/**
 * Per-report comment thread (PRD §6.8).
 *
 * No account: authorship is the anonymous `reporter_token`, and migration 015
 * pins inserts to the caller's own token so a comment cannot be attributed to
 * someone else.
 *
 * Hidden comments are filtered server-side by the query rather than in the UI,
 * so a moderated comment never reaches the client at all.
 *
 * Reads go through the `report_comments` RPC rather than `.select('*')` on the
 * table. `*` would now be refused outright — migration 025 revokes
 * comments.reporter_token from the anon role, because a world-readable table
 * plus a readable credential column meant anyone could collect tokens and post,
 * upvote or read notifications as their owner. The RPC returns the one thing
 * the UI actually needed from that column: `is_mine`, computed server-side.
 */
export function useComments(reportId: string): UseCommentsResult {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPosting, setIsPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ordering (pins first, then oldest to newest) and the hidden filter both
  // live in the function now, so there is exactly one definition of what a
  // thread looks like.
  const fetchComments = useCallback(async () => {
    return supabase.rpc('report_comments', { p_report_id: reportId })
  }, [reportId])

  useEffect(() => {
    let cancelled = false

    // Kicked off asynchronously rather than called synchronously in the effect
    // body: setState during an effect triggers a cascading render, and the
    // lint rule is right to object.
    void (async () => {
      const { data, error: err } = await fetchComments()
      if (cancelled) return

      if (err) {
        setError(err.message)
        setIsLoading(false)
        return
      }

      setComments((data as Comment[]) ?? [])
      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [fetchComments])

  /** Re-read after a moderation action, where the server owns the outcome. */
  const reload = useCallback(async () => {
    const { data, error: err } = await fetchComments()
    if (err) {
      setError(err.message)
      return
    }
    setComments((data as Comment[]) ?? [])
  }, [fetchComments])

  const post = useCallback(
    async (body: string): Promise<boolean> => {
      const trimmed = body.trim()
      if (!trimmed || trimmed.length > COMMENT_MAX_LENGTH) return false

      setIsPosting(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('comments')
        .insert({
          report_id: reportId,
          reporter_token: getReporterToken(),
          body: trimmed,
        })
        // Explicit column list, not `*`: the row we just wrote contains our own
        // reporter_token, but SELECT on it is revoked (migration 025) and
        // RETURNING is a SELECT. `is_mine` is not a column, so it is added
        // below — we just posted it, so it is true by construction.
        .select('id, report_id, is_council, is_pinned, body, flag_count, hidden, created_at')
        .single()

      setIsPosting(false)

      if (err) {
        setError(err.message)
        return false
      }

      // Append the server's row rather than an optimistic stub: it carries the
      // real id, which the flag action needs immediately.
      if (data) {
        setComments((prev) => [...prev, { ...(data as Omit<Comment, 'is_mine'>), is_mine: true }])
      }
      return true
    },
    [reportId]
  )

  const flag = useCallback(async (commentId: string) => {
    const { error: err } = await supabase.rpc('flag_comment', { p_comment_id: commentId })
    if (err) {
      setError(err.message)
      return
    }
    // Re-read rather than guessing: the comment may have crossed the hide
    // threshold, and the server owns that decision.
    await reload()
  }, [reload])

  return { comments, isLoading, error, isPosting, post, flag }
}
