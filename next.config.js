/** @type {import('next').NextConfig} */
  const nextConfig = {
  transpilePackages: ['antd', '@ant-design/icons', '@ant-design/nextjs-registry'],
  experimental: {
    reactCompiler: false,
  },
};
module.exports = nextConfig;

