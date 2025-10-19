/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: [], // Désactive complètement le mode sombre
  theme: {
    extend: {
      colors: {
        'glass-light-bg': 'rgba(255, 255, 255, 0.25)',
        'glass-light-border': 'rgba(255, 255, 255, 0.18)',
        'glass-dark-bg': 'rgba(30, 41, 59, 0.25)',
        'glass-dark-border': 'rgba(148, 163, 184, 0.18)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #3b82f6, #8b5cf6)', // blue-500 to purple-500
        'gradient-success': 'linear-gradient(135deg, #10b981, #059669)', // emerald-500 to emerald-700
        'gradient-warning': 'linear-gradient(135deg, #f59e0b, #d97706)', // amber-500 to amber-700
        'gradient-danger': 'linear-gradient(135deg, #ef4444, #dc2626)', // red-500 to red-700
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideUp: {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          'from': { opacity: '0', transform: 'scale(0.95)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
        hoverLift: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
        'hover-lift': 'hoverLift 0.2s ease-out',
      },
    },
  },
  plugins: [],
};