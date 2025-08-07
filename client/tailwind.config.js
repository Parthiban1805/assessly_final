/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: {
          DEFAULT: '#5291ea',
          dark: '#2563eb'
        },
        danger: '#ef4444',
        success: '#10b981',
        'background-light': '#f8fafc',
        'border-color': '#e2e8f0',
        'text-dark': '#1e293b'
      },
      keyframes: {
        modalFadeIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      },
      animation: {
        modalFadeIn: 'modalFadeIn 0.3s ease-out forwards',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}