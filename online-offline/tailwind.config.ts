import type { Config } from 'tailwindcss'

// Tailwind is kept for layout utilities only (a handful of className uses in
// src/components/v2/*). The shadcn colour/radius/animate wiring was retired in
// redesign Phase 13 — app colour comes from the v2 tokens in globals.css.
const config: Config = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
