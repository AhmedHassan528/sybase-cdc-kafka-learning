// Shrinks draw.io SVG exports for the docs: removes the PNG fallback images draw.io adds next to every
// HTML label (browsers render the foreignObject text instead) and pins the light color scheme so the
// diagrams look identical inside light and dark pages (they sit on a white "paper" card).
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', '..', 'docs', 'diagrams', 'src', 'svg');
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.svg'))) {
  const p = path.join(dir, f);
  let s = fs.readFileSync(p, 'utf8');
  const before = s.length;
  s = s.replace(/<image [^>]*xlink:href="data:image\/png;base64,[^"]*"[^>]*\/>/g, '');
  s = s.replace(/color-scheme: light dark;/g, 'color-scheme: light;');
  s = s.replace(/light-dark\(([^,]+),\s*[^)]+\)/g, '$1');
  s = s.replace(/background: transparent; background-color: transparent;/, 'background: #ffffff; background-color: #ffffff;');
  s = s.replace(/<!DOCTYPE[^>]*>\s*/, ''); // DTD not needed; some hosts refuse SVGs that declare one
  fs.writeFileSync(p, s);
  console.log(f, before, '->', s.length);
}
