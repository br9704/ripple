import { AI_CONFIDENCE_HIGH, AI_CONFIDENCE_MEDIUM } from '@/constants/config'
import type { ReportCategory } from '@/types'

/**
 * How confident the model is, expressed as the three behaviours the UI owes the
 * user (PRD §6.2, MOTION.md §"Confidence tiers get different motion").
 *
 * - `certain`  ≥85% — show the result prominently, Submit is the primary CTA.
 * - `asking`   60–84% — show it, but ask "does this look right?".
 * - `offering` <60% — show the top two and let the user choose; assert nothing.
 */
export type ConfidenceTier = 'certain' | 'asking' | 'offering'

export interface Prediction {
  category: ReportCategory
  confidence: number
}

/**
 * Maps a confidence score to its tier.
 *
 * Boundaries are inclusive at the bottom of each band: exactly 0.85 is
 * `certain`, exactly 0.60 is `asking`. PRD §6.2 writes the bands as ">= 85%"
 * and "60-84%", so the thresholds belong to the higher tier.
 */
export function getConfidenceTier(confidence: number): ConfidenceTier {
  if (!Number.isFinite(confidence)) return 'offering'
  if (confidence >= AI_CONFIDENCE_HIGH) return 'certain'
  if (confidence >= AI_CONFIDENCE_MEDIUM) return 'asking'
  return 'offering'
}

/**
 * Reduces raw model output to the top N predictions, highest first.
 *
 * Ties are broken by category order rather than left to sort stability, so the
 * same photo never yields a different answer between runs — an unstable
 * classifier reads as a broken one.
 */
export function topPredictions(
  scores: ReadonlyArray<number>,
  labels: ReadonlyArray<ReportCategory>,
  n = 2
): Prediction[] {
  const pairs: Prediction[] = []
  const len = Math.min(scores.length, labels.length)

  for (let i = 0; i < len; i++) {
    const confidence = scores[i]
    if (!Number.isFinite(confidence)) continue
    pairs.push({ category: labels[i], confidence })
  }

  pairs.sort((a, b) =>
    b.confidence !== a.confidence
      ? b.confidence - a.confidence
      : labels.indexOf(a.category) - labels.indexOf(b.category)
  )

  return pairs.slice(0, Math.max(0, n))
}

/**
 * Converts raw logits to a probability distribution.
 *
 * Applied only when the model does not already end in a softmax — an int8
 * classifier usually emits dequantised probabilities that already sum to ~1,
 * and softmaxing those a second time flattens them badly, turning a confident
 * 0.94 into a mushy 0.31 and silently demoting every result a tier.
 * `looksLikeProbabilities` is the guard against that.
 */
export function softmax(logits: ReadonlyArray<number>): number[] {
  if (logits.length === 0) return []
  const max = Math.max(...logits)
  const exps = logits.map((v) => Math.exp(v - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return sum === 0 ? logits.map(() => 0) : exps.map((v) => v / sum)
}

/** True when the vector already looks like a probability distribution. */
export function looksLikeProbabilities(values: ReadonlyArray<number>): boolean {
  if (values.length === 0) return false
  if (values.some((v) => !Number.isFinite(v) || v < 0 || v > 1)) return false
  const sum = values.reduce((a, b) => a + b, 0)
  return Math.abs(sum - 1) < 0.05
}

/** Normalises raw model output into probabilities, softmaxing only if needed. */
export function toProbabilities(raw: ReadonlyArray<number>): number[] {
  return looksLikeProbabilities(raw) ? [...raw] : softmax(raw)
}
