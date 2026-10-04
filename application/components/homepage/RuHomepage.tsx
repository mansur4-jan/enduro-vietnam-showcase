import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {publicOfferings} from '@/lib/catalog';
import {homepagePriceRows} from '@/lib/homepage-price-overview';
import {RuHomepageRuntime} from './RuHomepageRuntime';
export async function RuHomepage(){const offers=await publicOfferings('ru');let html=readFileSync('content/homepage-ru/body.html','utf8');const css=readFileSync('content/homepage-ru/styles.css','utf8');html=html.replace(/(<table class="price-table">[\s\S]*?<tbody>)[\s\S]*?(<\/tbody>)/,(_,start,end)=>start+homepagePriceRows(offers)+end);const version=createHash('sha256').update(html+css+readFileSync('public/assets/homepage-ru/runtime.js','utf8')).digest('hex').slice(0,16);return <><style dangerouslySetInnerHTML={{__html:css}}/><div className="ru-aggregator" dangerouslySetInnerHTML={{__html:html}}/><RuHomepageRuntime key={version} version={version}/></>;}
