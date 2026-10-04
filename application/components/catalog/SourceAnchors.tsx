import {getExportedPage} from '@/lib/exported-content';
export function SourceAnchors({path}:{path:string}){const page=getExportedPage(path);return <>{page?.anchors.filter(id=>id!=='request').map(id=><span key={id} id={id} aria-hidden="true"/>)}</>;}
