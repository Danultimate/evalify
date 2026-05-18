/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d1117',
        surface: '#161b22',
        border: '#30363d',
        'text-primary': '#e6edf3',
        'text-muted': '#8b949e',
        pass: '#3fb950',
        warn: '#d29922',
        fail: '#f85149',
        info: '#58a6ff',
        accent: '#00ff88',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
