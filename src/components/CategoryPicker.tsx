import { CATEGORIES } from '@/constants/categories'
import type { ReportCategory } from '@/types'

interface CategoryPickerProps {
  selected: ReportCategory | null
  onSelect: (category: ReportCategory) => void
}

/**
 * Category grid, rendered as a directory listing rather than coloured chips.
 * Selection is marked by an amber bracket and border — the accent is spent on
 * one element at a time, not painted across a whole button.
 */
export function CategoryPicker({ selected, onSelect }: CategoryPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-px border border-border bg-border">
      {CATEGORIES.map((cat) => {
        const isSelected = selected === cat.key
        return (
          <button
            key={cat.key}
            type="button"
            onClick={() => onSelect(cat.key)}
            aria-pressed={isSelected}
            className={`flex items-center gap-2 px-3 py-3 text-left font-mono text-xs transition-colors duration-150 ease-signal ${
              isSelected
                ? 'bg-bg-primary text-action'
                : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
            }`}
          >
            {/* Fixed-width so the labels align into a column. */}
            <span aria-hidden="true" className="w-4 shrink-0 text-center">
              {cat.glyph}
            </span>
            <span className="truncate">{cat.label.split(' / ')[0]}</span>
            {/* The glyph carries no meaning for a screen reader. */}
            <span className="sr-only">{cat.ariaLabel}</span>
          </button>
        )
      })}
    </div>
  )
}
