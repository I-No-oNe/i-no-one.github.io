import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
mkdirSync('dist/tools', { recursive: true });
copyFileSync('dist/tools.html', 'dist/tools/index.html');
writeFileSync('dist/.nojekyll', '');
