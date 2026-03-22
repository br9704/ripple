import { CATEGORIES } from '@/constants/categories'
import type { ReportCategory } from '@/types'

interface CategoryPickerProps {
  selected: ReportCategory | null
  onSelect: (category: ReportCategory) => void
}

export function CategoryPicker({ selected, onSelect }: CategoryPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {CATEGORIES.map((cat) => {
        const isSelected = selected === cat.key
        return (
          <button
            key={cat.key}
            type="button"
            onClick={() => onSelect(cat.key)}
            className={`flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-action text-text-primary ring-2 ring-action-hover'
                : 'bg-bg-elevated text-text-secondary hover:text-text-primary active:text-text-primary'
            }`}
          >
            <span className="text-base" aria-hidden="true">{cat.icon}</span>
            <span className="truncate">{cat.label.split(' / ')[0]}</span>
          </button>
        )
      })}
    </div>
  )
}
