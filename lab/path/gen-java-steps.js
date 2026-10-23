// Writes lab/path/steps/7.N.json for the Java lessons (one lesson per file of sybase-cdc-connector/ plus its pom.xml).
// The lesson ids come from the build order computed in docs-src/site/path-lib/java.js. Run again if files are added or removed.
const fs = require('fs');
const path = require('path');
const J = require('../../docs-src/site/path-lib/java');
const out = path.join(__dirname, 'steps');
const files = J.allFiles();
for (const f of files) fs.writeFileSync(path.join(out, f.id + '.json'), JSON.stringify(J.stepsFor(f), null, 2) + '\n');
console.log(`wrote ${files.length} steps files: ${files[0].id} (${files[0].cls}) to ${files[files.length - 1].id} (${files[files.length - 1].cls})`);
