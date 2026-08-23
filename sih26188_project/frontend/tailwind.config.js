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
        /* Beautiful UI design system tokens */
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
        'accent-ink': 'var(--accent-ink)',
        'accent-tint': 'var(--accent-tint)',
        'blue-tint': 'var(--blue-tint)',
        'green-tint': 'var(--green-tint)',
        'orange-tint': 'var(--orange-tint)',
        'red-tint': 'var(--red-tint)',

        /* Cyber-tactical defense palettes */
        defense: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#0b1d30',
        },
        security: {
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
        }
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
        'shimmer-text': 'shimmer-text 2.5s linear infinite',
        'records-pulse': 'records-pulse 1.1s ease-in-out infinite',
        'radar-sweep': 'radarSweep 2.5s linear infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-red': 'glowRed 1.5s ease-in-out infinite alternate',
        'glow-green': 'glowGreen 2s ease-in-out infinite alternate',
        'alert-pulse-red': 'pulseGlowRed 1.2s ease-in-out infinite',
      },
      keyframes: {
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'pop-out': {
          from: { opacity: '1', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(0.95)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'shimmer-text': {
          from: { backgroundPosition: '150% center' },
          to: { backgroundPosition: '-50% center' },
        },
        'records-pulse': {
          '0%, 100%': { opacity: '0.35', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        radarSweep: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        pulseGlowRed: {
          '0%, 100%': {
            boxShadow: '0 0 12px rgb(239 68 68 / .35), 0 0 0 1px rgb(239 68 68 / .5)',
          },
          '50%': {
            boxShadow: '0 0 28px rgb(239 68 68 / .65), 0 0 0 1px rgb(239 68 68 / .9)',
          },
        },
        glowRed: {
          '0%': { boxShadow: '0 0 5px rgba(239, 68, 68, 0.4), inset 0 0 5px rgba(239, 68, 68, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(239, 68, 68, 0.8), inset 0 0 10px rgba(239, 68, 68, 0.4)' },
        },
        glowGreen: {
          '0%': { boxShadow: '0 0 5px rgba(16, 185, 129, 0.3)' },
          '100%': { boxShadow: '0 0 15px rgba(16, 185, 129, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}
