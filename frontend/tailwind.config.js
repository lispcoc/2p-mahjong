/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
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
        }
      },
      fontSize: {
        '10xl': ['120px', { lineHeight: '1' }],
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
