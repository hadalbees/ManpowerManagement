const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  outputFileTracingRoot: path.join(__dirname),

  eslint: {
    ignoreDuringBuilds: true,
  },

  env: {
    NEXT_PUBLIC_API_URL:
      'https://manpowermanagement-api.hadalbees.workers.dev/api/v1',
  },
};

module.exports = nextConfig;