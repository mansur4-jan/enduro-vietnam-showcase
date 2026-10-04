import type {MetadataRoute} from 'next';
import canonicalRedirects from '@/content/canonical-redirects.json';
import {query} from '@/lib/db';
import {publicOfferings,dictionaries,prefix} from '@/lib/catalog';
import type {Locale} from '@/lib/catalog-types';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const origin=(process.env.NEXT_PUBLIC_SITE_URL||'https://enduro-vietnam.com').replace(/\/$/,'');
 const records=await query<{path:string;published_at:string|null}>("SELECT r.path,o.published_at FROM url_registry r LEFT JOIN offerings o ON o.id=r.offering_id WHERE r.kind='page' OR r.kind='offering' AND o.id NOT LIKE 'fixture-%' AND o.published_data IS NOT NULL AND o.published_data->'routes'->>r.locale=r.path");
 const entries=new Map<string,MetadataRoute.Sitemap[number]>();
 for(const r of records.filter(r=>!(r.path in canonicalRedirects)))entries.set(r.path,{url:origin+r.path,...(r.published_at?{lastModified:new Date(r.published_at)}:{})});
 const dict=await dictionaries();
 for(const locale of ['en','ru'] as Locale[]){const offers=await publicOfferings(locale),p=prefix(locale);if(!offers.length)continue;
  const paths=new Set<string>([p+'/destinations']);
  for(const o of offers){if(o.destination_id)paths.add(p+'/destinations/'+o.destination_id);if(o.published_data?.endDestinationId)paths.add(p+'/destinations/'+o.published_data.endDestinationId);if(o.organization_slug)paths.add(p+'/partners/'+o.organization_slug);
   for(const id of [o.category_id,...(o.published_data?.categoryIds??[])]){const c=dict.categories.find(c=>c.id===id);if(!c)continue;paths.add(p+(id==='car-rentals'?'/rentals/cars':id==='motorbike-rentals'?'/rentals/motorbikes':'/activities/'+c.slug));}
  }
  for(const path of paths)entries.set(path,{url:origin+path});
 }
 return [...entries.values()];
}
