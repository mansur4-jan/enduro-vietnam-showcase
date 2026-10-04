import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parse} from 'csv-parse/sync';
const file=process.argv[2];if(!file)throw new Error('Usage: node scripts/import-csv.mjs data/file.csv');
const rows=parse(await readFile(file,'utf8'),{columns:true,bom:true,skip_empty_lines:true});
const template=JSON.parse(await readFile('data/catalog-seed.json','utf8'));const offerings=[],quarantine=[];
for(const row of rows){try{
 if(!row.source_id||!['tour','activity','rental'].includes(row.type)||!template.destinations.some(d=>d.id===row.destination)||!template.categories.some(c=>c.id===row.category)||!/^[a-z0-9-]+$/.test(row.slug))throw new Error('Required stable source_id, type, destination, category or slug invalid');
 if(!row.title_ru&&!row.title_en)throw new Error('At least one title required');if(!['USD','VND'].includes(row.currency))throw new Error('Unknown currency');const amount=row.price_minor?.trim()?Number(row.price_minor):null;if(amount!==null&&(!Number.isSafeInteger(amount)||amount<0))throw new Error('price_minor must be integer minor units; formulas are not executed');
 const translations={},routes={};for(const lang of ['ru','en'])if(row[`title_${lang}`]){translations[lang]={title:row[`title_${lang}`],description:row[`description_${lang}`]??'',body:[]};routes[lang]=`${lang==='ru'?'/ru':''}/${row.type==='rental'?'rentals':'experiences'}/${row.slug}`;}
 const normalized={...row,price_minor:amount};const hash=createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(normalized).sort()))).digest('hex');
 offerings.push({id:`csv-${createHash('sha256').update(row.source_id).digest('hex').slice(0,24)}`,sourceId:row.source_id,hash,sourceFile:file,type:row.type,category:row.category,destination:row.destination,slug:row.slug,data:{translations,routes,photos:[],variants:[],supplier:'Enduro Vietnam',commerce:{currency:row.currency,amountMinor:amount,basis:amount===null?'request':'from',unit:row.unit||null,priceStatus:'imported_unapproved'},sourceNotice:true},raw:row});
 }catch(e){quarantine.push({sourceId:row.source_id||null,fingerprint:createHash('sha256').update(JSON.stringify(row)).digest('hex'),raw:row,error:e.message});}}
// CSV creates drafts; no implicit publishing of unreviewed input.
const path='.data/csv-prepared.json';await writeFile(path,JSON.stringify({...template,offerings,conflicts:[],quarantine,publicationState:'draft'},null,2),{mode:0o600});await writeFile('.shipstudio/csv-dry-run.json',JSON.stringify({source:file,inputRows:rows.length,validRows:offerings.length,quarantine:quarantine.map(({raw,...r})=>r),preparedFile:path,mapping:{source_id:'stable identity',price_minor:'integer amount',title_ru:'translations.ru.title',title_en:'translations.en.title'},applyCommand:`IMPORT_FILE=${path} node scripts/import-catalog.mjs --apply`},null,2));console.log(JSON.stringify({validRows:offerings.length,quarantined:quarantine.length,preparedFile:path}));
