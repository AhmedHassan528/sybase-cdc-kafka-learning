// Learning path pages: reads stages, lessons (Markdown), steps files and recorded evidence, writes docs/site/path/.
// Called by build-site.js (generated output: never edit by hand).
const fs = require('fs');
const path = require('path');
const { esc, text, excerpt } = require('./util');
const D = require('./path-lib/data');
const { render } = require('./path-lib/directives');
const { lessonBody, indexBody } = require('./templates/lesson');
const { all } = require('./path-lib/all');
const JAVA = require('./path-lib/java');
const JAVA_FILES = JAVA.allFiles();

exports.build = function ({ ROOT, OUT, cfg, problem }) {
  const stages = D.stages();
  const lessons = all();
  const total = lessons.length;
  const diagrams = (() => { const f = path.join(ROOT, 'docs-src', 'path', 'diagrams.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : []; })();
  const imgDir = path.join(OUT, 'path', 'img');
  fs.mkdirSync(imgDir, { recursive: true });

  // Diagrams are copied, not redrawn.
  for (const d of diagrams) {
    const src = path.join(ROOT, d.source);
    if (!fs.existsSync(src)) { problem(`path diagram ${d.id}: ${d.source} does not exist`); continue; }
    fs.copyFileSync(src, path.join(imgDir, d.id + '.svg'));
  }
  // Screenshots captured from the running lab (docs-src/path/screenshots/<name>.png plus <name>.json).
  const shots = new Map();
  const shotDir = path.join(ROOT, 'docs-src', 'path', 'screenshots');
  if (fs.existsSync(shotDir)) for (const f of fs.readdirSync(shotDir).filter(x => x.endsWith('.json'))) {
    const meta = JSON.parse(fs.readFileSync(path.join(shotDir, f), 'utf8'));
    shots.set(meta.name, meta);
    fs.copyFileSync(path.join(shotDir, meta.file), path.join(imgDir, meta.file));
  }

  const stageOf = Object.fromEntries(stages.map(s => [s.id, s]));
  const pageOf = L => `path/${L.meta.stage}/${L.pageSlug || D.slug(L.meta.title)}.html`;
  const seen = new Set();
  for (const L of lessons) { const p = pageOf(L); if (seen.has(p)) problem(`path: two lessons share the page ${p}`); seen.add(p); }
  const byId = Object.fromEntries(lessons.map(L => [String(L.meta.id), L]));
  const rel = (from, to) => path.posix.relative(path.posix.dirname(from), to);
  const first = stage => lessons.find(L => L.meta.stage === stage.id);
  const startPage = lessons.length ? pageOf(lessons[0]) : 'path/index.html';

  const pages = [], entries = [];
  const envRefs = new Set();
  lessons.forEach((L, i) => {
    const m = L.meta, page = pageOf(L);
    const stage = stageOf[m.stage];
    if (!stage) { problem(`path lesson ${m.id}: unknown stage ${m.stage}`); return; }
    const ctx = {
      lesson: L, root: ROOT, diagrams, screenshots: shots, envRefs,
      stepsFile: D.stepsOf(String(m.id)), evidence: D.evidenceOf(String(m.id)),
      rel: '../', problem: msg => problem(`path lesson ${m.id}: ${msg}`),
      java: () => (L.javaFile ? JAVA.pageHtml(L.javaFile, JAVA_FILES, msg => problem(`path lesson ${m.id}: ${msg}`)) : null),
    };
    // Java lessons carry ready-made HTML (generated from their note files).
    const r = L.html !== undefined ? { html: L.html, items: L.items || [] } : render(L.body, ctx);
    const prereqs = (m.prerequisites || []).map(id => byId[String(id)]).filter(Boolean).map(p => ({ id: String(p.meta.id), title: p.meta.title, href: rel(page, pageOf(p)) }));
    const prev = i > 0 ? { href: rel(page, pageOf(lessons[i - 1])), label: `${lessons[i - 1].meta.id}. ${lessons[i - 1].meta.title}` } : null;
    const next = i < lessons.length - 1 ? { href: rel(page, pageOf(lessons[i + 1])), label: `${lessons[i + 1].meta.id}. ${lessons[i + 1].meta.title}` } : null;
    const depth = page.split('/').length - 1;
    const evidence = ctx.evidence ? { name: `evidence/path/${m.id}.txt`, href: '../'.repeat(depth) + '../evidence/path/' + m.id + '.txt', date: (ctx.evidence.header.captured || '').slice(0, 10) } : null;
    const body = lessonBody({
      stage, stages, lesson: L, n: i + 1, total, prereqs, items: r.items, html: r.html, prev, next, evidence,
      stageHref: rel(page, 'path/index.html'), startHref: s => rel(page, first(s) ? pageOf(first(s)) : 'path/index.html'),
    });
    pages.push({ path: page, current: 'path', title: `Lesson ${m.id}: ${m.title} | ${cfg.name}`, description: m.summary, body });
    entries.push({ page, anchor: '', heading: `Lesson ${m.id}: ${m.title}`, section: String(stage.number), text: excerpt(m.summary, 300), keywords: `learning path lesson ${stage.title}${L.javaFile ? '' : ' ' + (m.objectives || []).join(' ')}` });
    for (const it of r.items) if (it.lvl === 3) entries.push({ page, anchor: it.id, heading: it.text, section: String(stage.number), text: `Lesson ${m.id}: ${m.title}`, keywords: 'learning path step' });
  });

  if (fs.existsSync(path.join(ROOT, 'lab', 'path', 'env-values.json'))) {
    const ep = require('./path-lib/envpage').build(ROOT);
    pages.push({ path: ep.path, current: ep.current, title: ep.title, description: ep.description, body: ep.body });
    entries.push(...ep.entries);
  }

  const overview = diagrams.find(d => d.topic === 'overview');
  const idxPage = 'path/index.html';
  pages.unshift({
    path: idxPage, current: 'path', title: `Learning path | ${cfg.name}`, description: 'Nine stages from Docker to a verified change event in Kafka.',
    body: indexBody({
      total, startHref: rel(idxPage, startPage),
      overview: overview ? { href: `img/${overview.id}.svg`, alt: overview.alt } : null,
      stages: stages.map(stage => ({ stage, lessons: lessons.filter(L => L.meta.stage === stage.id).map(L => ({ id: String(L.meta.id), title: L.meta.title, href: rel(idxPage, pageOf(L)) })) })),
    }),
  });
  entries.push({ page: idxPage, anchor: '', heading: 'Learning path', section: '', text: 'Nine stages from Docker to a verified change event in Kafka.', keywords: 'learning path stages lessons progress' });
  return { pages, entries };
};
