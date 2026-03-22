import type { ReportCategory } from '@/types'

export interface CategoryConfig {
  key: ReportCategory
  label: string
  color: string
  icon: string
  severityWeight: number
}

export const CATEGORIES: CategoryConfig[] = [
  { key: 'pothole', label: 'Pothole / Road Damage', color: '#F85149', icon: '🚧', severityWeight: 2 },
  { key: 'streetlight', label: 'Broken Streetlight', color: '#F0883E', icon: '💡', severityWeight: 3 },
  { key: 'graffiti', label: 'Graffiti / Vandalism', color: '#BC8CFF', icon: '✏️', severityWeight: 1 },
  { key: 'signage', label: 'Damaged Signage', color: '#F0883E', icon: '🪧', severityWeight: 2 },
  { key: 'accessibility', label: 'Accessibility Hazard', color: '#388BFD', icon: '♿', severityWeight: 2.5 },
  { key: 'dumping', label: 'Illegal Dumping', color: '#986B4A', icon: '🗑️', severityWeight: 1 },
  { key: 'water', label: 'Water / Drainage Issue', color: '#39D0D8', icon: '💧', severityWeight: 2 },
  { key: 'tree', label: 'Dangerous Tree', color: '#3FB950', icon: '🌳', severityWeight: 3 },
  { key: 'footpath', label: 'Damaged Footpath', color: '#E3B341', icon: '🚶', severityWeight: 2 },
  { key: 'other', label: 'Other Infrastructure', color: '#8B949E', icon: '📋', severityWeight: 1 },
] as const

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c])
) as Record<ReportCategory, CategoryConfig>

export const SEVERITY_WEIGHTS: Record<string, number> = {
  safety: 3,
  accessibility: 2.5,
  infrastructure: 2,
  environmental: 1,
}
