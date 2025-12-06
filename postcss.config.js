module.exports = {
  plugins: {
    'tailwindcss/tailwindcss': {
      config: {
        content: [
          "./pages/**/*.{js,ts,jsx,tsx}",
          "./components/**/*.{js,ts,jsx,tsx}",
          "./app/**/*.{js,ts,jsx,tsx}",
        ],
      },
    },
    'autoprefixer': {},
  }
}