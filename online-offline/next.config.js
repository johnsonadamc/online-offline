/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['cbdiujvqpirrvzodfujm.supabase.co'],
    // You may also want to include any other domains your app uses for images
  },
  async redirects() {
    return [];
  },
}

module.exports = nextConfig;