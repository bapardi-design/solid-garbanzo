// Bundles the engine for the browser and inlines it into web/explorer.html -> dist/web/explorer.html
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const result = await build({
  entryPoints: ['src/browser/engine.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'SimEngine',
  target: 'es2022',
  minify: true,
  write: false,
  footer: { js: 'window.SimEngine = SimEngine.default;' },
});
const bundle = result.outputFiles[0].text;
const page = readFileSync('web/explorer.html', 'utf8');
if (!page.includes('<!--ENGINE-->')) throw new Error('web/explorer.html is missing the <!--ENGINE--> placeholder');
mkdirSync('dist/web', { recursive: true });
writeFileSync('dist/web/explorer.html', page.replace('<!--ENGINE-->', `<script>${bundle}</script>`));
console.log(`dist/web/explorer.html written (${Math.round(bundle.length / 1024)} kB engine)`);
