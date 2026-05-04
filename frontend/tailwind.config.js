/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      spacing: { '4.5': '1.125rem', '13': '3.25rem', '15': '3.75rem', '18': '4.5rem' },
      borderRadius: { 'inherit': 'inherit' },
      transitionTimingFunction: { 'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    },
  },
  plugins: [],
}