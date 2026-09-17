import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#fbf7e6',
        surface: {
          muted: '#fbf7e6',
          base: '#000000',
          raised: '#f3b44a',
          strong: '#efe9d2',
          subtle: '#f4eedb',
          border: 'rgba(22, 20, 14, 0.12)',
          'border-strong': 'rgba(22, 20, 14, 0.25)',
        },
        ink: {
          primary: '#16140e',
          secondary: '#57534a',
          tertiary: '#8b8577',
        },
        amber: {
          accent: '#f3b44a',
          hover: '#e2a338',
          light: '#fde8c2',
        },
        danger: {
          DEFAULT: '#d93829',
          surface: '#feeae8',
          border: '#f8a9a3',
        },
        success: {
          DEFAULT: '#1b8a5a',
          surface: '#e9f6f0',
          border: '#a2ddc0',
        },
      },
      fontFamily: {
        sans: ['General Sans', 'Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'pleurat-1': 'rgba(22, 20, 14, 0.07) 2px 3px 0px 0px',
        'pleurat-2': 'rgba(22, 20, 14, 0.16) 0px 0px 0px 1px inset',
        'pleurat-3': 'rgb(22, 20, 14) 2px 0px 0px 0px inset',
        'pleurat-4': 'rgba(22, 20, 14, 0.05) 3px 5px 0px 0px',
        'pleurat-button': 'rgba(22, 20, 14, 0.15) 0px 2px 0px 0px',
      },
      borderRadius: {
        xs: '3px',
        sm: '6px',
        md: '10px',
        pill: '50px',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'circuit-flow': 'circuitFlow 2s linear infinite',
      },
      keyframes: {
        circuitFlow: {
          '0%': { strokeDashoffset: '20' },
          '100%': { strokeDashoffset: '0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
