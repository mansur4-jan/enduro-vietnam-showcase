import {PublicChrome} from '@/components/shared/PublicChrome';
import { SafeLink as Link } from '@/components/SafeLink';
import type { ExportedPage as Page, Inline } from '@/lib/exported-content';
import { pageIndex } from '@/lib/exported-content';
function InlineContent({ nodes }: { nodes: Inline[] }) {
  return nodes.map((node, i) => {
    const children = node.children ? <InlineContent nodes={node.children}/> : null;
    switch (node.type) {
      case 'text': return <span key={i}>{node.text}</span>;
      case 'break': return <br key={i}/>;
      case 'strong': return <strong key={i}>{children}</strong>;
      case 'em': return <em key={i}>{children}</em>;
      case 's': return <s key={i}>{children}</s>;
      case 'u': return <u key={i}>{children}</u>;
      case 'link': return node.href ? <Link prefetch={false} key={i} href={node.href}>{children}</Link> : <span key={i} title={node.originalHref}>{children}</span>;
      default: return <span key={i}>{children}</span>;
    }
  });
}
export function ExportedContentPage({ page }: { page: Page }) {
  const ru = page.language === 'ru';
  const counterpart = ru ? page.route.replace(/^\/ru\/?/, '/') : '/ru' + (page.route === '/' ? '' : page.route);
  const other = pageIndex.some(item => item.route === counterpart);
  const blockIds = new Set(page.blocks.flatMap(block => block.id ? [block.id] : []));
  const uniqueLinks = Array.from(new Map(page.links.filter(link => link.href).map(link => [link.href, link])).values());
  return <PublicChrome locale={ru?'ru':'en'} alternate={other?counterpart:undefined}><div className="export_page" lang={page.language}>

    <main className="export_article">
      {!page.blocks.some(block => block.type === 'h1') && <h1>{page.title}</h1>}
      {page.anchors.filter(id => !blockIds.has(id)).map(id => <span key={id} id={id}/>)}
      {page.blocks.map((block, i) => {
        const content = <InlineContent nodes={block.children}/>;
        switch (block.type) {
          case 'h1': return <h1 key={i} id={block.id || undefined}>{content}</h1>;
          case 'h2': return <h2 key={i} id={block.id || undefined}>{content}</h2>;
          case 'h3': return <h3 key={i} id={block.id || undefined}>{content}</h3>;
          case 'h4': return <h4 key={i} id={block.id || undefined}>{content}</h4>;
          case 'h5': return <h5 key={i} id={block.id || undefined}>{content}</h5>;
          case 'h6': return <h6 key={i} id={block.id || undefined}>{content}</h6>;
          case 'blockquote': return <blockquote key={i} id={block.id || undefined}>{content}</blockquote>;
          default: return <p key={i} id={block.id || undefined}>{content}</p>;
        }
      })}
      {page.images.length > 0 && <section className="export_gallery" aria-label={ru ? 'Фотографии' : 'Photos'}>{page.images.map(image => <img key={image.src} src={image.src} alt={image.alt} loading="lazy"/>)}</section>}
      {uniqueLinks.length > 0 && <nav className="export_links" aria-label={ru ? 'Ссылки страницы' : 'Page links'}><h2>{ru ? 'Ссылки' : 'Links'}</h2><ul>{uniqueLinks.map(link => <li key={link.href}><Link prefetch={false} href={link.href!}>{link.text || link.href}</Link></li>)}</ul></nav>}
    </main>
  </div></PublicChrome>;
}
