/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Noto Sans KR', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'wordrobe-gradient': 'linear-gradient(135deg, #6366f1, #4f46e5)',
        'wordrobe-gradient-subtle': 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
        'avatar-gradient': 'linear-gradient(135deg, #818cf8, #6366f1)',
      },
      boxShadow: {
        'soft-sm': '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)',
        soft: '0 4px 12px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.04)',
        'soft-lg': '0 10px 25px rgba(0,0,0,.1), 0 4px 10px rgba(0,0,0,.06)',
        glow: '0 4px 16px rgba(99,102,241,.4)',
        'glow-sm': '0 2px 8px rgba(99,102,241,.3)',
      },
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
};
