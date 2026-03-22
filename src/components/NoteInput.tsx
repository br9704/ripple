import { MAX_NOTE_LENGTH } from '@/constants/config'

interface NoteInputProps {
  value: string
  onChange: (value: string) => void
}

export function NoteInput({ value, onChange }: NoteInputProps) {
  const remaining = MAX_NOTE_LENGTH - value.length
  const atLimit = remaining <= 0

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => {
          if (e.target.value.length <= MAX_NOTE_LENGTH) {
            onChange(e.target.value)
          }
        }}
        placeholder="Add a note... (optional)"
        maxLength={MAX_NOTE_LENGTH}
        rows={2}
        className="w-full resize-none rounded-lg border border-border bg-bg-elevated px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-action focus:outline-none focus:ring-1 focus:ring-action"
      />
      <span
        className={`absolute bottom-2 right-3 text-xs ${
          atLimit ? 'text-status-declined' : 'text-text-tertiary'
        }`}
      >
        {value.length}/{MAX_NOTE_LENGTH}
      </span>
    </div>
  )
}
