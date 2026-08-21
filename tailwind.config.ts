import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        status: {
          open: {
            bg: "#FEF2F2",
            text: "#991B1B",
            border: "#FCA5A5",
            dot: "#EF4444",
          },
          resolved: {
            bg: "#FFFBEB",
            text: "#92400E",
            border: "#FCD34D",
            dot: "#F59E0B",
          },
          closed: {
            bg: "#ECFDF5",
            text: "#065F46",
            border: "#6EE7B7",
            dot: "#10B981",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "Plus Jakarta Sans", "sans-serif"],
      },
      fontSize: {
        base: ["1rem", { lineHeight: "1.5rem" }], // 16px min base font
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
      },
      minHeight: {
        touch: "48px",
      },
      minWidth: {
        touch: "48px",
      },
    },
  },
  plugins: [],
};

export default config;
