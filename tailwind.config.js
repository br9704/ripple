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
          tertiary: '#55504a',
        },
        // The ONE accent. Used sparingly: cursor, status dots, CTAs, focus
        // brackets, key data. Never as a large filled surface.
        action: {
          DEFAULT: '#ffb000',   // amber (phosphor)
          hover: '#ffc94d',
          dim: '#8f6300',
        },
        status: {
          reported: '#98928a',
          acknowledged: '#8f6300',
          'in-progress': '#ffb000',
          fixed: '#4a7c4e',     // the only green in the system (MOTION.md:89)
          declined: '#55504a',  // dim, not red — refusal is information
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
        xs: '0.6875rem',
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
