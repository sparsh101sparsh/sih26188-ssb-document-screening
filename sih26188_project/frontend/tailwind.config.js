/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* Sovereign Defense & Government Gold tokens */
        page: 'var(--page)',
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        inset: 'var(--inset)',
        field: 'var(--field)',
        hover: 'var(--hover)',
        'hover-2': 'var(--hover-2)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        'line-gold': 'var(--line-gold)',
        
        /* Gold Accent Tokens */
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-ink': 'var(--accent-ink)',
        'accent-tint': 'var(--accent-tint)',
        gold: {
          light: '#FFF3B8',
          bright: '#F3CE63',
          DEFAULT: '#C5962B',
          dark: '#8D6412',
          deep: '#5C4008',
        },
        navy: {
          deep: '#020814',
          midnight: '#061022',
          base: '#0B1D3A',
          card: '#0D254F',
          surface: '#102B59',
          royal: '#07325F',
          highlight: '#0B4278',
        },

        /* Status Verdict Tokens */
        green: 'var(--green)',
        'green-bg': 'var(--green-bg)',
        'green-tint': 'var(--green-tint)',
        'green-border': 'var(--green-border)',
        orange: 'var(--orange)',
        'orange-bg': 'var(--orange-bg)',
        'orange-tint': 'var(--orange-tint)',
        'orange-border': 'var(--orange-border)',
        red: 'var(--red)',
        'red-bg': 'var(--red-bg)',
        'red-tint': 'var(--red-tint)',
        'red-border': 'var(--red-border)',
      },
      fontFamily: {
        serif: ['"Cinzel"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        chip: 'var(--radius-chip)',
        control: 'var(--radius-control)',
        card: 'var(--radius-card)',
        window: 'var(--radius-window)',
      },
      boxShadow: {
        hairline: 'var(--shadow-hairline)',
        gold: '0 0 0 1px rgba(212, 175, 55, 0.28), 0 4px 20px rgba(0, 0, 0, 0.45)',
        'gold-glow': '0 0 25px rgba(226, 184, 66, 0.35)',
        btn: 'var(--shadow-btn)',
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
        overlay: 'var(--shadow-overlay)',
        'inset-field': 'var(--shadow-inset-field)',
      },
      transitionTimingFunction: {
        'out-strong': 'var(--ease-out-strong)',
        'in-out-strong': 'var(--ease-in-out-strong)',
        link: 'var(--ease-link)',
      },
      animation: {
        'pop-in': 'pop-in 160ms var(--ease-out-strong) both',
        'pop-out': 'pop-out 160ms var(--ease-out-strong) both',
        'fade-up': 'fade-up 220ms var(--ease-out-strong) both',
        'fade-in': 'fade-in 180ms ease-out both',
        'stream-in': 'stream-in 280ms var(--ease-out-strong) both',
        'radar-sweep': 'radar-sweep 3.5s linear infinite',
        'gold-shimmer': 'gold-shimmer 2.5s ease-in-out infinite',
      },
      keyframes: {
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'pop-out': {
          from: { opacity: '1', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(0.97)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'radar-sweep': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'gold-shimmer': {
          '0%, 100%': { opacity: '0.85', filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.4))' },
          '50%': { opacity: '1.0', filter: 'drop-shadow(0 0 20px rgba(255,223,109,0.8))' },
        }
      },
    },
  },
  plugins: [],
}
