import { AppHeader } from '@/components/AppHeader'
import { TabBar } from '@/components/TabBar'
import {
  TERMS_REVIEW_NOTICE,
  TERMS_SECTIONS,
  isPlaceholder,
} from '@/constants/terms'

/**
 * Terms of use and privacy summary (S21.6, PRD §13.4 / §15).
 *
 * The page is deliberately a renderer and nothing else — the copy lives in
 * `@/constants/terms` so it can be asserted on by a test, which is what keeps
 * the PRD-mandated prohibitions from quietly disappearing in a later edit.
 *
 * Unresolved owner inputs are rendered *visibly*, in amber, rather than hidden
 * or softened. A placeholder that reads like finished prose is worse than no
 * placeholder at all: it looks answered. Showing them makes the document's own
 * incompleteness impossible to miss on the way to launch.
 *
 * No motion here on purpose. MOTION.md's reveal exists to make work legible;
 * a document that is already fully rendered has no work to show, and animating
 * a legal page in would only delay reading it.
 */
export function TermsPage() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      <AppHeader />

      <div className="absolute inset-0 overflow-y-auto pb-20 pt-[52px]">
        <div className="border-b border-border px-4 py-3">
          <h1 className="font-mono text-xs text-text-primary">terms &amp; privacy</h1>
          <p className="mt-1 font-mono text-xs text-text-tertiary">
            &gt; what ripple does with a report, and what you may not photograph
          </p>
        </div>

        <div className="border-b border-border-bright px-4 py-3">
          <p className="font-mono text-xs leading-relaxed text-action">
            &gt; draft — requires legal review before launch
          </p>
          <p className="mt-2 max-w-prose font-mono text-xs leading-relaxed text-text-secondary">
            {TERMS_REVIEW_NOTICE}
          </p>
        </div>

        <div className="px-4 pb-10">
          {TERMS_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="border-b border-border py-5">
              <h2 className="font-mono text-xs text-text-primary">{section.heading}</h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    className={`max-w-prose font-mono text-xs leading-relaxed ${
                      isPlaceholder(paragraph) ? 'text-action' : 'text-text-secondary'
                    }`}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <TabBar />
    </div>
  )
}
