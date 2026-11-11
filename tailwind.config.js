/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Consolas', 'monospace'],
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Corporate navy scale dùng cho header, sidebar, thẻ chứng từ
        navy: {
          50: '#f4f6fb',
          100: '#e6ebf5',
          200: '#c9d4e8',
          300: '#9db0d3',
          400: '#6b84b8',
          500: '#4a649c',
          600: '#364d80',
          700: '#2a3d68',
          800: '#1d2c4d',
          900: '#111c33',
          950: '#0b1220',
        },
        // Canvas & surface
        canvas: '#f5f7fa',
        surface: '#ffffff',
        hairline: '#e6eaf0',
      },
      animation: {
        'scan-laser': 'scanLaser 2.2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer': 'shimmer 1.6s linear infinite',
      },
      keyframes: {
        scanLaser: {
          '0%': { transform: 'translateY(0%)', opacity: '0.8' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0.8' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'scale(0.98)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgb(15 23 42 / 0.04)',
        'card': '0 2px 4px -1px rgb(15 23 42 / 0.04), 0 8px 24px -8px rgb(15 23 42 / 0.08)',
        'elevated': '0 4px 8px -2px rgb(15 23 42 / 0.06), 0 16px 40px -12px rgb(15 23 42 / 0.12)',
        'modal': '0 24px 64px -16px rgb(15 23 42 / 0.28)',
        'glow-blue': '0 0 0 1px rgb(37 99 235 / 0.12), 0 8px 24px -8px rgb(37 99 235 / 0.35)',
        'inner-hairline': 'inset 0 1px 0 0 rgb(255 255 255 / 0.06)',
      },
      borderRadius: {
        'card': '20px',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
