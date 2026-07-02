/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.leadongcdn.com', // 保持对旧站图片的兼容性
      },
    ],
  },
};

export default nextConfig;
