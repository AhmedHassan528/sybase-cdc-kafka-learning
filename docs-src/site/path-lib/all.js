// All lessons of the path: the Markdown lessons plus (added later by java.js) the generated Java lessons.
const D = require('./data');
function all() {
  const md = D.lessons();
  let gen = [];
  try { gen = require('./java').lessonEntries(); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
  return [...md, ...gen].sort((a, b) => D.idKey(String(a.meta.id)) - D.idKey(String(b.meta.id)));
}
module.exports = { all };
