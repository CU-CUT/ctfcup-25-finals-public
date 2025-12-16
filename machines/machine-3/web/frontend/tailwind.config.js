/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', '"Manrope"', 'sans-serif'],
        body: ['"Space Grotesk"', '"Manrope"', 'sans-serif'],
      },
      colors: {
        surface: 'var(--color-surface)',
        muted: 'var(--color-muted)',
        primary: 'var(--color-primary)',
        'primary-strong': 'var(--color-primary-strong)',
        border: 'var(--color-border)',
      },
      boxShadow: {
        card: '0 10px 30px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};
