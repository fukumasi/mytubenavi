/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // ダークモードを'class'戦略で有効化
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // ダークモード用の追加カラー 柔らかい色調に変更
        dark: {
          bg: '#15202B',
          surface: '#192734',
          border: '#253341',
          text: {
            primary: '#FFFFFF',
            secondary: '#8899A6',
          }
        },
      },
      spacing: {
        '27': '6.75rem',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide')
  ],
}