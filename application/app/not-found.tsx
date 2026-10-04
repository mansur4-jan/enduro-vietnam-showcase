import Link from 'next/link';
export default function NotFound() {
  return <main className="export_article" lang="ru"><h1>Страница не найдена</h1><p>Такого адреса нет среди доступных страниц.</p><Link prefetch={false} href="/site-map">Открыть список всех страниц</Link></main>;
}
