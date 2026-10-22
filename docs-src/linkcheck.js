// Checks every local link and anchor in docs/index.html and docs/source/*.html; lists external links.
// Usage: node docs-src/linkcheck.js docs <external-links-out.txt>
const fs=require('fs'),path=require('path');
const root=process.argv[2];
const pages=[path.join(root,'index.html'),...fs.readdirSync(path.join(root,'source')).filter(f=>f.endsWith('.html')).map(f=>path.join(root,'source',f))];
const ids=new Map(); for(const p of pages){const s=fs.readFileSync(p,'utf8'); ids.set(p,new Set([...s.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1])));}
let bad=0,checked=0,external=new Set();
for(const p of pages){const s=fs.readFileSync(p,'utf8');
 for(const m of s.matchAll(/(?:href|src)="([^"]+)"/g)){const u=m[1]; if(/^(https?:|mailto:)/.test(u)){external.add(u);continue;} checked++;
  const [f,frag]=u.split('#'); const target=f?path.resolve(path.dirname(p),decodeURIComponent(f)):p;
  if(!fs.existsSync(target)){console.log('MISSING FILE',path.relative(root,p),'->',u);bad++;continue;}
  if(frag && target.endsWith('.html')){ if(!ids.has(target)) ids.set(target,new Set([...fs.readFileSync(target,'utf8').matchAll(/\sid="([^"]+)"/g)].map(m=>m[1])));
   if(!ids.get(target).has(frag)){console.log('MISSING ANCHOR',path.relative(root,p),'->',u);bad++;}}
 }}
// duplicate ids
const s=fs.readFileSync(path.join(root,'index.html'),'utf8'); const all=[...s.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]); const dup=all.filter((x,i)=>all.indexOf(x)!==i);
if(dup.length){console.log('DUPLICATE IDS',[...new Set(dup)].join(' '));bad++;}
console.log(`pages=${pages.length} local links checked=${checked} problems=${bad} external=${external.size}`);
fs.writeFileSync(process.argv[3],[...external].sort().join('\n')+'\n');
