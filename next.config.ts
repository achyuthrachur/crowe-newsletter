import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_PERSONALIZATION_ENABLED: process.env.PERSONALIZATION_ENABLED || 'false',
    NEXT_PUBLIC_FEEDBACK_ENABLED: process.env.FEEDBACK_ENABLED || 'false',
  },
  // Prevent Turbopack from trying to bundle Node.js-only packages
  serverExternalPackages: [
    'resend',
    'mailparser',
    'html-to-text',
    'htmlparser2',
    'domutils',
    'domhandler',
    'domelementtype',
    'iconv-lite',
    '@zone-eu/mailsplit',
    'node-forky',
    'safer-buffer',
    'source-map-js',
    'source-map',
    'postcss',
    'cheerio',
    'parse5',
    'parse5-htmlparser2-tree-adapter',
    'entities',
  ],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
