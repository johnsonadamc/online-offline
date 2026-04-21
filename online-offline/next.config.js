/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cbdiujvqpirrvzodfujm.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [];
  },
}

module.exports = nextConfig;