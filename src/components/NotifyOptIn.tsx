import { isValidEmail } from '@/lib/validateEmail'

interface NotifyOptInProps {
  value: string
  onChange: (email: string) => void
}

/**
 * Optional email for status updates (PRD §6.5).
 *
 * Opt-in in the strict sense: empty by default, no pre-ticked box, and the
 * copy states what the address is and is not used for. PRD §13.1 makes
 * anonymity the default and email strictly optional, so this control must never
 * imply that supplying one is expected.
 */
export function NotifyOptIn({ value, onChange }: NotifyOptInProps) {
  const touched = value.trim().length > 0
  const invalid = touched && !isValidEmail(value)

  return (
    <div>
      <label className="block">
        <span className="mb-2 block font-mono text-xs text-text-secondary">
          email me when this changes (optional)
        </span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="you@example.com"
          aria-invalid={invalid}
          aria-describedby="notify-help"
          className={`w-full border bg-bg-secondary px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none ${
            invalid ? 'border-status-declined' : 'border-border-bright focus:border-action'
          }`}
        />
      </label>

      <p id="notify-help" className="mt-2 font-mono text-xs text-text-tertiary">
        {invalid
          ? "> that doesn't look like an email address"
          : '> only used for updates on this report. never shared.'}
      </p>
    </div>
  )
}
