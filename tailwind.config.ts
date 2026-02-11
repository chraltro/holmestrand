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
        huset: {
          bg: "var(--bg-primary)",
          "bg-alt": "var(--bg-secondary)",
          glass: "var(--surface-glass)",
          "glass-hover": "var(--surface-glass-hover)",
          border: "var(--border-subtle)",
          "border-active": "var(--border-active)",
          text: "var(--text-primary)",
          "text-secondary": "var(--text-secondary)",
          "text-muted": "var(--text-muted)",
          amber: "var(--accent-amber)",
          rose: "var(--accent-rose)",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "-apple-system", "sans-serif"],
        display: ['"Fraunces"', '"DM Sans"', "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
