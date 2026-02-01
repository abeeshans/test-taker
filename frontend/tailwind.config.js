/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'selector',
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'great-vibes': ['var(--font-great-vibes)'],
        'quicksand': ['var(--font-quicksand)'],
      },
    },
  },
  plugins: [],
}
