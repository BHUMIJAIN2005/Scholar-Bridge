/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mint: "var(--mint)",
        sage: "var(--sage)",
        leaf: "var(--leaf)",
        forest: "var(--forest)",
        "mid-green": "var(--mid-green)",
        "night-green": "var(--night-green)",
        ink: "var(--ink)",
        mist: "var(--mist)",
      },
    },
  },
  plugins: [],
};
