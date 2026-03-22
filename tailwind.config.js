/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0D1117',
          secondary: '#161B22',
          elevated: '#21262D',
        },
        border: {
          DEFAULT: '#30363D',
          bright: '#484F58',
        },
        text: {
          primary: '#F0F6FC',
          secondary: '#8B949E',
          tertiary: '#484F58',
        },
        action: {
          DEFAULT: '#E85D04',
          hover: '#F48C06',
        },
        status: {
          reported: '#8B949E',
          acknowledged: '#388BFD',
          'in-progress': '#F0883E',
          fixed: '#3FB950',
          declined: '#F85149',
        },
        cat: {
          pothole: '#F85149',
          streetlight: '#F0883E',
          graffiti: '#BC8CFF',
          signage: '#F0883E',
          accessibility: '#388BFD',
          dumping: '#986B4A',
          water: '#39D0D8',
          tree: '#3FB950',
          footpath: '#E3B341',
          other: '#8B949E',
        },
        upvote: {
          DEFAULT: '#F0883E',
          active: '#E85D04',
        },
      },
      fontFamily: {
        display: ['Syne', 'Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
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
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.3)',
        glow: '0 0 20px rgba(232,93,4,0.5)',
      },
    },
  },
  plugins: [],
}
