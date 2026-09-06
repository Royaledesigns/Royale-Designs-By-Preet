/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#2f4a3d',
          light: '#3f6350',
          dark: '#213629',
        },
        blush: {
          DEFAULT: '#eec9c9',
          light: '#f5dede',
          dark: '#dba9a9',
        },
        cream: {
          DEFAULT: '#faf6ef',
          dark: '#f0e9db',
        },
        // Slightly deepened from the original #b98b3e so forest-dark button
        // text (bg-gold buttons) clears WCAG AA contrast (was 4.2:1, now 5:1+).
        gold: '#c89a44',
        // Darker gold for small/body text on light backgrounds — even this
        // deepened gold still fails WCAG AA contrast at small text sizes,
        // so text-gold-dark is used instead for text (not buttons).
        'gold-dark': '#8a6427',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
