import {readFile,writeFile} from 'node:fs/promises';
import postcss from 'postcss';
const html=await readFile('content/enduro-tours/reference-dalat-3h.html','utf8');
const tree=postcss.parse(html.match(/<style>([\s\S]*?)<\/style>/)[1]);
tree.walkRules(r=>{r.selectors=r.selectors.map(s=>[':root','html','body'].includes(s)?'.enduro-tour':'.enduro-tour '+s);});
// The supplied display face has no Cyrillic glyphs: use the site's local UI face.
tree.walkDecls('font-family',d=>{if(d.value.includes('Bricolage'))d.value='"Bricolage Grotesque",Manrope,Arial,sans-serif';});
const home=await readFile('content/homepage-ru/styles.css','utf8');
const fonts=home.slice(0,home.indexOf('.ru-aggregator'))+[500,600,700].map(w=>`@font-face{font-family:'Bricolage Grotesque';font-weight:${w};font-style:normal;font-display:swap;src:url('/assets/tour-fonts/bricolage-${w}.ttf') format('truetype')}`).join('\n');
await writeFile('content/enduro-tours/styles.css',fonts+'\n'+tree.toString()+'\n'+await readFile('content/enduro-tours/refinements.css','utf8'));
console.log('Tour CSS: source breakpoints 600, 900, 1250px; local fonts; scoped selectors');
