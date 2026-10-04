import type { NextConfig } from "next";
import inventory from './content/routes.json';
import canonicalRedirects from './content/canonical-redirects.json';

const nextConfig: NextConfig = {
  agentRules: false,
  htmlLimitedBots: /.*/,
  outputFileTracingExcludes: {'/*':['./.data/**/*','./.shipstudio/**/*','./docs/**/*']},
  typescript: { tsconfigPath: process.env.MIGRATION_BUILD === '1' ? 'tsconfig.build.json' : 'tsconfig.json' },
  serverExternalPackages: ['pg', 'otpauth', 'sharp'],
  // Keep migration comparisons isolated from Ship Studio's managed preview/build.
  distDir: process.env.MIGRATION_BUILD === '1' ? '.next-build' : process.env.MIGRATION_DEV === '1' ? '.next-migration' : '.next',
  async headers() {
    const safety = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_LOCAL_SAFE_MODE === '1';
    return [
      {source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},...(safety?[{key:'X-Robots-Tag',value:'noindex, nofollow'}]:[])]},
      {source:'/admin/:path*',headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'},{key:'Cache-Control',value:'private, no-store'}]},
      {source:'/api/admin/:path*',headers:[{key:'Cache-Control',value:'private, no-store'}]},
    ];
  },
  async redirects() {
    return [...Object.entries(canonicalRedirects).map(([source,destination])=>({source,destination,permanent:true})),...Object.entries(inventory.routes)
      .filter(([source, record]) => record.target && record.target !== source && !(source in canonicalRedirects))
      .map(([source, record]) => ({ source, destination: record.target!, permanent: true }))];
  },
};

export default nextConfig;
