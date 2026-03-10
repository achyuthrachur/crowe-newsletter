import nextConfig from 'eslint-config-next';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'newsletter/**',
      'node_modules/**',
      'scripts/**',
      'prisma/seed.ts',
      'vitest.config.ts',
    ],
  },
  ...(Array.isArray(nextConfig) ? nextConfig : [nextConfig]),
  ...(Array.isArray(nextCoreWebVitals) ? nextCoreWebVitals : [nextCoreWebVitals]),
];

export default eslintConfig;
