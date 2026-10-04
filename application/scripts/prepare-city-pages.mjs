import {readFile,writeFile,mkdir} from 'node:fs/promises';
import postcss from 'postcss';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const source=await readFile('content/city-pages/reference-dalat.html','utf8');
const tree=postcss.parse(source.match(/<style>([\s\S]*?)<\/style>/)[1]);
tree.walkRules(rule=>{rule.selectors=rule.selectors.map(s=>[':root','body','html'].includes(s)?'.city-page':s==='body.lock'?'.city-page.is-locked':'.city-page '+s);});
const homeCss=await readFile('content/homepage-ru/styles.css','utf8');
const fonts=homeCss.slice(0,homeCss.indexOf('.ru-aggregator'));
await writeFile('content/city-pages/styles.css',fonts+'\n'+tree.toString()+'\n'+await readFile('content/city-pages/refinements.css','utf8'));
if(process.argv.includes('--styles-only')){console.log('City styles regenerated');process.exit(0);}
const configs=JSON.parse(await readFile('content/city-pages/cities.json','utf8'));
const sourceAssets=JSON.parse(await readFile('content/assets.json','utf8'));
const workbookAssets=JSON.parse(await readFile('.shipstudio/workbook-media.json','utf8')).files;
const originals=new Map([...Object.entries(sourceAssets),...workbookAssets.map(a=>[a.url,a.path])].filter(([url])=>url.length<350).map(([url,path])=>[path,url]));
const media={},errors=[];
await mkdir('public/assets/cities',{recursive:true});
const paths=[...new Set(Object.values(configs).flatMap(c=>[...c.photos,...(c.people??[]).map(p=>p.photo)]))];
for(const path of paths){try{const bytes=await readFile('public'+path),meta=await sharp(bytes).metadata(),hash=createHash('sha256').update(bytes).digest('hex').slice(0,18),base='/assets/cities/'+hash;
 const image=sharp(bytes).rotate().resize({width:1600,withoutEnlargement:true});
 await image.clone().avif({quality:70,effort:3}).toFile('public'+base+'.avif');
 await image.clone().webp({quality:88}).toFile('public'+base+'.webp');
 const output=await sharp('public'+base+'.webp').metadata();
 media[path]={avif:base+'.avif',webp:base+'.webp',width:output.width,height:output.height,sourceWidth:meta.width,sourceHeight:meta.height,sourceUrl:originals.get(path)??null,sha256:createHash('sha256').update(bytes).digest('hex')};
 }catch(e){errors.push({path,error:e.message});}}
await writeFile('content/city-pages/media.json',JSON.stringify(media,null,2)+'\n');
const report={checkedAt:new Date().toISOString(),source:'content/city-pages/reference-dalat.html',breakpoints:[600,900,1250],cities:Object.keys(configs),images:Object.keys(media).length,stockImages:0,errors};
await writeFile('.shipstudio/city-page-assets.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));if(errors.length)process.exitCode=1;
