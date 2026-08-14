import type { ReportCategory } from '@/types'

export interface CategoryConfig {
  key: ReportCategory
  label: string
  /**
   * Short monospace glyph identifying the category.
   *
   * Replaces the previous emoji + hex-colour pair. SIGNAL permits one accent,
   * so colour cannot encode ten categories — and it never really did: under the
   * old system `streetlight` and `signage` were both `#F0883E`, so the
   * "10-colour" scheme was only ever 9-distinguishable. Glyphs are drawn from
   * box-drawing and geometric ranges (not emoji), render in JetBrains Mono, and
   * stay legible at 8–16px on the map.
   *
   * This *strengthens* PRD §10.2 ("Colour never the only differentiator — all
   * pins have category icons") rather than weakening it: identity now lives in
   * shape, which survives greyscale, colour blindness, and low outdoor contrast.
   */
  glyph: string
  /** Long-form name for screen readers, where a glyph carries nothing. */
  ariaLabel: string
  /**
   * Severity weight for the priority formula (PRD §6.4).
   * Must stay in sync with calculate_priority() in migration 011.
   */
  severityWeight: number
  /**
   * Safety-critical categories may use amber emphasis on the map — the one
   * sanctioned exception to grayscale pins.
   */
  isSafety: boolean
}

export const CATEGORIES: CategoryConfig[] = [
  { key: 'pothole',       label: 'Pothole / Road Damage',  glyph: '▲', ariaLabel: 'Pothole or road damage',  severityWeight: 2,   isSafety: false },
  { key: 'streetlight',   label: 'Broken Streetlight',     glyph: '◉', ariaLabel: 'Broken streetlight',      severityWeight: 3,   isSafety: true  },
  { key: 'graffiti',      label: 'Graffiti / Vandalism',   glyph: '▨', ariaLabel: 'Graffiti or vandalism',   severityWeight: 1,   isSafety: false },
  { key: 'signage',       label: 'Damaged Signage',        glyph: '▭', ariaLabel: 'Damaged signage',         severityWeight: 2,   isSafety: false },
  { key: 'accessibility', label: 'Accessibility Hazard',   glyph: '◈', ariaLabel: 'Accessibility hazard',    severityWeight: 2.5, isSafety: true  },
  { key: 'dumping',       label: 'Illegal Dumping',        glyph: '▦', ariaLabel: 'Illegal dumping',         severityWeight: 1,   isSafety: false },
  { key: 'water',         label: 'Water / Drainage Issue', glyph: '≈', ariaLabel: 'Water or drainage issue', severityWeight: 2,   isSafety: false },
  { key: 'tree',          label: 'Dangerous Tree',         glyph: '⋔', ariaLabel: 'Dangerous tree',          severityWeight: 3,   isSafety: true  },
  { key: 'footpath',      label: 'Damaged Footpath',       glyph: '▤', ariaLabel: 'Damaged footpath',        severityWeight: 2,   isSafety: false },
  { key: 'other',         label: 'Other Infrastructure',   glyph: '○', ariaLabel: 'Other infrastructure',    severityWeight: 1,   isSafety: false },
]

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c])
) as Record<ReportCategory, CategoryConfig>

export const SEVERITY_WEIGHTS: Record<string, number> = {
  safety: 3,
  accessibility: 2.5,
  infrastructure: 2,
  environmental: 1,
}
