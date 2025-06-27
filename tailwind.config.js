/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#004e4c', // Dark teal
        'brand-secondary': '#f47920', // Orange
        'brand-accent': '#00995d', // Green
        'brand-background': '#ece3d9', // Beige background
        'brand-surface': '#ffffff', // White surface for cards
        'brand-text-light': '#ffffff',
        'brand-text-dark': '#003a38', // Darker teal for text on light backgrounds
        'brand-text-muted': '#6b7280', // Gray for muted text
        'status-success': '#16a34a',
        'status-warning': '#facc15',
        'status-danger': '#ef4444',
        'custom-light-green-analysis': '#cde3bb',
        'custom-light-green-border': '#b1d34b',
      }
    },
     fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
      serif: ['Georgia', 'serif'], 
    },
  },
  plugins: [],
}