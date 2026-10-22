// Derives the claude.ai artifact page from docs/index.html: drops the doctype/html/head/body wrappers
// (the host adds them) and adds the viewport-fit meta. Usage: node docs-src/publish-variant.js <out.html>
const fs=require('fs');let s=fs.readFileSync('docs/index.html','utf8');
const head=s.match(/<head>([\s\S]*?)<\/head>/)[1];
const keep=head.split('\n').filter(l=>/<title>|name="description"|rel="stylesheet"/.test(l)).join('\n');
const body=s.match(/<body>([\s\S]*?)<\/body>/)[1];
const out=keep.replace('</title>','</title>\n<meta name="claude:viewport-fit-sides" content="cover">')+'\n'+body.trim()+'\n';
fs.writeFileSync(process.argv[2],out);console.log(out.slice(0,400));
