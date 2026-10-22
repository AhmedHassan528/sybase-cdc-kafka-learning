// Compiles compact diagram specs (diagrams/specs.js) into draw.io XML files (docs/diagrams/src/*.drawio).
// Usage: node docs-src/diagrams/drawio-gen.js
// The .drawio files are the editable source; docs-src/diagrams/export.sh renders them to SVG with draw.io.
const fs = require('fs');
const path = require('path');

// Reserved ids: 'lg*' (legend), 'title', 'subtitle', 'e<n>', 'm<n>', 'fr<n>', 'pl_*'. Avoid 'map' (breaks draw.io export).
const OUT = path.join(__dirname, '..', '..', 'docs', 'diagrams', 'src');

// Role colors (draw.io classic palette): one meaning per color, explained in each diagram's legend.
const KIND = {
  step:     'fillColor=#dae8fc;strokeColor=#6c8ebf;',   // our component / process step
  data:     'fillColor=#d5e8d4;strokeColor=#82b366;',   // data store, output, success
  ext:      'fillColor=#ffe6cc;strokeColor=#d79b00;',   // external / vendor system
  decision: 'fillColor=#fff2cc;strokeColor=#d6b656;',   // decision, note, warning
  error:    'fillColor=#f8cecc;strokeColor=#b85450;',   // failure, error path
  security: 'fillColor=#e1d5e7;strokeColor=#9673a6;',   // security, secrets
  plain:    'fillColor=#ffffff;strokeColor=#666666;',
  term:     'fillColor=#f5f5f5;strokeColor=#666666;',
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Labels: "Title|small detail" -> bold-ish title + small second line (HTML, escaped for XML).
function label(text) {
  const h = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const [main, ...rest] = String(text).split('|').map(h);
  let html = main;
  if (rest.length) html += '<br><font style="font-size:11px">' + rest.join('<br>') + '</font>';
  return esc(html);
}

function shapeStyle(n) {
  const k = KIND[n.kind || 'step'];
  const fs = n.fontSize || 13;
  switch (n.shape) {
    case 'db': return `shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;size=10;${k}fontSize=${fs};`;
    case 'decision': return `rhombus;whiteSpace=wrap;html=1;${KIND[n.kind || 'decision']}fontSize=${fs};`;
    case 'terminal': return `rounded=1;arcSize=50;whiteSpace=wrap;html=1;${KIND[n.kind || 'term']}fontSize=${fs};`;
    case 'note': return `shape=note;size=12;whiteSpace=wrap;html=1;align=left;spacingLeft=6;${KIND[n.kind || 'decision']}fontSize=${n.fontSize || 12};`;
    case 'doc': return `shape=document;size=0.15;whiteSpace=wrap;html=1;${k}fontSize=${fs};`;
    case 'actor': return `shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;fontSize=${fs};`;
    case 'class': return `swimlane;fontStyle=1;childLayout=stackLayout;horizontalStack=0;resizeParent=1;resizeParentMax=0;horizontal=1;startSize=26;collapsible=0;html=1;${k}fontSize=12;`;
    default: return `rounded=1;whiteSpace=wrap;html=1;${k}fontSize=${fs};`;
  }
}

function build(spec) {
  const cells = [];
  const add = s => cells.push(s);
  add('<mxCell id="0"/>');
  add('<mxCell id="1" parent="0"/>');
  if (spec.title) {
    add(`<mxCell id="title" value="${esc(spec.title)}" style="text;html=1;fontSize=20;fontStyle=1;align=left;verticalAlign=middle;" vertex="1" parent="1"><mxGeometry x="20" y="0" width="${spec.titleWidth || 900}" height="36" as="geometry"/></mxCell>`);
  }
  if (spec.subtitle) {
    add(`<mxCell id="subtitle" value="${esc(spec.subtitle)}" style="text;html=1;fontSize=12;align=left;verticalAlign=top;whiteSpace=wrap;fontColor=#555555;" vertex="1" parent="1"><mxGeometry x="20" y="34" width="${spec.titleWidth || 900}" height="30" as="geometry"/></mxCell>`);
  }
  for (const g of spec.groups || []) {
    const fill = g.fill || '#f5f5f5';
    add(`<mxCell id="${g.id}" value="${esc(g.label)}" style="swimlane;startSize=26;html=1;fontSize=13;fontStyle=1;fillColor=${fill};strokeColor=${g.stroke || '#999999'};swimlaneFillColor=${g.body || '#fcfcfc'};rounded=1;arcSize=4;" vertex="1" parent="${g.parent || 1}"><mxGeometry x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" as="geometry"/></mxCell>`);
  }
  for (const n of spec.nodes || []) {
    if (n.shape === 'class') {
      const rows = n.rows || [];
      const h = 26 + rows.length * 20 + 6;
      add(`<mxCell id="${n.id}" value="${esc(n.label)}" style="${shapeStyle(n)}" vertex="1" parent="${n.parent || 1}"><mxGeometry x="${n.x}" y="${n.y}" width="${n.w || 220}" height="${h}" as="geometry"/></mxCell>`);
      rows.forEach((r, i) => add(`<mxCell id="${n.id}_r${i}" value="${esc(r)}" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=6;html=1;fontSize=11;fontFamily=Courier New;" vertex="1" parent="${n.id}"><mxGeometry y="${26 + i * 20}" width="${n.w || 220}" height="20" as="geometry"/></mxCell>`));
      continue;
    }
    const w = n.w || (n.shape === 'decision' ? 160 : 150);
    const h = n.h || (n.shape === 'decision' ? 90 : n.shape === 'db' ? 70 : 60);
    add(`<mxCell id="${n.id}" value="${label(n.label)}" style="${shapeStyle(n)}" vertex="1" parent="${n.parent || 1}"><mxGeometry x="${n.x}" y="${n.y}" width="${w}" height="${h}" as="geometry"/></mxCell>`);
  }
  (spec.edges || []).forEach((e, i) => {
    let st = e.straight ? 'html=1;' : 'edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;';
    st += 'fontSize=11;labelBackgroundColor=default;';
    if (e.dashed) st += 'dashed=1;';
    if (e.color) st += `strokeColor=${e.color};fontColor=${e.color};`;
    if (e.width) st += `strokeWidth=${e.width};`;
    if (e.noArrow) st += 'endArrow=none;';
    if (e.both) st += 'startArrow=block;';
    if (e.exit) st += `exitX=${e.exit[0]};exitY=${e.exit[1]};exitDx=0;exitDy=0;`;
    if (e.entry) st += `entryX=${e.entry[0]};entryY=${e.entry[1]};entryDx=0;entryDy=0;`;
    if (e.style) st += e.style;
    add(`<mxCell id="e${i}" value="${esc(e.label || '')}" style="${st}" edge="1" parent="${e.parent || 1}" source="${e.from}" target="${e.to}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  });
  if (spec.seq) buildSequence(spec, add);
  if (spec.legend) {
    const lx = spec.legend.x, ly = spec.legend.y;
    const items = spec.legend.items;
    add(`<mxCell id="lg" value="Legend" style="swimlane;startSize=22;html=1;fontSize=12;fontStyle=1;fillColor=#f5f5f5;strokeColor=#999999;rounded=1;arcSize=6;" vertex="1" parent="1"><mxGeometry x="${lx}" y="${ly}" width="${spec.legend.w || 260}" height="${30 + items.length * 26}" as="geometry"/></mxCell>`);
    items.forEach((it, i) => {
      const y = 28 + i * 26;
      if (it.line) {
        const lst = `endArrow=block;html=1;${it.dashed ? 'dashed=1;' : ''}${it.color ? 'strokeColor=' + it.color + ';' : ''}`;
        add(`<mxCell id="lg_l${i}" value="" style="${lst}" edge="1" parent="lg"><mxGeometry width="50" height="50" relative="1" as="geometry"><mxPoint x="10" y="${y + 9}" as="sourcePoint"/><mxPoint x="50" y="${y + 9}" as="targetPoint"/></mxGeometry></mxCell>`);
      } else {
        add(`<mxCell id="lg_s${i}" value="" style="rounded=1;html=1;${KIND[it.kind]}" vertex="1" parent="lg"><mxGeometry x="10" y="${y}" width="40" height="18" as="geometry"/></mxCell>`);
      }
      add(`<mxCell id="lg_t${i}" value="${esc(it.text)}" style="text;html=1;fontSize=11;align=left;verticalAlign=middle;" vertex="1" parent="lg"><mxGeometry x="58" y="${y - 2}" width="${(spec.legend.w || 260) - 64}" height="22" as="geometry"/></mxCell>`);
    });
  }
  return `<mxfile host="drawio-gen" agent="sybase-cdc docs"><diagram id="${spec.id}" name="${esc(spec.name || spec.id)}"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" page="0" adaptiveColors="auto"><root>\n${cells.join('\n')}\n</root></mxGraphModel></diagram></mxfile>\n`;
}

// Sequence diagrams: spec.seq = { participants:[{id,label,kind}], messages:[{from,to,text,reply,frame}], x0, gap, top }
function buildSequence(spec, add) {
  const s = spec.seq;
  const gap = s.gap || 300, x0 = s.x0 || 40, top = s.top || 80, step = s.step || 44;
  const height = 70 + s.messages.length * step + 40;
  const pos = {};
  s.participants.forEach((p, i) => {
    pos[p.id] = x0 + i * gap + 90;
    add(`<mxCell id="pl_${p.id}" value="${label(p.label)}" style="shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=0;collapsible=0;size=50;fontSize=13;${KIND[p.kind || 'step']}" vertex="1" parent="1"><mxGeometry x="${x0 + i * gap}" y="${top}" width="180" height="${height}" as="geometry"/></mxCell>`);
  });
  s.messages.forEach((m, i) => {
    const y = top + 80 + i * step;
    if (m.frame) {
      add(`<mxCell id="fr${i}" value="${esc(m.frame)}" style="shape=umlFrame;whiteSpace=wrap;html=1;width=170;height=22;fontSize=11;" vertex="1" parent="1"><mxGeometry x="${x0 + 20}" y="${y + 6}" width="${(s.participants.length - 1) * gap + 140}" height="${m.span * step + 14}" as="geometry"/></mxCell>`);
      return;
    }
    const st = `html=1;verticalAlign=bottom;fontSize=11;endSize=8;labelBackgroundColor=default;${m.reply ? 'dashed=1;endArrow=open;' : 'endArrow=block;'}${m.color ? 'strokeColor=' + m.color + ';fontColor=' + m.color + ';' : ''}`;
    add(`<mxCell id="m${i}" value="${esc(m.text)}" style="${st}" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${pos[m.from]}" y="${y}" as="sourcePoint"/><mxPoint x="${pos[m.to]}" y="${y}" as="targetPoint"/></mxGeometry></mxCell>`);
  });
}

const specs = require('./specs.js');
fs.mkdirSync(OUT, { recursive: true });
for (const spec of specs) {
  fs.writeFileSync(path.join(OUT, spec.id + '.drawio'), build(spec));
  console.log('wrote', spec.id + '.drawio');
}
