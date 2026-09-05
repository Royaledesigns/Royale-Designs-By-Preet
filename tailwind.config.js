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
        gold: '#b98b3e',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
