import type {Locale} from '@/lib/catalog-types';
import {SourceAnchors} from './SourceAnchors';
import {PublicChrome} from '@/components/shared/PublicChrome';
export function CatalogChrome({locale,alternate,children,sourcePath}:{locale:Locale;alternate?:string;sourcePath?:string;children:React.ReactNode}){return <PublicChrome locale={locale} alternate={alternate}><div className="catalog-site">{sourcePath&&<SourceAnchors path={sourcePath}/>} {children}</div></PublicChrome>;}
