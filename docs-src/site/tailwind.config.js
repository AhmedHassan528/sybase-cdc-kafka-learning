// Tailwind input for the article website. Colours are CSS variables so the light and dark themes switch without rebuilding.
// Output is compiled at build time into docs/site/assets/site.css (nothing is loaded from the internet at read time).
module.exports = {
  darkMode: 'class',
  content: [
    __dirname + '/templates/**/*.js',
    __dirname + '/client/site.js',
    __dirname + '/../../docs/site/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        page: 'var(--page)', ink: 'var(--ink)', mute: 'var(--mute)', line: 'var(--line)',
        accent: 'var(--accent)', soft: 'var(--soft)', panel: 'var(--panel)',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', '"Cascadia Mono"', 'SFMono-Regular', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      maxWidth: { read: '720px' },
      fontSize: { body: ['18px', '1.7'] },
    },
  },
};
