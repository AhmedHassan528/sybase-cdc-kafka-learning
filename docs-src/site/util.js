// Small helpers shared by the site build (no dependencies).
const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const decode = s => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, m => entities[m]);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const squash = s => s.replace(/\s+/g, ' ').trim();
const text = html => squash(decode(html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')));
// Cut at a word boundary, at most n characters.
function excerpt(s, n = 600) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n), i = cut.lastIndexOf(' ');
  return (i > n * 0.6 ? cut.slice(0, i) : cut) + ' …';
}
// Safe JSON inside a <script> element.
const jsonForScript = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
module.exports = { decode, esc, squash, text, excerpt, jsonForScript };
