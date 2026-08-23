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
        /* Obsidian Precision Design Tokens */
        page: 'var(--page)',
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        inset: 'var(--inset)',
        field: 'var(--field)',
        hover: 'var(--hover)',
        'hover-2': 'var(--hover-2)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-ink': 'var(--accent-ink)',
        'accent-tint': 'var(--accent-tint)',
        'brand-purple': 'var(--brand-purple)',
        'brand-purple-dark': 'var(--brand-purple-dark)',
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

        /* Canonical Obsidian Stack */
        obsidian: {
          canvas: '#090A0F',
          panel: '#0E121A',
          card: '#141A24',
          raised: '#1B2230',
          overlay: '#222B3D',
          inset: '#0D1117',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        chip: 'var(--radius-chip)',
        control: 'var(--radius-control)',
        card: 'var(--radius-card)',
        window: 'var(--radius-window)',
      },
      boxShadow: {
        hairline: 'var(--shadow-hairline)',
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
      },
    },
  },
  plugins: [],
}
