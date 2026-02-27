/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mahjong: {
          light: '#fff9e6',
          accent: '#FFD700',
          success: '#4CAF50',
          error: '#f44336',
          warning: '#ff9800',
          info: '#2196f3',
          muted: '#6c757d',
          'dark-primary': '#2d5016',
          'dark-secondary': '#3d6b20',
          'dark-tertiary': '#1a2e0a',
        }
      },
      fontSize: {
        '10xl': ['120px', { lineHeight: '1' }],
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        slideIn: 'slideIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(400px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}
