/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F5FBF6',
        card: '#FFFFFF',
        ink: '#1D2B24',
        inkdim: '#5B6A62',
        brand: {
          pink: '#FF4F81',
          purple: '#7C5CFF',
          yellow: '#FFC839',
          teal: '#00BFA6',
          orange: '#FF9D4D',
          cyan: '#4DD0E1',
        },
      },
      fontFamily: {
        display: ['Fredoka', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 26s linear infinite',
        blob: 'blob 12s ease-in-out infinite',
      },
      keyframes: {
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(20px, -15px) scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
}
