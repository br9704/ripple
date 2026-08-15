/** @type {import('tailwindcss').Config} */

// SIGNAL tokens. Source of truth: ~/bruno-portfolio/CLAUDE.md
// § "Redesign Design Decisions (2026-07 · SIGNAL)".
//
// Values mirror the CSS custom properties in src/index.css. Legacy key names
// (bg.primary, action.DEFAULT, …) are retained deliberately so the migration is
// a value swap at the leaves rather than a rename across the whole component
// tree — the names are structural, only the values were wrong.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#050505',   // warm black
          secondary: '#0b0a09', // surface
          elevated: '#0b0a09',  // SIGNAL has no elevation ladder — one surface
        },
        border: {
          DEFAULT: '#1b1916',   // hairline — structural rules
          bright: '#2c2925',    // steel — visible border
        },
        text: {
          primary: '#f0ece4',   // warm white
          secondary: '#98928a',
          tertiary: '#847d72', // measured 5.01:1 on #050505 — WCAG AA body text
        },
        // The ONE accent. Used sparingly: cursor, status dots, CTAs, focus
        // brackets, key data. Never as a large filled surface.
        action: {
          DEFAULT: '#ffb000',   // amber (phosphor) — 11.12:1
          hover: '#ffc94d',     // 13.31:1
          dim: '#9e6d00',       // 4.50:1 — was #8f6300 (3.84:1), see S21.13
        },
        // ── S21.13, 15 Aug 2026 ──
        // These values are the ones that matter: `text-status-declined` and
        // friends resolve from THIS file, not from the custom properties in
        // index.css. Three copies of the same palette exist (here, index.css,
        // and src/constants/statuses.ts for Mapbox paint properties, which
        // cannot read a CSS variable), and a contrast fix applied to only one
        // of them changes nothing a user sees. All three now agree, and
        // src/constants/statuses.contrast.test.ts fails the build if they
        // drift or if any value drops below WCAG AA's 4.5:1 on #050505.
        status: {
          reported: '#98928a',      // 6.61:1
          acknowledged: '#9e6d00',  // 4.50:1 — was #8f6300 (3.84:1)
          'in-progress': '#ffb000', // 11.12:1
          fixed: '#4e8252',         // 4.50:1 — was #4a7c4e (4.16:1). Still the only green (MOTION.md:89)
          declined: '#7d756d',      // 4.50:1 — was #55504a (2.56:1). Dim, not red — refusal is information
        },
        upvote: {
          DEFAULT: '#98928a',
          active: '#ffb000',
        },
      },
      fontFamily: {
        // Inter removed — SIGNAL excludes it by name.
        display: ['Syne', 'sans-serif'],
        body: ['Syne', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: '0.75rem', // 12px — Lighthouse legible-font-size floor
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.375rem',
        '2xl': '1.75rem',
        '4xl': '2.5rem',
      },
      // Effectively square. The ripple ring is the sole exception and is
      // defined in index.css, not here.
      borderRadius: {
        sm: '2px',
        md: '2px',
        lg: '2px',
        xl: '2px',
        full: '2px',
      },
      // No shadows, no glows. Depth comes from hairline borders.
      boxShadow: {
        none: 'none',
      },
      transitionTimingFunction: {
        signal: 'cubic-bezier(0.16, 1, 0.3, 1)', // ease-out
      },
      animation: {
        'status-pulse': 'status-pulse 2s ease-in-out infinite',
        'scan-line': 'scan-line 1200ms linear infinite',
      },
      keyframes: {
        'status-pulse': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        // Sprint 7's classification scan sweep.
        'scan-line': {
          '0%': { transform: 'translateY(0%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
}
