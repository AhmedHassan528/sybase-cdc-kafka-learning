// Page parts for the learning path: lesson page, overview page, stage strip, progress bar.
const { esc } = require('../util');
const { contents, prevNext } = require('./article');

const progressBar = total => `<div class="path-progress js-only" data-total="${total}"><span class="bar" role="presentation"><span></span></span><span class="label" aria-live="polite">0 of ${total} lessons complete</span></div><p class="storage-note js-only" hidden>This browser does not let the page remember your progress, so lessons cannot be marked complete. Every lesson can still be read.</p>`;

// The nine stages as a strip; each links to its first lesson. The current one is marked.
function stageStrip(stages, firstLessonHref, currentId) {
  const li = stages.map(s => `<li${s.id === currentId ? ' aria-current="step" class="on"' : ''}><a href="${firstLessonHref(s)}"><span class="no">${s.number}</span><span class="nm">${esc(s.title)}</span></a></li>`).join('');
  return `<nav class="stage-strip" aria-label="Stages of the learning path"><ol>${li}</ol></nav>`;
}

// ctx: { stage, stages, lesson, n, total, prereqs: [{id, title, href}], items, html, prev, next, evidence: {href, date}|null, stageHref, startHref }
function lessonBody(ctx) {
  const m = ctx.lesson.meta;
  const obj = (m.objectives || []).map(o => `<li>${esc(o)}</li>`).join('');
  const pre = ctx.prereqs.length
    ? `<ul class="prereq-list">${ctx.prereqs.map(p => `<li data-prereq="${esc(p.id)}"><a href="${p.href}">Lesson ${esc(p.id)}: ${esc(p.title)}</a> <span class="pstatus js-only" data-id="${esc(p.id)}"></span></li>`).join('')}</ul>${m.prereqCheck ? `<p>To test that these hold, run step <code>${esc(m.prereqCheck)}</code> below.</p>` : ''}`
    : '<p>Nothing: this is where the path starts.</p>';
  const ev = ctx.evidence
    ? `<p class="evidence-line">Evidence: every command and output of this lesson was recorded in <a href="${ctx.evidence.href}">${esc(ctx.evidence.name)}</a> (captured ${esc(ctx.evidence.date)}).</p>`
    : m.example ? '<p class="evidence-line">Evidence: none. This lesson is an example and nothing in it was run.</p>' : '';
  return `<div class="page-grid">
<header class="title-block">
<p class="category">Stage ${ctx.stage.number} · ${esc(ctx.stage.title)}</p>
<h1>${esc(m.title)}</h1>
<p class="lede">${esc(m.summary)}</p>
<p class="meta">Lesson ${esc(m.id)} of ${ctx.total}</p>
${stageStrip(ctx.stages, ctx.startHref, ctx.stage.id)}
${progressBar(ctx.total)}
</header>
${contents(ctx.items)}
<article class="prose-site guide-body lesson" id="article" data-lesson="${esc(m.id)}">
<div class="lesson-box"><p class="box-title">In this lesson</p><ul>${obj}</ul></div>
<div class="lesson-box prereq-box"><p class="box-title">Before you start</p>${pre}</div>
${ctx.html}
${ev}
<p class="complete-line js-only"><button type="button" class="btn complete-btn" data-lesson="${esc(m.id)}" aria-pressed="false">Mark this lesson complete</button> <a class="next-unfinished" href="${ctx.stageHref}">Back to the path overview</a></p>
${prevNext(ctx.prev, ctx.next)}
</article>
</div>`;
}

// ctx: { stages: [{stage, lessons: [{id,title,href,summary}]}], total, startHref, overview: {href, alt}|null }
function indexBody(ctx) {
  const stages = ctx.stages.map(({ stage, lessons }) => `<section class="stage-card" data-stage="${esc(stage.id)}">
<h2 id="stage-${esc(stage.id)}"><span class="chno">${stage.number}.</span>${esc(stage.title)} <span class="stage-count js-only" data-stage="${esc(stage.id)}" data-total="${lessons.length}">0 of ${lessons.length}</span></h2>
<p>${esc(stage.goal)}</p>
<ol class="lesson-list">${lessons.map(l => `<li data-lesson="${esc(l.id)}"><span class="lstatus js-only" aria-hidden="true"></span><a href="${l.href}"><span class="lid">${esc(l.id)}</span> ${esc(l.title)}</a></li>`).join('')}</ol>
</section>`).join('\n');
  const items = ctx.stages.map(({ stage }) => ({ lvl: 2, id: 'stage-' + stage.id, text: stage.title, n: stage.number }));
  const diagram = ctx.overview ? `<figure class="diagram"><div class="img"><img src="${ctx.overview.href}" alt="${esc(ctx.overview.alt)}"></div><figcaption><span class="fig-title">The nine stages.</span> Each stage builds on the one before it.</figcaption></figure>` : '';
  return `<div class="page-grid">
<header class="title-block">
<p class="category">Learning path</p>
<h1>Build and run a Sybase ASE CDC connector, step by step</h1>
<p class="lede">Nine stages that take you from Docker to a verified change event in Kafka. Every command was run in the lab, and the output you see is the recorded output.</p>
<p class="meta">${ctx.total} lessons</p>
${progressBar(ctx.total)}
<p class="continue-line js-only"><a class="btn continue-btn" href="${ctx.startHref}" data-start="${ctx.startHref}">Start the path</a></p>
</header>
${contents(items)}
<article class="prose-site guide-body" id="article">
${diagram}
<p>Follow the stages in order. Each lesson says what must be true before it, gives the commands, shows the recorded output, lists what went wrong when it was run, and says what was not tested. Your progress is kept only in this browser.</p>
${stages}
</article>
</div>`;
}

module.exports = { lessonBody, indexBody, stageStrip, progressBar, prevNext };
