import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'resources');

const targets = [
  { from: 'icon-only.svg',       to: 'icon-only.png',       w: 1024, h: 1024 },
  { from: 'icon-foreground.svg', to: 'icon-foreground.png', w: 1024, h: 1024 },
  { from: 'icon-background.svg', to: 'icon-background.png', w: 1024, h: 1024 },
  { from: 'splash.svg',          to: 'splash.png',          w: 2732, h: 2732 },
];

for (const t of targets) {
  const svgPath = resolve(root, t.from);
  const pngPath = resolve(root, t.to);
  const svgBuffer = readFileSync(svgPath);
  await sharp(svgBuffer, { density: 384 })
    .resize(t.w, t.h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(pngPath);
  console.log(`OK: ${t.from} -> ${t.to} (${t.w}x${t.h})`);
}
