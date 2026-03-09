/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF6B35',
        secondary: '#4ECDC4',
        accent: '#FFE66D',
        dark: '#2C3E50',
        light: '#F7F7F7'
      }
    },
  },
  plugins: [],
}