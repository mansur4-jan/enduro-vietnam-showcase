import Link from 'next/link';
import {PublicChrome} from '@/components/shared/PublicChrome';
export default function NotFound() {
  return <PublicChrome locale="ru"><main className="export_article" lang="ru"><h1>Страница не найдена</h1><p>Такого адреса нет среди доступных страниц.</p><Link prefetch={false} href="/site-map">Открыть список всех страниц</Link></main></PublicChrome>;
}
