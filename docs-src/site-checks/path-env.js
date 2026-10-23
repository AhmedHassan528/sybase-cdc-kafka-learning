// Check (SC-005, FR-013): the environment-dependent values table (lab/path/env-values.json) covers every setting, port, host name,
// environment variable, topic and path that the connector and the lab use, and every entry refers to something that exists.
// The sets are extracted from the repository (see contracts/env-values.md); an entry covers an item by listing its id in
// "covers" (a connector setting is also covered by an entry with the same name).
const { fs, path, ROOT } = require('./common');
let problems = 0;
const bad = m => { problems++; console.log('FAIL ' + m); };
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const exists = p => fs.existsSync(path.join(ROOT, p));

console.log('path-env: the environment-dependent values table against the repository');
const items = new Set();
const add = (id) => items.add(id);

// 1. every setting the connector reads (ConfigDef keys)
for (const m of read('sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/connect/SybaseCdcConfig.java').matchAll(/public static final String \w+ = "([^"]+)";/g)) add('config:' + m[1]);
// 2. every key of the registered connector configuration
const reg = JSON.parse(read('connectors/sybase-cdc-phoenix.json'));
add('json:name');
for (const k of Object.keys(reg.config)) add('json:' + k);
// 3. the Kafka Connect worker properties
for (const l of read('connect-distributed.properties').split('\n')) { const m = l.match(/^([a-z][\w.]*)=/); if (m) add('worker:' + m[1]); }
// 4. docker-compose.yml: published ports, environment variables, container and host names, volumes
{
  let svc = null, section = null;
  for (const l of read('lab/env/docker-compose.yml').split('\n')) {
    const s = l.match(/^  ([a-z][a-z-]*):\s*$/);
    if (s && !['default'].includes(s[1])) { svc = s[1]; section = null; continue; }
    if (!svc) continue;
    let m;
    if ((m = l.match(/^    container_name:\s*(\S+)/))) add(`compose-name:${svc}:container_name`);
    if ((m = l.match(/^    hostname:\s*(\S+)/))) add(`compose-name:${svc}:hostname`);
    if ((m = l.match(/^    ports:\s*\["([^"]+)"\]/))) { const [h, hp, cp] = m[1].split(':'); add(`compose-port:${svc}:${h}:${hp}:${cp}`); }
    if (/^    environment:\s*$/.test(l)) { section = 'env'; continue; }
    if (/^    volumes:\s*$/.test(l)) { section = 'vol'; continue; }
    if (/^    [a-z_]+:/.test(l)) section = null;
    if (section === 'env' && (m = l.match(/^      ([A-Z][A-Z0-9_]*):/))) add(`compose-env:${svc}:${m[1]}`);
    if (section === 'vol' && (m = l.match(/^      - ([^:]+):([^:]+)(?::\w+)?/))) add(`compose-volume:${svc}:${m[2].trim()}`);
  }
}
// 5. the database setup: database, devices and their files, the replication login, the accounts
for (const f of fs.readdirSync(path.join(ROOT, 'sybase')).filter(n => n.endsWith('.sql'))) {
  const t = read('sybase/' + f);
  for (const m of t.matchAll(/create database (\w+)/g)) add('sql:database:' + m[1]);
  for (const m of t.matchAll(/disk init name = '(\w+)'/g)) add('sql:device:' + m[1]);
  for (const m of t.matchAll(/physname = '([^']+)'/g)) add('sql:devpath:' + m[1]);
  for (const m of t.matchAll(/sp_config_rep_agent \w+, 'enable', '(\w+)', '(\w+)', '(\w+)'/g)) { add('sql:rs:' + m[1]); add('sql:rsuser:' + m[2]); add('sql:rspassword:' + m[3]); }
}
for (const m of read('lab/env/create-accounts.sh').matchAll(/create login (\w+) with password/g)) add('sql:login:' + m[1]);
// 6. topics, the connector name and paths
{ const m = read('lab/env/_common.sh').match(/^TOPIC=\$\{TOPIC:-([^}]+)\}/m); if (m) add('topic:' + m[1]); else bad('could not find the demo topic in lab/env/_common.sh'); }
{ const m = read('lab/env/_common.sh').match(/^CONNECTOR_NAME=(\S+)/m); if (m) add('shell:CONNECTOR_NAME'); }
if (/^LAB_SECRETS=/m.test(read('lab/env/_common.sh'))) add('path:lab-secrets');
{ const t = read('sybase/start.sh'); if (t.includes('/opt/sybase/interfaces')) add('path:interfaces'); if (t.includes('/opt/sybase/ASE-16_0/install/MYSYBASE.log')) add('path:errorlog'); }
// 7. the build file: the versions the connector is compiled for
for (const m of read('sybase-cdc-connector/pom.xml').matchAll(/<(kafka\.version|maven\.compiler\.release)>/g)) add('pom:' + m[1]);

const table = JSON.parse(read('lab/path/env-values.json'));
const KINDS = ['host', 'port', 'credential', 'database', 'topic', 'path', 'property'];
const covered = new Set();
const names = new Set();
for (const v of table) {
  if (names.has(v.name)) bad(`duplicate entry name "${v.name}"`); names.add(v.name);
  if (!KINDS.includes(v.kind)) bad(`${v.name}: kind "${v.kind}" is not one of ${KINDS.join(', ')}`);
  if (!v.labValue) bad(`${v.name}: no lab value`);
  if (!v.change || v.change.length < 20) bad(`${v.name}: "change" must say what to change elsewhere`);
  for (const p of [...(v.setIn || []), ...(v.usedBy || [])]) if (!exists(p)) bad(`${v.name}: the path ${p} does not exist`);
  const ids = [...(v.covers || [])];
  if (items.has('config:' + v.name)) ids.push('config:' + v.name);
  if (ids.length === 0 && !(v.usedBy || []).length) bad(`${v.name}: covers nothing and is used by no file`);
  for (const id of ids) { if (!items.has(id)) bad(`${v.name}: covers "${id}", which does not exist in the repository`); covered.add(id); }
  // a credential must be a labelled local test value, never a real secret
  if (v.kind === 'credential' && /password|secret/i.test(v.name) && !/labelled|public|generated|default/i.test(v.labValue)) bad(`${v.name}: a credential value must be labelled as a local test value`);
}
for (const id of [...items].sort()) if (!covered.has(id)) bad(`not in the table: ${id}`);
console.log(`items found in the repository: ${items.size}; table entries: ${table.length}; items covered: ${covered.size}; problems: ${problems}`);
process.exit(problems ? 1 : 0);
