import Link from 'next/link';
import type { ComponentProps } from 'react';
import { localSafeMode } from '@/lib/local-safety';
export function SafeLink(props: ComponentProps<typeof Link>) {
  const href = typeof props.href === 'string' ? props.href : '';
  if (/^https?:\/\/(?:www\.)?(?:facebook\.com|twitter\.com|vk\.com)\/groupname(?:[/?#]|$)/i.test(href)) return <span className={props.className} aria-disabled="true">{props.children}</span>;
  const contact = /^(?:mailto:|tel:|https?:\/\/(?:t\.me|telegram\.me|wa\.me|api\.whatsapp\.com)(?:\/|$))/i.test(href);
  if (localSafeMode && contact) return <span className={props.className} aria-label={props['aria-label']} aria-disabled="true" title="Contact actions are disabled in local mode" data-local-disabled="contact">{props.children}</span>;
  return <Link {...props}/>;
}
