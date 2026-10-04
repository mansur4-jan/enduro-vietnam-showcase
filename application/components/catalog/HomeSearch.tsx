'use client';
import {useState} from 'react';
import type {Locale} from '@/lib/catalog-types';

export function HomeSearch({locale,destinations}:{locale:Locale;destinations:{id:string;names:Record<Locale,string>}[]}){
 const [section,setSection]=useState('tours'),ru=locale==='ru',p=ru?'/ru':'';
 return <form action={`${p}/${section==='rentals'?'rentals/motorbikes':'all-tours'}`} className="home-search">
  <label>{ru?'Куда отправимся?':'Where to?'}<select name="city"><option value="">{ru?'Все города':'All destinations'}</option>{destinations.map(c=><option key={c.id} value={c.id}>{c.names[locale]}</option>)}</select></label>
  <label>{ru?'Что ищете?':'What are you looking for?'}<select value={section} onChange={e=>setSection(e.target.value)}><option value="tours">{ru?'Туры и активности':'Tours & activities'}</option><option value="rentals">{ru?'Аренда мотоцикла или скутера':'Motorbike & scooter rentals'}</option></select></label>
  <button>{section==='rentals'?(ru?'Подобрать технику':'Find a rental'):(ru?'Найти тур':'Find a tour')}</button>
 </form>;
}
