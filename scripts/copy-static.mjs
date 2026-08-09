import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
const cleanRoutes = [
  'addon',
  'counter',
  'donate',
  'tools',
  'tools/obfuscator',
  'tools/pdf-utils',
  'tools/qr-maker',
  'tools/server-checker'
];

for (const route of cleanRoutes) {
  mkdirSync(`dist/${route}`, { recursive: true });
  copyFileSync(`dist/${route}.html`, `dist/${route}/index.html`);
}
writeFileSync('dist/.nojekyll', '');
