/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
},
  images: {
    domains: ['a.espncdn.com',
              'static.www.nfl.com'],
  },
}

module.exports = nextConfig
