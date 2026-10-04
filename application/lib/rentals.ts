import type {Money,Offering} from './catalog-types';
import {price} from './catalog';
export const rentalPeriodLabels:Record<string,string>={day:'День','3_days':'3 дня',week:'Неделя',month:'Месяц'};
export function rentalTariffLabel(t:{currency:'USD'|'VND';amountMinor:number|null;status:string}){return price({currency:t.currency,amountMinor:t.amountMinor,basis:'fixed',unit:null,priceStatus:t.status},'ru');}
export function rentalCardAmount(t:{currency:'USD'|'VND';amountMinor:number|null}){if(t.amountMinor===null)return 'По запросу';if(t.currency==='USD')return (t.amountMinor/100).toLocaleString('ru',{maximumFractionDigits:2});const divisor=t.amountMinor>=1000000?1000000:1000;return (t.amountMinor/divisor).toLocaleString('ru',{maximumFractionDigits:divisor===1000000?6:3})+(divisor===1000000?' млн':' тыс.');}
export function rentalDeposit(o:Offering){const d=o.published_data?.deposit;return d?price({...d,basis:'fixed',unit:null,priceStatus:'published'},'ru'):'Уточняется';}
export function rentalDailyMinimum(offers:Offering[]):Money|null{const tariffs=offers.flatMap(o=>o.published_data?.tariffs??[]).filter(t=>t.period==='day'&&t.currency==='VND'&&t.amountMinor!==null).sort((a,b)=>a.amountMinor!-b.amountMinor!);const t=tariffs[0];return t?{currency:t.currency,amountMinor:t.amountMinor,basis:'from',unit:null,priceStatus:t.status}:null;}
