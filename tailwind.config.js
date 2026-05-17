/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: "#1a1a18",
        "charcoal-soft": "#23231f",
        "charcoal-line": "#2d2d28",
        gold: "#D4A017",
        "gold-soft": "#E5B73B",
        cream: "#F5F0E8",
        "cream-dim": "#bdb6a8",
        flame: "#F4923A",
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        "fade-in": "fadeIn 0.45s ease-out both",
        "slide-up": "slideUp 0.5s ease-out both",
        "shimmer": "shimmer 2.4s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(18px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(212,160,23,0.35), 0 18px 40px -18px rgba(212,160,23,0.45)",
      },
    },
  },
  plugins: [],
}
