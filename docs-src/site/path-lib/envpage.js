// The environment-dependent values page (path/env-values.html), generated from lab/path/env-values.json.
const fs = require('fs');
const path = require('path');
const { esc } = require('../util');
const { contents } = require('../templates/article');

const anchor = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const KINDS = [
  ['host', 'Hosts and names'], ['port', 'Ports'], ['credential', 'Credentials and accounts'], ['database', 'Database and server names'],
  ['topic', 'Topics'], ['path', 'Paths and files'], ['property', 'Configuration properties'],
];

exports.build = function (ROOT) {
  const vals = JSON.parse(fs.readFileSync(path.join(ROOT, 'lab', 'path', 'env-values.json'), 'utf8'));
  const short = p => p.replace(/^sybase-cdc-connector\/src\/main\/java\/com\/phoenix\/cdc\/sybase\//, '');
  const items = [{ lvl: 2, id: 'env-checklist', text: 'Deploying to another environment', n: 1 }];
  let sections = '';
  KINDS.forEach(([kind, title], i) => {
    const rows = vals.filter(v => v.kind === kind);
    if (!rows.length) return;
    items.push({ lvl: 2, id: 'env-' + kind, text: title, n: i + 2 });
    sections += `<h2 id="env-${kind}">${esc(title)}</h2>
<div class="tbl"><table><thead><tr><th>Value</th><th>In the lab</th><th>Set in</th><th>Used by</th><th>What to change elsewhere</th></tr></thead><tbody>
${rows.map(v => `<tr id="${anchor(v.name)}"><td><strong>${esc(v.name)}</strong></td><td>${esc(v.labValue)}</td><td>${(v.setIn || []).map(p => `<code>${esc(short(p))}</code>`).join('<br>') || '-'}</td><td>${(v.usedBy || []).map(p => `<code>${esc(short(p))}</code>`).join('<br>') || '-'}</td><td>${esc(v.change)}</td></tr>`).join('\n')}
</tbody></table></div>
`;
  });
  const body = `<div class="page-grid">
<header class="title-block"><p class="category">Learning path</p><h1>Environment-dependent values</h1>
<p class="lede">Every hostname, port, credential, database name, topic name, path and configuration property that the connector and the lab use, with what to change when you deploy somewhere else.</p>
<p class="meta">${vals.length} entries</p></header>
${contents(items)}
<article class="prose-site guide-body" id="article">
<h2 id="env-checklist">Deploying to another environment</h2>
<p>The lab is one machine with four containers and labelled local test values. A real deployment differs in these places, in this order:</p>
<ol>
<li><strong>The database side.</strong> Your ASE server already exists. An administrator runs the equivalent of <code>sybase/01_setup.sql</code> and <code>sybase/02_repagent.sql</code> for your database (mark the tables, configure RepAgent), adds an interfaces entry for the replication server name that points at the connector's host and <code>ltl.listen.port</code>, and creates least-privilege accounts. Keep the entry, the RepAgent settings and the connector settings consistent: the table below lists them side by side.</li>
<li><strong>The connector settings.</strong> Copy <code>connectors/sybase-cdc-phoenix.json</code> and change <code>database.server.name</code>, <code>database.name</code>, <code>ltl.username</code>, <code>ltl.password</code>, <code>topic.prefix</code> and <code>table.include.list</code>. Keep <code>tasks.max</code> at 1.</li>
<li><strong>Kafka and Kafka Connect.</strong> Use your cluster's bootstrap servers, internal topics and replication factors, and put the connector JAR (built with the Kafka version of your workers) on the worker's plugin path.</li>
<li><strong>Secrets.</strong> The lab's passwords are labelled local test values (or generated into a git-ignored file). Use real secrets and keep them out of source control and logs.</li>
<li><strong>Security.</strong> The lab uses no TLS, no authentication on Kafka and plain login passwords on the LTL connection, and binds its ports to localhost. This path did not test any production security setup.</li>
</ol>
${sections}
</article>
</div>`;
  return { path: 'path/env-values.html', current: 'path', title: 'Environment-dependent values | Learning path', description: 'Every environment-dependent value of the connector and the lab, and what to change when deploying elsewhere.', body, entries: [{ page: 'path/env-values.html', anchor: '', heading: 'Environment-dependent values', section: '', text: 'Hostnames, ports, credentials, database names, topic names, paths and configuration properties, and what to change per environment.', keywords: 'environment deploy configuration properties values table' }, ...vals.map(v => ({ page: 'path/env-values.html', anchor: anchor(v.name), heading: v.name, section: '', text: v.change, keywords: `environment value ${v.kind} ${v.labValue}` }))] };
};
