import {readFileSync} from 'node:fs';
import type { Metadata } from "next";
import {headers} from 'next/headers';
import pages from "@/content/pages.json";
const home = pages.find(page => page.route === "/")!;
import "./globals.css";
import { AgentationProvider } from "@/components/AgentationProvider";
export const metadata: Metadata = {metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://enduro-vietnam.com'),title:home.title,description:home.description,alternates:{canonical:'/'}};
export default async function RootLayout({children}:Readonly<{children:React.ReactNode}>){const locale=(await headers()).get('x-enduro-locale')==='ru'?'ru':'en';return <html lang={locale}><body>{children}<style dangerouslySetInnerHTML={{__html:readFileSync('content/shared/theme.css','utf8')}}/><AgentationProvider/></body></html>}
