/**
 * Terms of use and privacy summary — the copy itself (S21.6).
 *
 * It lives here rather than inside `TermsPage.tsx` for two reasons: the page
 * stays a renderer instead of a 300-line wall of JSX (CLAUDE.md §6), and the
 * copy becomes something a test can assert on, which is the only way the
 * honesty rules below stay true after the next edit.
 *
 * ── Two rules govern every line ──
 *
 * 1. The prohibitions are ours to write and are required in writing. PRD §13.4:
 *    "Not a surveillance tool. Ripple is for infrastructure, not people. The
 *    submission UI must make this clear. TOS explicitly prohibits photographing
 *    individuals." PRD §14 puts private property out of scope. PRD §15 lists
 *    "clear UI guidance; TOS; community flagging" as the mitigation for misuse.
 *
 * 2. Everything factual about what the app *does* was read out of the code
 *    before it was written here, and the source is cited inline so the next
 *    person re-verifies rather than trusts. Anything that is a *legal* fact —
 *    who operates Ripple, under which law, from which address, from which date
 *    — cannot be known from this repository and is left as an explicit
 *    `[PLACEHOLDER — …]` marker per CLAUDE.md's honesty rules. Nothing here
 *    invents a company, a jurisdiction, or a contact.
 */

export interface TermsSection {
  /** Stable anchor id — also the React key. */
  id: string
  heading: string
  /** One string per paragraph. Rendered in order. */
  body: readonly string[]
}

/**
 * The prefix every unresolved item carries. Exported so the page can style
 * placeholders distinctly and the test can find them without a magic string.
 */
export const PLACEHOLDER_PREFIX = '[PLACEHOLDER —'

/**
 * Shown at the top of the page, in its own box.
 *
 * This is not boilerplate humility. A terms page written by the engineering
 * team and shipped unreviewed, without saying so, is a claim the repository
 * cannot back — exactly what CLAUDE.md's honesty rules exist to prevent.
 */
export const TERMS_REVIEW_NOTICE =
  'This page has not been reviewed by a lawyer. It is an accurate description of what Ripple does and what it prohibits, written by the people who built it. The bracketed placeholders below have to be filled in, and the whole document reviewed by a qualified adviser, before Ripple accepts reports from the public.'

export const TERMS_SECTIONS: readonly TermsSection[] = [
  {
    id: 'purpose',
    heading: 'what ripple is for',
    body: [
      'Ripple is a way to report faults in public infrastructure — roads, footpaths, streetlights, drains, bins, signage and the like — so the council responsible for that location can see them.',
      'Ripple is not an emergency service. Nothing submitted here reaches police, fire or ambulance, and no one is watching it around the clock. If someone is in danger, use your local emergency number instead.',
    ],
  },
  {
    id: 'no-people',
    heading: 'do not photograph people',
    body: [
      'Do not photograph identifiable people. If somebody is unavoidably in frame, wait, move, or point the camera somewhere else — do not submit the photo.',
      'Ripple is a tool for looking at infrastructure, not at people. Using it to photograph, follow, identify or catalogue individuals is prohibited, whatever else is in the picture and whatever the reason.',
      'This matters more here than it would elsewhere, because every photo submitted through Ripple is published. A photograph of a person put online without their knowledge is a harm this product refuses to cause.',
    ],
  },
  {
    id: 'no-private-property',
    heading: 'public infrastructure only',
    body: [
      'Report faults on public land and public assets. Private property — houses, gardens, driveways, private car parks, the inside of buildings — is outside what councils act on and outside what Ripple is for.',
      'Do not photograph into private property from the street, and do not use a report as a way to complain about a neighbour.',
    ],
  },
  {
    id: 'public',
    heading: 'your report is public',
    body: [
      'Every report is published. The photo, the category, the note you write, the street address and the coordinates are all visible on the map and the feed to anyone who opens Ripple.',
      'Report photos sit in a public-read storage bucket (supabase/migrations/013_storage_bucket.sql). Anyone holding the photo URL can open it directly, whether or not they use Ripple.',
      'Write the note accordingly. Do not put your name, a neighbour’s name, a phone number, a car registration, or anything else you would not publish yourself into that field.',
    ],
  },
  {
    id: 'anonymous',
    heading: 'reporting is anonymous',
    body: [
      'Ripple has no accounts, no sign-up and no password. You never tell it who you are.',
      'On first use it generates a random identifier — a UUID — and keeps it in your browser (src/lib/reporterToken.ts). It is not derived from your device, your network, or anything about you, and it is not linked to a name or an email address.',
      'That identifier is what lets the app show you your own reports, remember which reports you have upvoted, and apply the limit of ten reports per hour. It is a convenience token, not a login, and it is not proof that you are anyone.',
      'It exists only in this browser. Clearing your site data deletes it, and the reports it was attached to become permanently unlinked from you. There is no recovery, because there is no account to recover.',
    ],
  },
  {
    id: 'email',
    heading: 'email is opt-in',
    body: [
      'You are never asked for an email address in order to report. The field is optional. Leave it empty and nothing is stored.',
      'If you do enter one, it is stored against that report and used only to send you status updates about it (supabase/functions/submit-report/index.ts). It is not shown on the map, not attached to the public report, and not sold or passed to third parties.',
    ],
  },
  {
    id: 'location',
    heading: 'location',
    body: [
      'Ripple asks for your location in two places: while you are making a report, and when you tap the locate control on the map. It does not track you in the background and it does not run when the app is closed.',
      'The only position stored is the single coordinate attached to a report, which is published with it — that is what makes the report useful to a council. The map’s locate control moves the view and stores nothing.',
      'Your photo is resized and re-encoded in your browser before upload (src/lib/compressImage.ts). That re-encoding drops the original file’s metadata, including any GPS tags your camera embedded in it.',
    ],
  },
  {
    id: 'moderation',
    heading: 'flagging and moderation',
    body: [
      'Comments can be flagged by anyone. A comment that reaches five flags is hidden automatically (supabase/migrations/018_comment_moderation.sql).',
      'Councils can update the status of reports in their own area.',
      'Automatic detection of faces and unsuitable images is planned but is not built yet (PRD §13.3, Phase 2). Until it is, a photo that breaks the rules above comes down because a person reported it.',
      `${PLACEHOLDER_PREFIX} the address to send a takedown or moderation request to, and who monitors it]`,
    ],
  },
  {
    id: 'removal',
    heading: 'changing or removing a report',
    body: [
      'There is currently no way to delete a report from inside the app. Once submitted, a report stays published — the database grants no delete permission to a reporter, and no screen offers it.',
      `${PLACEHOLDER_PREFIX} the process and contact address for asking that a report or photo be removed, and the timeframe for a response]`,
      `${PLACEHOLDER_PREFIX} how long reports and photos are retained]`,
    ],
  },
  {
    id: 'acceptable-use',
    heading: 'acceptable use',
    body: [
      'Do not submit false reports, knowing duplicates, or anything meant to waste a council crew’s time.',
      'Do not submit photographs of people, of the inside of private property, of injuries, or of anything a reasonable person would find distressing.',
      'Ripple limits each browser to ten reports per hour (src/constants/config.ts, enforced server-side). Working around that limit is a misuse of the service.',
    ],
  },
  {
    id: 'no-guarantee',
    heading: 'what ripple does not promise',
    body: [
      'Ripple routes your report to the council it believes is responsible for that location. It cannot make a council act, it does not speak for any council, and no council operates it.',
      'Boundary detection and address lookup can be wrong. A report can land with the wrong council, and the app tells you which one it picked so you can see when it has.',
      `${PLACEHOLDER_PREFIX} warranty disclaimer and limitation of liability, drafted by a qualified adviser]`,
    ],
  },
  {
    id: 'legal',
    heading: 'the legal parts',
    body: [
      `${PLACEHOLDER_PREFIX} the legal entity that operates Ripple, and its company or business number]`,
      `${PLACEHOLDER_PREFIX} postal address for legal notices]`,
      `${PLACEHOLDER_PREFIX} the governing law, and the courts that hear a dispute]`,
      `${PLACEHOLDER_PREFIX} how a dispute is handled before it reaches a court]`,
      `${PLACEHOLDER_PREFIX} how users are told when these terms change, and how much notice they get]`,
      `${PLACEHOLDER_PREFIX} effective date]`,
    ],
  },
]

/** True when a line is an unresolved owner input rather than shipped copy. */
export function isPlaceholder(line: string): boolean {
  return line.startsWith(PLACEHOLDER_PREFIX)
}
