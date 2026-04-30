import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "var(--accent-50)",
          100: "var(--accent-light)",
          500: "var(--accent)",
          600: "var(--accent)",
          700: "var(--accent-hover)",
          900: "#3a5e5e",
        },
        sky: {
          50:  "var(--accent-50)",
          100: "var(--accent-light)",
          300: "var(--accent)",
          400: "var(--accent)",
          500: "var(--accent)",
          600: "var(--accent)",
          700: "var(--accent-hover)",
          900: "#3a5e5e",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
