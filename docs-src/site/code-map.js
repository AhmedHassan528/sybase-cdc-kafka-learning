// Finds the Java source files the code pages show. Shared by build-code.js, build-guide.js and the checks.
//   final    the connector: every main Java file of the reference solution of increment 6 (the one that builds the JAR)
//   steps    per increment: the starter files that contain TODO markers (what the learner writes) and the matching
//            reference-solution file of that increment
const fs = require('fs');
const path = require('path');

const JAVA = 'src/main/java';
const walk = d => fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(e =>
  e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const posix = p => p.split(path.sep).join('/');

// First sentence of the class comment (the first /** ... */ block), or a fallback.
function summary(text) {
  const m = text.match(/\/\*\*([\s\S]*?)\*\//);
  if (m) {
    let t = m[1].replace(/^\s*\* ?/gm, '').replace(/<pre>[\s\S]*?<\/pre>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/@\w+[\s\S]*$/, '').replace(/\{@\w+ ([^}]*)\}/g, '$1').replace(/\s+/g, ' ').trim();
    const cut = t.search(/\.(\s|$)/);
    if (cut > 0) t = t.slice(0, cut + 1);
    if (t.length > 190) t = t.slice(0, 187).replace(/\s+\S*$/, '') + ' ...';
    if (t) return t;
  }
  return /ConfigDef/.test(text) ? 'Defines the connector configuration keys (a Kafka Connect ConfigDef). The file has no class comment.' : '(no class comment in the file)';
}

exports.load = function (ROOT) {
  const rel = p => posix(path.relative(ROOT, p));
  const sol6 = path.join(ROOT, 'lab', 'solutions', '06-package-and-run');
  const final = walk(path.join(sol6, JAVA)).filter(f => f.endsWith('.java')).map(f => {
    const text = fs.readFileSync(f, 'utf8');
    const cls = path.basename(f, '.java');
    return { cls, file: path.basename(f), pkg: path.basename(path.dirname(f)), src: rel(f), page: `code/src/${cls}.html`, lines: text.split('\n').length - (text.endsWith('\n') ? 1 : 0), summary: summary(text) };
  });
  const pom = { cls: 'pom', file: 'pom.xml', pkg: '', src: rel(path.join(sol6, 'pom.xml')), page: 'code/src/pom.html', lines: fs.readFileSync(path.join(sol6, 'pom.xml'), 'utf8').split('\n').length - 1, summary: 'The Maven build: Java 17, the Kafka Connect API and slf4j as provided dependencies, and the shade plugin that packages the single JAR.' };

  const inc = path.join(ROOT, 'lab', 'increments');
  const steps = [];
  for (const d of fs.readdirSync(inc).filter(n => /^\d\d-/.test(n)).sort()) {
    const startDir = path.join(inc, d, 'starter', JAVA);
    if (!fs.existsSync(startDir)) continue;
    const files = walk(startDir).filter(f => f.endsWith('.java') && /TODO/.test(fs.readFileSync(f, 'utf8')));
    if (!files.length) continue;
    steps.push({
      id: d, number: Number(d.slice(0, 2)),
      files: files.map(f => {
        const relJava = posix(path.relative(startDir, f));
        const solFile = path.join(ROOT, 'lab', 'solutions', d, JAVA, relJava);
        if (!fs.existsSync(solFile)) throw new Error(`no reference solution file for ${rel(f)}`);
        const cls = path.basename(f, '.java');
        const todos = (fs.readFileSync(f, 'utf8').match(/TODO/g) || []).length;
        return { cls, todos, starterSrc: rel(f), starterPage: `code/starter/${d}/${cls}.html`, solutionSrc: rel(solFile), solutionPage: `code/solution/${d}/${cls}.html` };
      }),
    });
  }
  return { final, pom, steps };
};
