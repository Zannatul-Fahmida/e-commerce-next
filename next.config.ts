/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let remoteHost = 'supabase.co';
let remoteProtocol = 'https';

try {
  if (supabaseUrl) {
    const u = new URL(supabaseUrl);
    remoteHost = u.hostname || remoteHost;
    remoteProtocol = (u.protocol || 'https:').replace(':', '');
  }
} catch {}

const nextConfig = {
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: true,
  images: {
    remotePatterns: [
      {
        protocol: remoteProtocol,
        hostname: remoteHost,
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;
