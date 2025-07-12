/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        night: '#0b0c2a',      // Bleu nuit
        ocean: '#1e4ca8',      // Bleu océan
        anthracite: '#1b1b1b', // Gris anthracite
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'Open Sans', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
};