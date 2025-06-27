/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'arena-dark': 'var(--color-arena-dark)',
        'arena-med': 'var(--color-arena-med)',
        'arena-light': 'var(--color-arena-light)',
        'arena-surface': 'var(--color-arena-surface)',
        'arena-card': 'var(--color-arena-card)',
        'arena-border': 'var(--color-arena-border)',
        'arena-accent': 'var(--color-arena-accent)',
        'arena-accent-hover': 'var(--color-arena-accent-hover)',
        'arena-accent-glow': 'var(--color-arena-accent-glow)',
        'arena-secondary': 'var(--color-arena-secondary)',
        'arena-secondary-hover': 'var(--color-arena-secondary-hover)',
        'arena-tertiary': 'var(--color-arena-tertiary)',
        'arena-text': 'var(--color-arena-text)',
        'arena-text-muted': 'var(--color-arena-text-muted)',
        'arena-text-dim': 'var(--color-arena-text-dim)',
      },
      backgroundImage: {
        'arena-gradient-primary': 'var(--gradient-arena-primary)',
        'arena-gradient-secondary': 'var(--gradient-arena-secondary)',
        'arena-gradient-dark': 'var(--gradient-arena-dark)',
        'arena-gradient-radial': 'var(--gradient-arena-radial)',
        'arena-gradient-mesh': 'var(--gradient-arena-mesh)',
      },
      boxShadow: {
        'arena-sm': 'var(--shadow-arena-sm)',
        'arena-md': 'var(--shadow-arena-md)',
        'arena-lg': 'var(--shadow-arena-lg)',
        'arena-glow': 'var(--shadow-arena-glow)',
      }
    },
  },
  plugins: [],
} 