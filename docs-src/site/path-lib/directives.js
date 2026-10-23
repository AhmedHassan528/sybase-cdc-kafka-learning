// Renders a lesson's Markdown body: directives ({{cmd:}}, {{out:}}, {{file:}}, {{diagram:}}, {{screenshot:}}, {{env:}}) become
// HTML blocks, everything else goes through marked. Directives are swapped for HTML comments before marked and put back after.
const fs = require('fs');
const path = require('path');
const { Marked } = require('marked');
const { esc, text } = require('../util');
const D = require('./data');

const SENT_OPEN = '\u0001', SENT_CLOSE = '\u0002';
const envAnchor = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Output with masked values drawn as placeholders. Text content equals D.applyMasks(output, masks) (checked by path-evidence.js).
function maskedHtml(output, masks) {
  let marked = output;
  for (const m of masks || []) {
    const i = m.indexOf('=');
    const named = i > 0 && /^[a-z][a-z-]*$/.test(m.slice(0, i));
    marked = marked.replace(new RegExp(named ? m.slice(i + 1) : m, 'g'), `${SENT_OPEN}${named ? m.slice(0, i) : 'value'}${SENT_CLOSE}`);
  }
  return esc(marked).split(SENT_OPEN).join('<span class="ph">&lt;').split(SENT_CLOSE).join('&gt;</span>');
}

// ctx: { lesson, stepsFile, evidence, problem(msg), root: ROOT, screenshots: Map, rel: path prefix from the page to path/ }
function render(body, ctx) {
  const blocks = [];
  const hold = html => { blocks.push(html); return `<!--D:${blocks.length - 1}-->`; };
  const stepOf = id => (ctx.stepsFile ? ctx.stepsFile.steps.find(s => s.id === id) : null);

  const withDirectives = body.replace(/\{\{(cmd|out|file|diagram|screenshot|env|java):([^}]+)\}\}/g, (m, kind, arg) => {
    arg = arg.trim();
    if (kind === 'cmd') {
      const s = stepOf(arg);
      if (!s) { ctx.problem(`{{cmd:${arg}}} is not a step`); return ''; }
      return '\n\n' + hold(`<div class="step-cmd" data-step="${esc(arg)}"><pre data-lang="bash"><code>${esc(s.run)}</code></pre></div>`) + '\n\n';
    }
    if (kind === 'out') {
      const s = stepOf(arg), rec = ctx.evidence && ctx.evidence.steps[arg];
      if (!s) { ctx.problem(`{{out:${arg}}} is not a step`); return ''; }
      if (!rec) return '\n\n' + hold(`<div class="step-missing"><strong>Not recorded.</strong> The output of step ${esc(arg)} was not captured, so none is shown.</div>`) + '\n\n';
      const note = [`exit ${rec.exit}`, `${rec.seconds.toFixed(1)} s`].join(' · ');
      const vars = (s.mask || []).length ? ` Values that differ from run to run are shown as <span class="ph">&lt;name&gt;</span>.` : '';
      return '\n\n' + hold(`<div class="step-out" data-lesson="${esc(ctx.lesson.meta.id)}" data-step="${esc(arg)}"><pre>${maskedHtml(rec.output, s.mask)}</pre><p class="step-meta">Recorded output, ${esc(note)}.${vars}</p></div>`) + '\n\n';
    }
    if (kind === 'file') {
      const f = path.join(ctx.root, arg);
      if (!fs.existsSync(f)) { ctx.problem(`{{file:${arg}}} does not exist`); return ''; }
      const lang = arg.endsWith('.sql') ? 'sql' : arg.endsWith('.sh') ? 'bash' : arg.endsWith('.json') ? 'json' : arg.endsWith('.yml') ? 'yaml' : 'text';
      return '\n\n' + hold(`<figure class="file-block"><figcaption><code>${esc(arg)}</code> (the real file, copied when the site is built)</figcaption><pre data-lang="${lang}"><code>${esc(fs.readFileSync(f, 'utf8'))}</code></pre></figure>`) + '\n\n';
    }
    if (kind === 'diagram') {
      const d = ctx.diagrams.find(x => x.id === arg);
      if (!d) { ctx.problem(`{{diagram:${arg}}} is not in diagrams.json`); return ''; }
      const [ll, ss] = String(d.liveStep || '').split('/');
      const live = d.liveStep ? ` See the same state live: lesson ${esc(ll)}, step <code>${esc(ss)}</code>.` : '';
      return '\n\n' + hold(`<figure class="diagram" id="fig-${esc(d.id)}"><div class="img"><a href="${ctx.rel}img/${esc(d.id)}.svg"><img src="${ctx.rel}img/${esc(d.id)}.svg" alt="${esc(d.alt)}"></a></div><figcaption><span class="fig-title">${esc(d.title || d.id)}.</span>${live}</figcaption></figure>`) + '\n\n';
    }
    if (kind === 'screenshot') {
      const s = ctx.screenshots.get(arg);
      if (!s) { ctx.problem(`{{screenshot:${arg}}} was not captured`); return ''; }
      return '\n\n' + hold(`<figure class="shot"><img src="${ctx.rel}img/${esc(s.file)}" alt="${esc(s.alt)}"><figcaption>${esc(s.alt)}. Captured from the running lab on ${esc(s.capturedAt)} after <code>${esc(s.command)}</code>.</figcaption></figure>`) + '\n\n';
    }
    if (kind === 'java') {
      const j = ctx.java ? ctx.java(arg) : null;
      if (!j) { ctx.problem(`{{java:${arg}}} is not a Java lesson`); return ''; }
      ctx.javaItems = j.items;
      return '\n\n' + hold(j.html) + '\n\n';
    }
    // env
    ctx.envRefs.add(arg);
    return hold(`<a class="env-ref" href="${ctx.rel}env-values.html#${envAnchor(arg)}">${esc(arg)}</a>`);
  });

  const slugs = new Map(), items = [];
  const md = new Marked({
    renderer: {
      heading(t, level, raw) {
        let slug = raw.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'section';
        const n = slugs.get(slug) || 0; slugs.set(slug, n + 1);
        if (n) slug += '-' + n;
        if (level === 2 || level === 3) items.push({ lvl: level, id: slug, text: text(t), n: '' });
        return `<h${level} id="${slug}">${t}</h${level}>\n`;
      },
      table(header, bodyHtml) { return `<div class="tbl"><table><thead>${header}</thead><tbody>${bodyHtml}</tbody></table></div>\n`; },
    },
  });
  let html = md.parse(withDirectives);
  html = html.replace(/<!--D:(\d+)-->/g, (m, i) => blocks[Number(i)]);
  // marked wraps a lone block directive in <p>...</p>; unwrap it so blocks are not inside paragraphs.
  html = html.replace(/<p>(<div class="step-(?:cmd|out|missing)"[\s\S]*?<\/div>|<figure[\s\S]*?<\/figure>)<\/p>/g, '$1');
  // contents entries of a Java lesson's block come right after the Description heading
  if (ctx.javaItems) { const at = items.findIndex(i => i.lvl === 2); items.splice(at + 1, 0, ...ctx.javaItems); }
  return { html, items };
}

module.exports = { render, maskedHtml, envAnchor };
