/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-blue, #2563eb)',
        secondary: 'var(--secondary-blue, #1e40af)',
        gray: {
          '50': 'var(--gray-50, #f9fafb)',
          '100': 'var(--gray-100, #f3f4f6)',
          '200': 'var(--gray-200, #e5e7eb)',
          '300': 'var(--gray-300, #d1d5db)',
          '400': 'var(--gray-400, #9ca3af)',
          '500': 'var(--gray-500, #6b7280)',
          '600': 'var(--gray-600, #4b5563)',
          '700': 'var(--gray-700, #374151)',
          '800': 'var(--gray-800, #1f2937)',
          '900': 'var(--gray-900, #111827)',
        },
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
    },
  },
  plugins: [],
}
