/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        'border-light': 'var(--border-light)',
        background: 'var(--background)',
        'background-light': 'var(--background-light)',
        'background-card': 'var(--background-card)',
        'background-elevated': 'var(--background-elevated)',
        foreground: 'var(--foreground)',
        'muted-foreground': 'var(--muted-foreground)',
        muted: 'var(--muted)',
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          hover: 'var(--secondary-hover)',
        },
        destructive: 'var(--destructive)',
        success: 'var(--success)',
        ring: 'var(--ring)',
        // Dark theme colors from api-test-tool-ui
        'header-bg': '#0a0a2e',
        'dark-900': '#0a0a2e',
        'dark-800': '#15192b',
        'dark-700': '#232942',
        'dark-600': '#343b5c',
        'dark-500': '#575757',
        'dark-400': '#8890aa',
        'probestack-bg': '#0e172a',
      },
      borderRadius: {
        xl: 'var(--radius)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        heading: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 3px rgba(0,0,0,0.3)',
        'soft-lg': '0 4px 12px rgba(0,0,0,0.4)',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        slideIn: 'slideIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
