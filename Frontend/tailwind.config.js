/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background-rgb) / <alpha-value>)",
        foreground: "rgb(var(--foreground-rgb) / <alpha-value>)",
        card: "rgb(var(--card-rgb) / <alpha-value>)",
        "card-foreground": "rgb(var(--card-foreground-rgb) / <alpha-value>)",
        primary: "rgb(var(--primary-rgb) / <alpha-value>)",
        "primary-foreground": "rgb(var(--primary-foreground-rgb) / <alpha-value>)",
        secondary: "rgb(var(--secondary-rgb) / <alpha-value>)",
        "secondary-foreground": "rgb(var(--secondary-foreground-rgb) / <alpha-value>)",
        muted: "rgb(var(--muted-rgb) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground-rgb) / <alpha-value>)",
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
        "accent-foreground": "rgb(var(--accent-foreground-rgb) / <alpha-value>)",
        border: "rgb(var(--border-rgb) / <alpha-value>)",
        destructive: "rgb(var(--destructive-rgb) / <alpha-value>)",
        "destructive-foreground": "rgb(var(--destructive-foreground-rgb) / <alpha-value>)",
      },
      fontFamily: {
        body: ['var(--theme-font-body, "Arial")'],
        display: ['var(--theme-font-heading, "Georgia")'],
      },
      backgroundImage: {
        gradient:
          "linear-gradient(120deg, rgb(var(--primary-rgb) / 0.96), rgb(var(--accent-rgb) / 0.96))",
      },
      boxShadow: {
        modern: "0 28px 80px rgba(15, 23, 42, 0.18)",
      },
    },
  },
  plugins: [],
};
