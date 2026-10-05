/**
 * Builds public/og.png, the 1200×630 card shown when a haulq.ai link is shared
 * in a text, Facebook group or Slack. Run it again after changing the tagline:
 *
 *   node scripts/make-og-image.mjs
 *
 * Text is drawn by sharp's SVG renderer with system fonts, so it uses Georgia
 * and Arial: the same fallbacks the site's own font stacks name. The fonts
 * aren't shipped as files the renderer can load.
 */
import sharp from 'sharp';

const W = 1200;
const H = 630;
const INK = '#123A63';
const BRAND = '#FF6800';

const stripes = Array.from({ length: 90 }, (_, i) => {
  const x = i * 16 - H;
  return `<line x1="${x}" y1="${H}" x2="${x + H}" y2="0" stroke="${BRAND}" stroke-opacity="0.07" stroke-width="2"/>`;
}).join('');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="glow" cx="1" cy="0" r="0.6">
      <stop offset="0" stop-color="${BRAND}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${BRAND}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="tail" x1="0" x2="1">
      <stop offset="0" stop-color="#D8410F"/>
      <stop offset="1" stop-color="#FF8412"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${INK}"/>
  ${stripes}
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <text x="80" y="300" font-family="Georgia, serif" font-size="76" font-weight="600" fill="#fff">Run every load.</text>
  <text x="80" y="390" font-family="Georgia, serif" font-size="76" font-weight="600" fill="${BRAND}">Know every dollar.</text>
  <rect x="80" y="440" width="120" height="6" fill="url(#tail)"/>
  <text x="80" y="510" font-family="Arial, sans-serif" font-size="30" fill="#CBD5E1">Loads, paperwork, invoicing and margins for owner-operators</text>
  <text x="80" y="550" font-family="Arial, sans-serif" font-size="30" fill="#CBD5E1">and small fleets. From $49 a month. No cut of your gross.</text>
</svg>`;

const logo = await sharp('public/logo-white.png').resize({ height: 80 }).toBuffer();

await sharp(Buffer.from(svg))
  .composite([{ input: logo, left: 72, top: 90 }])
  .png({ compressionLevel: 9 })
  .toFile('public/og.png');

console.log('wrote public/og.png');
