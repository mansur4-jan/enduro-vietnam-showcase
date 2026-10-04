import type {Metadata} from 'next';
import {CatalogHome} from '@/components/catalog/CatalogHome';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Tours, activities & rentals in Vietnam | Enduro Vietnam',description:'Explore motorcycle tours and rentals in Vietnam. Choose your destination and request dates and terms.',alternates:{canonical:'/',languages:{en:'/',ru:'/ru'}}};
export default function Home(){return <CatalogHome locale="en"/>;}
