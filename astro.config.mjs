import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://i-no-one.github.io',
  base: '/',
  output: 'static',
  build: {
    format: 'file'
  }
});
