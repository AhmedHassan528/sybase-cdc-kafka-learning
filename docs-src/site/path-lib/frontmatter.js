// Minimal front matter reader for the learning path lessons (a small subset of YAML, no dependency):
//   key: value            a string (ids such as 3.1 stay strings; whole numbers in `order` become numbers; true/false become booleans)
//   key: [a, b, c]        an inline list
//   key:                  followed by "  - item" lines: a block list
// Returns { meta, body }. The block is between the first two lines that are exactly "---".
function scalar(v, key) {
  v = v.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (key === 'order' && /^\d+$/.test(v)) return Number(v);
  return v;
}
function parse(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines[0] !== '---') return { meta: {}, body: text };
  const end = lines.indexOf('---', 1);
  if (end < 0) throw new Error('front matter is not closed');
  const meta = {};
  let key = null;
  for (const line of lines.slice(1, end)) {
    if (!line.trim()) continue;
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && key) { (meta[key] = Array.isArray(meta[key]) ? meta[key] : []).push(scalar(item[1])); continue; }
    const m = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (!m) throw new Error('cannot read front matter line: ' + line);
    key = m[1];
    const v = m[2];
    if (v === '') { meta[key] = []; continue; }
    if (v.startsWith('[') && v.endsWith(']')) { meta[key] = v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean).map(s => scalar(s)); continue; }
    meta[key] = scalar(v, key);
  }
  return { meta, body: lines.slice(end + 1).join('\n') };
}
module.exports = { parse };
