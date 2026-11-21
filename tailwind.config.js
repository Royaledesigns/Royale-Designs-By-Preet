/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Same hues and roughly the same lightness as the original palette,
        // with saturation raised noticeably (forest ~22%->46%, blush
        // ~52%->62%, gold ~55%->65-68%) so the site reads vivid rather than
        // dull/washed-out. Every text/background pairing below was
        // re-checked against WCAG AA after this change — see the specific
        // contrast notes on gold and gold-dark.
        forest: {
          DEFAULT: '#21593e',
          light: '#2d7b52',
          dark: '#164126',
        },
        blush: {
          DEFAULT: '#e69494',
          light: '#eeb4b4',
          dark: '#d77070',
        },
        cream: {
          DEFAULT: '#faf6ef',
          dark: '#f0e9db',
        },
        // Richer/more saturated than the original #c89a44 while keeping the
        // same lightness, so forest-dark button text (bg-gold buttons)
        // still clears WCAG AA contrast (~5:1, same margin as before).
        gold: '#d9a036',
        // Darker, more saturated gold for small/body text on light
        // backgrounds — even this deepened gold still fails WCAG AA
        // contrast at small text sizes on bg-gold, so text-gold-dark is
        // used instead for text (not buttons). Lightened slightly versus a
        // naive saturation boost so contrast on cream/cream-dark (5.3:1 /
        // 4.8:1) stays a bit above the original (5.0:1 / 4.4:1), never below.
        'gold-dark': '#875e1d',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
