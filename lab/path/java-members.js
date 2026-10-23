// Turns the javap -p output of the connector classes (file given as the first argument) into JSON on stdout:
// { generatedFrom, classes: { "<package>.<Class>": { source, members: ["<init>(int)", "poll()", ...] } } }
// Nested classes become their own entries (Outer.Inner; anonymous classes Outer.1). Lambdas, bridge and synthetic methods
// (names starting with $ or lambda$) are dropped, and so are classes left without any member.
const fs = require('fs');
const path = require('path');
const text = fs.readFileSync(process.argv[2], 'utf8').replace(/\r\n/g, '\n');
const SRC = 'sybase-cdc-connector/src/main/java/';

// "java.util.Map<java.lang.String, java.lang.Object>" -> "Map"; "java.lang.Object..." -> "Object..."; "com.x.Outer$Inner" -> "Outer.Inner"
const simple = t => {
  const varargs = t.endsWith('...');
  if (varargs) t = t.slice(0, -3);
  t = t.replace(/<.*>/g, '');
  const arr = (t.match(/(\[\])+$/) || [''])[0];
  t = t.slice(0, t.length - arr.length).replace(/^.*\./, '').replace(/\$/g, '.');
  return t + arr + (varargs ? '...' : '');
};
// split a parameter list at the commas that are not inside <...>
const splitParams = s => {
  const out = []; let depth = 0, cur = '';
  for (const c of s) {
    if (c === '<') depth++; else if (c === '>') depth--;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};

const classes = {};
let cur = null;
for (const line of text.split('\n')) {
  const head = line.match(/^(?:public |protected |private |abstract |final |static )*(?:class|interface|enum|record) ([\w.$]+)(?:<.*>)?(?: extends [^{]+)?(?: implements [^{]+)? \{$/);
  if (head) {
    const full = head[1].replace(/\$/g, '.');
    const top = head[1].split('$')[0];
    cur = classes[full] = { source: SRC + top.replace(/\./g, '/') + '.java', members: [] };
    continue;
  }
  if (!cur) continue;
  const m = line.match(/^\s+(?:(?:public|protected|private|static|final|abstract|synchronized|native|default|strictfp) )*(?:<[^>]+> )?(?:([\w.$<>\[\], ?]+?) )?([\w$.<>]+)\(([^)]*)\)(?: throws [\w.$, ]+)?;$/);
  if (!m) continue;
  const name = m[2].split('.').pop();            // a constructor is printed with its full class name
  if (name.startsWith('lambda$') || name.startsWith('$') || /^access\$/.test(name) || /synthetic|bridge/.test(line)) continue;
  const params = splitParams(m[3]).map(simple).join(',');
  const isCtor = !m[1];                          // a constructor has no return type
  cur.members.push(`${isCtor ? '<init>' : name}(${params})`);
}
for (const [k, c] of Object.entries(classes)) { if (!c.members.length) delete classes[k]; else c.members.sort(); }
process.stdout.write(JSON.stringify({ generatedFrom: 'sybase-cdc-connector', classes }, null, 1) + '\n');
