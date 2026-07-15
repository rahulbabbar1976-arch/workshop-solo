import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=(self)',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  // @ts-ignore - Bypass TS definition if not updated in Next 16 type definitions
  allowedDevOrigins: [
    '7cb816abc5faacb2-122-162-144-110.serveousercontent.com',
    'workshopagy1234.loca.lt',
    'bbd1bbc2c56f43dc-122-162-144-110.serveousercontent.com',
    'nine-melons-write.loca.lt',
    'd97c77c8447e77c4-122-162-144-110.serveousercontent.com',
    'f097f66f4012ae32-122-162-144-110.serveousercontent.com',
    '192.168.1.183',
    'localhost'
  ],
  serverExternalPackages: ['tesseract.js', 'sharp'],

  async headers() {
    return [
      {
        // Apply security headers to every route
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
