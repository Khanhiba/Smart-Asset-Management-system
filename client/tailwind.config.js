/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111828',
        panel: '#f7f8fc',
        brand: { 50: '#eef2ff', 100: '#e0e7ff', 500: '#5965f2', 600: '#4652df', 700: '#3944c2' },
      },
      boxShadow: { card: '0 8px 30px rgba(20, 29, 68, 0.07)' },
    },
  },
  plugins: [],
};
