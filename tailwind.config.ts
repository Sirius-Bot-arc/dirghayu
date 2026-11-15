import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        saffron: '#FF9933',
        'rani-pink': '#D81B60',
        'peacock-teal': '#00838F',
        marigold: '#FFB300',
        indigo: '#2E3A8C',
        cream: '#FBF3E4',
        'deep-maroon': '#5B1033',
        'deep-teal': '#00606B',
        // Semantic aliases
        primary: {
          DEFAULT: '#D81B60',
          foreground: '#FBF3E4'
        },
        secondary: {
          DEFAULT: '#00838F',
          foreground: '#FBF3E4'
        },
        accent: {
          DEFAULT: '#FF9933',
          foreground: '#5B1033'
        },
        background: '#FBF3E4',
        foreground: '#00606B',
        muted: {
          DEFAULT: '#FFB300',
          foreground: '#5B1033'
        },
        border: '#D81B60',
        ring: '#00838F'
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        devanagari: ['var(--font-noto-devanagari)', 'Noto Serif Devanagari', 'serif']
      },
      fontSize: {
        'display-xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-md': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'display-sm': ['2.25rem', { lineHeight: '1.3' }],
        'heading-xl': ['1.875rem', { lineHeight: '1.3' }],
        'heading-lg': ['1.5rem', { lineHeight: '1.4' }],
        'heading-md': ['1.25rem', { lineHeight: '1.4' }],
        'heading-sm': ['1.125rem', { lineHeight: '1.5' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.6' }],
        'caption': ['0.75rem', { lineHeight: '1.5' }]
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem'
      },
      borderRadius: {
        '4xl': '2rem'
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 96, 107, 0.07), 0 10px 20px -2px rgba(0, 96, 107, 0.04)',
        'card': '0 1px 3px 0 rgba(0, 96, 107, 0.1), 0 1px 2px -1px rgba(0, 96, 107, 0.06)',
        'elevated': '0 10px 40px -10px rgba(0, 96, 107, 0.15)'
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms'
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      }
    }
  },
  plugins: []
};

export default config;