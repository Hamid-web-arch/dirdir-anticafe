// Rəng və şrift dəyərləri src/index.css-dəki :root dəyişənlərindən gəlir —
// dəyişiklik üçün orada redaktə et, bura toxunmağa ehtiyac yoxdur.

// CSS dəyişənini Tailwind rənginə çevirir; bg-ink/10 kimi şəffaflıq modifikatorları da işləyir.
const token = (name) => `color-mix(in srgb, var(${name}) calc(<alpha-value> * 100%), transparent)`

const family = (name) => ({
  DEFAULT: token(name),
  soft: token(`${name}-soft`),
  deep: token(`${name}-deep`),
})

const medal = (name) => ({
  DEFAULT: token(`${name}-ring`),
  soft: token(`${name}-soft`),
  deep: token(`${name}-deep`),
})

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('--color-bg'),
        card: token('--color-card'),
        ink: token('--color-ink'),
        inkdim: token('--color-inkdim'),
        primary: token('--color-primary'),
        accent: token('--color-accent'),
        brand: {
          pink: family('--brand-pink'),
          purple: family('--brand-purple'),
          yellow: family('--brand-yellow'),
          teal: family('--brand-teal'),
          orange: family('--brand-orange'),
          cyan: family('--brand-cyan'),
        },
        medal: {
          gold: medal('--medal-gold'),
          silver: medal('--medal-silver'),
          bronze: medal('--medal-bronze'),
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
      },
      boxShadow: {
        cta: '0 8px 20px color-mix(in srgb, var(--color-primary) 35%, transparent)',
        'cta-hover': '0 12px 26px color-mix(in srgb, var(--color-primary) 45%, transparent)',
        lift: '0 14px 30px color-mix(in srgb, var(--color-ink) 10%, transparent)',
      },
      dropShadow: {
        soft: '0 6px 14px color-mix(in srgb, var(--color-ink) 25%, transparent)',
      },
      animation: {
        'spin-slow': 'spin 26s linear infinite',
        blob: 'blob 12s ease-in-out infinite',
        progress: 'progress linear forwards',
      },
      keyframes: {
        progress: {
          from: { width: '0%' },
          to: { width: '100%' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(20px, -15px) scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
}
