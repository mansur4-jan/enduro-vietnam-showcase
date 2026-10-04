import {readFile,writeFile} from 'node:fs/promises';
import postcss from 'postcss';
const html=await readFile('content/rentals/reference-dalat-v1.html','utf8'),tree=postcss.parse(html.match(/<style>([\s\S]*?)<\/style>/)[1]);
tree.walkRules(r=>{r.selectors=r.selectors.map(s=>[':root','body','html'].includes(s)?'.rental-page':'.rental-page '+s);});
const home=await readFile('content/homepage-ru/styles.css','utf8');
await writeFile('content/rentals/styles.css',home.slice(0,home.indexOf('.ru-aggregator'))+'\n'+tree.toString()+'\n'+await readFile('content/rentals/refinements.css','utf8'));
console.log('Rental styles: local homepage fonts; source breakpoints 640/980px');
