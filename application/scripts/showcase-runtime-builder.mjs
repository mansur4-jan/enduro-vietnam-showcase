import {readFile,writeFile} from 'node:fs/promises';
import ts from 'typescript';
import {pathToFileURL} from 'node:url';
export async function writeShowcaseRuntime(site='.shipstudio/github-publication/site',prefix='/enduro-vietnam-showcase'){
const prefixUrl=url=>url.startsWith('/')&&!url.startsWith('//')&&!url.startsWith(prefix+'/')?prefix+url:url;
const runtimes=[];for(const name of ['city/CityRuntime','tours/EnduroTourRuntime','rentals/RentalRuntime','shared/PublicRuntime']){const source=await readFile('components/'+name+'.tsx','utf8'),body=source.slice(source.indexOf('useEffect(()=>{')+15,source.search(/}\s*,\s*\[[^\]]*\]\);\s*return null;/));runtimes.push(ts.transpileModule('(()=>{'+body+'})();',{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None}}).outputText);}
const home=(await readFile('public/assets/homepage-ru/runtime.js','utf8')).replace(/(['"])(\/(?:ru|assets)[^'"\s]*)\1/g,(_,q,v)=>q+prefixUrl(v)+q);
await writeFile(site+'/showcase.js',await readFile('scripts/showcase-runtime.js','utf8')+'\n'+runtimes.join('\n')+'\n'+home);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await writeShowcaseRuntime();
