import Link from 'next/link';
import {PublicChrome} from '@/components/shared/PublicChrome';
import type { Metadata } from 'next';
import { pageIndex } from '@/lib/exported-content';
export const metadata: Metadata = { title: 'Все страницы — Enduro Vietnam', robots: { index: false, follow: true } };
export default function SiteMap() {
  return <PublicChrome locale="ru"><main className="export_article" lang="ru"><Link prefetch={false} href="/">Enduro Vietnam</Link><h1>Все страницы</h1>{['en','ru'].map(language => <section key={language}><h2>{language === 'ru' ? 'Русский' : 'English'}</h2><ul className="export_index">{pageIndex.filter(page => page.language === language).map(page => <li key={page.route}><Link prefetch={false} href={page.route}>{page.title}</Link><small>{page.route}</small></li>)}</ul></section>)}</main></PublicChrome>;
}
