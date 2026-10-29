/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './features/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        navy: '#0F172A',
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC2626',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        border: '#E2E8F0',
        muted: '#64748B',
      },
    },
  },
  plugins: [],
};
