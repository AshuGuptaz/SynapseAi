import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:       '#07070f',
        'bg-2':   '#0c0c1a',
        synapse: {
          violet: '#8b5cf6',
          indigo: '#6366f1',
          cyan:   '#22d3ee',
          pink:   '#ec4899',
          green:  '#10d9a0',
          amber:  '#fbbf24',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      backgroundImage: {
        'grad-1': 'linear-gradient(135deg,#8b5cf6 0%,#22d3ee 100%)',
        'grad-2': 'linear-gradient(135deg,#ec4899 0%,#8b5cf6 100%)',
        'grad-3': 'linear-gradient(135deg,#22d3ee 0%,#10d9a0 100%)',
      },
      animation: {
        'fade-up': 'fadeUp .4s ease',
        'pulse-dot': 'pulse 1.6s infinite',
        bob: 'bob 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        bob: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
