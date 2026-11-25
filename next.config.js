/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['unpdf'],
  experimental: {
    serverActions: {
      bodySizeLimit: '4.3mb',
    },
  },
}

module.exports = nextConfig
