import configs from '@/content/city-pages/cities.json';
export type CityPageConfig={name:string;inName:string;region:string;title:string;subtitle:string;landscape:string;routeCopy:string;photos:string[];activities:string[];people?:{name:string;role:string;photo:string}[]};
export const cityPages=configs as Record<string,CityPageConfig>;
export function cityPageId(path:string){const parts=path.split('/').filter(Boolean);if(parts[0]!=='ru')return null;const id=parts.length===2?parts[1]:parts.length===3&&parts[1]==='destinations'?parts[2]:null;return id&&cityPages[id]?id:null;}
export const cityHref=(id:string)=>['dalat','nhatrang','danang','muine'].includes(id)?'/ru/'+id:'/ru/destinations/'+id;
