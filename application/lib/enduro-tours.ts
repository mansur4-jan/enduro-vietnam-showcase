import type {Offering} from './catalog-types';
// Existing published enduro routes; road touring and rentals retain their own template.
export function isEnduroTour(o:Offering){return o.type==='tour'&&(o.category_id==='enduro-tours'||/^((dalat|danang|nhatrang)-(enduro-tour|easy-rider-enduro)|three-day-tour-dalat-)/.test(o.slug));}
export function tourContent(o:Offering){
 const d=o.published_data!,body=d.translations.ru?.body??[];
 const overview=body.find((p,i)=>i>0&&body[i-1]==='ОБЗОР ТУРА')??d.translations.ru?.description??'';
 const steps=body.flatMap((p,i)=>/^\d\.\s/.test(p)&&body[i+1]?[{title:p.replace(/^\d\.\s*/,''),text:body[i+1]}]:[]).slice(0,4);
 const start=body.findIndex(p=>p==='ЧТО ВХОДИТ В КОМПЛЕКТ'),end=body.findIndex((p,i)=>i>start&&/стоимость тура не включено/i.test(p));
 const included=start>=0?body.slice(start+1,end>=0?end:undefined).filter(p=>p.length>5):[];
 const excluded=end>=0?body.slice(end+1):[];
 const noteStart=body.findIndex(p=>/^ВАЖНЫЕ ПР/.test(p));
 const notes=noteStart>=0?body.slice(noteStart+1,start>noteStart?start:undefined):[];
 const primaryEnd=body.findIndex(p=>/^ТУРЫ |^ВАЖНЫЕ ПР/.test(p));
 const primary=body.slice(0,primaryEnd<0?undefined:primaryEnd);
 const models=[...new Set(primary.filter(p=>/^(Honda|Yamaha|Suzuki|Kawasaki)\s/i.test(p)&&p.length<85))];
 return {overview,steps,included,excluded,models,notes};
}
