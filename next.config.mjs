/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 图片域名白名单（CDN 图片）
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mwstats.info',
      },
      {
        protocol: 'https',
        hostname: '*.aliyuncs.com',
      },
    ],
  },

  // 允许 public 文件夹中的静态资源
  async rewrites() {
    return []
  },

  // 环境变量
  env: {
    NEXT_PUBLIC_CDN_BASE_URL: process.env.NEXT_PUBLIC_CDN_BASE_URL || '',
  },
}

export default nextConfig
