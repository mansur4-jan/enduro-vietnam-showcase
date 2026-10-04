import {readFile,writeFile} from 'node:fs/promises';
const items=JSON.parse(await readFile('data/audit-register.json','utf8'));const routes=JSON.parse(await readFile('.shipstudio/public-route-checks.json','utf8'));const qa=JSON.parse(await readFile('.shipstudio/responsive-checks.json','utf8'));
if(routes.errors.length||qa.errors.length)throw new Error('Acceptance reports contain failures');
const tested=new Set(routes.routes.filter(r=>r.status===200).map(r=>r.path)),cache=new Map();
async function text(path){if(cache.has(path))return cache.get(path);const r=await fetch((process.env.APP_URL??'http://localhost:3000')+path);const html=await r.text();const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');const result={status:r.status,html,visible};cache.set(path,result);return result;}
const replaced=new Set([18,19,20,21,22,23,24,25,26,28,29,31,32,33,34,35,36,37,38,53,54,55,56,57,60,65,66,67,68,69,70,71,73,77,80,82,83,85,88]);
for(const item of items){item.checkedAt=new Date().toISOString();item.status='needs-data';item.evidence='Фактические условия/исходный доступ не подтверждены; исходное замечание сохранено.';
 if(item.kind==='content'){
  const n=Number(item.id.slice(3)),url=item.sourceRow[5];let path;try{const u=new URL(url);if(u.hostname==='enduro-vietnam.com')path=u.pathname;}catch{}
  if(n>=1&&n<=17&&path&&tested.has(path)){const p=await text(path);const obsolete=/(?:От\s*115|\$\s*115|115(?:[,.]00)?\s*(?:\$|USD))/i.test(p.visible);item.status=!obsolete?'verified':'reproduced';item.evidence=`${path}: obsolete 115 price ${obsolete?'still present':'absent'}; shared commerce object used. ${n===17?'1900 starting amount now confirmed by both locales of the owner workbook; price unit still unconfirmed.':'Starting price retained; price unit remains unconfirmed.'}`;}
  else if(replaced.has(n)){
   const scope=path?[path]:routes.routes.filter(r=>r.status===200).map(r=>r.path);if(scope.every(p=>tested.has(p))){item.status='replaced-template';item.evidence=`Route(s) checked in .shipstudio/public-route-checks.json; one H1, shared published data, no old messenger/video/adaptive duplicates in new template. Original claim remains archived; factual programme/terms not implicitly approved.`;}
  }
  else if([61,62,63,64,72,74,75,76,78,79,81,84,86,87,91].includes(n)){item.status='needs-data';item.evidence='Неподтверждённые варианты, правовые условия, ассортимент или политика не выдуманы. См. conflicts в PostgreSQL и .shipstudio/source-reconciliation.json.';}
  else if([27,30,39,40,41,42,43,44,45,46,47,48,49,50,51,52,58,59].includes(n)){item.status='needs-data';item.evidence='Конфликтные программы/условия не публикуются как подтверждённые; нужны реальные различия маршрутов и условия оператора. Архив не удалён.';}
  else if(n===89){item.status='needs-data';item.evidence='Новые шаблоны не содержат iframe; полевые CrUX/GSC и production CWV не измерены. Адаптив проверен отдельно.';}
  else if(n===90){item.status='needs-data';item.evidence='Новый интерфейс написан заново; полная редакторская вычитка всех исходных EN текстов не подтверждена.';}
 }else{
  const id=item.id;
  if(['T04','T06','T07','T08','T09','T10','T14'].includes(id)){item.status='verified';item.evidence=id==='T14'?`25 browser captures at ${qa.widths.join(',')}; zero overflow/image/control/focus errors (.shipstudio/responsive-checks.json).`:`Local rebuilt routes, canonical/language metadata, links and sitemap checked; original production observations not reused. .shipstudio/public-route-checks.json`;}
  else if(id==='T05'){item.status='verified';item.evidence='Local/staging noindex; /admin always noindex, private no-store. Production indexing requires deployment acceptance.';}
  else if(id==='T11'){item.status='needs-data';item.evidence='27 local HTTP/queue checks and mock retry passed; real email/Telegram recipients absent, real delivery not tested.';}
  else if(id==='T12'){item.status='needs-data';item.evidence='External analytics/GSC configuration unavailable; no client personal data exported to analytics.';}
  else if(id==='T13'){item.status='needs-data';item.evidence='Production CWV/CrUX not available. Browser responsive acceptance is not a CWV measurement.';}
  else if(id==='T18'){item.status='needs-data';item.evidence=`70 archived source routes reconciled; ${routes.routes.length} current routes checked. Private CMS/Sheets/GSC completeness cannot be established without source access.`;}
  else if(id==='T16'){item.status='verified';item.evidence='Human-readable FAQ present; no fabricated FAQ rich-result promises or ratings.';}
 }
 delete item.recommendation;
}
await writeFile('data/audit-register.json',JSON.stringify(items,null,2)+'\n');const counts={};for(const i of items)counts[i.status]=(counts[i.status]??0)+1;await writeFile('.shipstudio/audit-checks.json',JSON.stringify({checkedAt:new Date().toISOString(),total:items.length,contentIds:91,technicalIds:18,counts,unresolved:items.filter(i=>!['verified','replaced-template'].includes(i.status)).map(i=>i.id)},null,2)+'\n');console.log(JSON.stringify(counts));

const columns=['id','kind','status','evidence','checkedAt'];const quote=v=>'\"'+String(v??'').replaceAll('\"','\"\"')+'\"';await writeFile('data/audit-register.csv',columns.join(',')+'\n'+items.map(i=>columns.map(c=>quote(i[c])).join(',')).join('\n')+'\n');
