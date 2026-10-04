import type {Offering} from './catalog-types';
const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function homepagePriceRows(offerings:Offering[]){
 const choices=[
 ['tour-dalat-easy-rider-enduro-beginners','Эндуро для новичков','Далат'],
 ['tour-dalat-enduro-tour-one-day','Эндуро','Далат'],
 ['tour-dalat-enduro-tour-advanced','Расширенный эндуро-тур','Далат'],
 ['tour-nhatrang-enduro-tour-one-day','Эндуро','Нячанг'],
 ['tour-nhatrang-enduro-tour-advanced','Расширенный эндуро-тур','Нячанг'],
 ['tour-danang-enduro-tour-one-day','Эндуро','Дананг'],
 ['tour-danang-enduro-tour-advanced','Расширенный эндуро-тур','Дананг'],
 ['tour-three-day-tour-dalat-nhatrang','Мототур между городами','Далат → Нячанг'],
 ['tour-5-day-motorbike-tour-from-saigon-ho-chi-minh-city','Мототур между городами','Хошимин → Нячанг'],
 ['rental-dalat-yamaha-nouvo-lx135','Аренда скутера','Далат'],
 ['rental-nhatrang-yadea-xbull','Аренда электробайка','Нячанг'],
 ];
 const rows=choices.flatMap(([id,label,city])=>{const offer=offerings.find(o=>o.id===id),d=offer?.published_data;if(!offer||!d?.routes.ru)return [];const tariff=offer.type==='rental'?d.tariffs?.find(t=>t.period==='day'):null,money=tariff??d.commerce;const amount=money.amountMinor===null?'По запросу':money.currency==='USD'?`$${money.amountMinor/100}`:`${new Intl.NumberFormat('ru-RU').format(money.amountMinor)} ₫`;const duration=offer.type==='rental'?'1 день':d.duration?`${d.duration.value} ${d.duration.unit==='hours'?'ч.':'дн.'}`:'По программе';return [`<tr><td><a href="${escape(d.routes.ru)}">${escape(label)}</a></td><td>${escape(city)}</td><td>${escape(duration)}</td><td>${escape(amount)}</td></tr>`];});
 for(const format of ['Горы и хайкинг','Дайвинг и море','Воздушные активности'])rows.push(`<tr class="planned-format"><td><a class="price-interest" href="#contacts" data-interest="${format}">${format}</a></td><td>Город подберём</td><td>По выбранной программе</td><td>По запросу</td></tr>`);
 return rows.join('');
}
