// Fichier : tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  // Indique à Tailwind de scanner tous les fichiers JS/JSX/TSX dans les dossiers pages et components
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}", 
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
