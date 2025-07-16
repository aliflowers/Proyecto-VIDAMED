/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#007C91',
        'primary-dark': '#005F73',
        secondary: '#4FBDBA',
        dark: '#0A0A0A',
        light: '#F7F9FB',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
