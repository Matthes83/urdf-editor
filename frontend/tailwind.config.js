/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#1a1a2e',
        surface: '#16213e',
        primary: '#0f3460',
        accent: '#e94560',
      },
    },
  },
  plugins: [],
}
