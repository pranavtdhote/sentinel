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
        canvas: '#F7F5EF',
        surface: {
          muted: '#F7F5EF',
          card: '#FFFFFF',
          base: '#171713',
          raised: '#D99A32',
          strong: '#EFECE3',
          subtle: '#F4F1E8',
          border: '#DED9CE',
          'border-strong': '#C8C2B3',
        },
        ink: {
          primary: '#171713',
          secondary: '#57534A',
          muted: '#77736A',
          tertiary: '#9B968B',
        },
        brand: {
          bg: '#F7F5EF',
          dark: '#171713',
          accent: '#D99A32',
          accent2: '#E9B95B',
          muted: '#77736A',
          border: '#DED9CE',
          success: '#2E8B57',
          warning: '#D88A22',
          critical: '#C94C4C',
          info: '#4A78A8',
        },
        amber: {
          accent: '#D99A32',
          hover: '#C58824',
          light: '#FBF0D9',
        },
        danger: {
          DEFAULT: '#C94C4C',
          surface: '#FAEEEE',
          border: '#F4CCCC',
        },
        success: {
          DEFAULT: '#2E8B57',
          surface: '#EAF4EE',
          border: '#BFE0CD',
        },
        warning: {
          DEFAULT: '#D88A22',
          surface: '#FCF4E9',
          border: '#F6DBB8',
        },
        info: {
          DEFAULT: '#4A78A8',
          surface: '#EDF2F7',
          border: '#C7D7E8',
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
