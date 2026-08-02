/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // We set up CSS variables so different venues (Wonderla, Cubbon) can inject their own brand colors
        primary: "var(--primary)",
        primaryForeground: "var(--primary-foreground)",
        surface: "var(--surface)", // For glassmorphism panels
        surfaceForeground: "var(--surface-foreground)",
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
