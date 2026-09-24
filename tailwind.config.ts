import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace']
      },
      colors: {
        canvas: 'var(--canvas)',
        sidebar: 'var(--sidebar)',
        'surface-1': 'var(--surface-1)',
        'surface-2': 'var(--surface-2)',
        'surface-hover': 'var(--surface-hover)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        'border-subtle': 'var(--border-subtle)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-disabled': 'var(--text-disabled)',
        brand: 'var(--brand)',
        'brand-hover': 'var(--brand-hover)',
        'brand-pressed': 'var(--brand-pressed)',
        'brand-muted': 'var(--brand-muted)',
        'brand-border': 'var(--brand-border)',
        info: 'var(--info)',
        'info-hover': 'var(--info-hover)',
        'info-muted': 'var(--info-muted)',
        success: 'var(--success)',
        'success-muted': 'var(--success-muted)',
        warning: 'var(--warning)',
        'warning-muted': 'var(--warning-muted)',
        danger: 'var(--danger)',
        'danger-muted': 'var(--danger-muted)'
      },
      borderRadius: {
        panel: '10px',
        control: '7px',
        chip: '6px'
      },
      transitionDuration: {
        DEFAULT: '150ms'
      }
    }
  },
  plugins: []
} satisfies Config
