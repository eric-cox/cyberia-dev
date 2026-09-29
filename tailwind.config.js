/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        term: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        'ice-950': '#05080f',
        'ice-900': '#0a1120',
        'ice-800': '#0d1526',
        'ice-700': '#16233c',
        'ice-600': '#1d2c44',
        'ice-400': '#4d6a8f',
        'ice-300': '#9fb6cc',
        'ice-200': '#c9d8ec',
        'ice-100': '#e8f2ff',
        'frost': '#6fd6ff',
        'ember-500': '#ff8c42',
        'ember-400': '#ffb347',
        'blood': '#ff4757',
      },
      animation: {
        'toast-in': 'toast-in 240ms steps(6) both',
        'heat-critical': 'heat-critical 420ms steps(2) infinite',
        'hurt-flash': 'hurt-flash 380ms steps(5) both',
        'title-drift': 'title-drift 3.4s ease-in-out infinite',
        'blink-soft': 'blink-soft 1.1s steps(2) infinite',
        'overlay-in': 'overlay-in 220ms steps(6) both',
        'danger-pulse': 'danger-pulse 0.85s ease-in-out infinite',
      },
      keyframes: {
        'toast-in': {
          '0%': { transform: 'translateY(16px) scale(0.9)', opacity: '0' },
          '60%': { transform: 'translateY(-3px) scale(1.02)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'heat-critical': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        'hurt-flash': {
          '0%': { opacity: '0.55' },
          '100%': { opacity: '0' },
        },
        'title-drift': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'blink-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        'overlay-in': {
          'from': { opacity: '0', transform: 'scale(1.04)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
        'danger-pulse': {
          '0%, 100%': { filter: 'brightness(0.55)' },
          '50%': { filter: 'brightness(1.35)' },
        },
      },
    },
  },
  plugins: [],
}
