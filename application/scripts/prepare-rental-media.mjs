import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {runSQL} from '../server/sql-client.mjs';
const [r]=await runSQL([{sql:"SELECT id,slug,type,category_id,published_data FROM offerings WHERE published_data IS NOT NULL AND id NOT LIKE 'fixture-%'"}]);
const offers=r.rows.filter(o=>o.type==='rental');
const originals=new Map(Object.entries(JSON.parse(await readFile('content/assets.json','utf8'))).map(([url,path])=>[path,url]));
for(const m of JSON.parse(await readFile('.shipstudio/workbook-media.json','utf8')).files)originals.set(m.path,m.url);
const media={},errors=[];await mkdir('public/assets/rentals',{recursive:true});
for(const path of new Set(offers.flatMap(o=>o.published_data.photos.map(p=>p.src)))){try{if(!path.startsWith('/assets/'))continue;const bytes=await readFile('public'+path),sha=createHash('sha256').update(bytes).digest('hex'),base='/assets/rentals/'+sha.slice(0,20),im=sharp(bytes).rotate().resize({width:1600,withoutEnlargement:true});await im.clone().avif({quality:70,effort:2}).toFile('public'+base+'.avif');await im.clone().webp({quality:88}).toFile('public'+base+'.webp');const meta=await sharp('public'+base+'.webp').metadata();media[path]={avif:base+'.avif',webp:base+'.webp',width:meta.width,height:meta.height,sha256:sha,sourceUrl:originals.get(path)??null};}catch(e){errors.push({path,error:e.message});}}
await writeFile('content/rentals/media.json',JSON.stringify(media,null,2)+'\n');await writeFile('.shipstudio/rental-page-assets.json',JSON.stringify({checkedAt:new Date().toISOString(),offerings:offers.map(o=>o.id),images:Object.keys(media).length,errors},null,2)+'\n');console.log(JSON.stringify({offers:offers.length,images:Object.keys(media).length,errors}));if(errors.length)process.exitCode=1;
