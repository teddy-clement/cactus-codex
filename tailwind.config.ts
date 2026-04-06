import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cc: {
          green: '#1a4a2e',
          mid:   '#2d6b45',
          lit:   '#4ade80',
        },
        bg: {
          DEFAULT: '#060d08',
          2:       '#0a120c',
        },
        surface: {
          DEFAULT: '#111a12',
          2:       '#172019',
          3:       '#1d2a1f',
        },
        border: {
          DEFAULT: '#192b1b',
          2:       '#233428',
          3:       '#2e4432',
        },
      },
      fontFamily: {
        mono:    ['DM Mono', 'monospace'],
        display: ['Barlow Condensed', 'sans-serif'],
        body:    ['Barlow', 'sans-serif'],
      },
      keyframes: {
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        slideUp: 'slideUp .3s cubic-bezier(.22,.68,0,1.2) both',
      },
    },
  },
  plugins: [],
}

export default config
