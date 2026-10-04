import fs from 'node:fs';
import path from 'node:path';
import { cache } from 'react';
import index from '@/content/page-index.json';
export type Inline = { type: string; text?: string; href?: string | null; originalHref?: string; children?: Inline[] };
export type ExportedPage = {
  route: string; title: string; description: string; language: string;
  blocks: { type: string; id?: string | null; children: Inline[] }[];
  links: { text: string; href: string | null; originalHref: string; kind: string }[];
  images: { src: string; alt: string }[];
  anchors: string[];
};
export const pageIndex = index;
export const getExportedPage = cache((route: string): ExportedPage | null => {
  const entry = index.find(page => page.route === route);
  return entry ? JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content/exported-pages', path.basename(entry.file)), 'utf8')) : null;
});
