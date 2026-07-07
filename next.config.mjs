/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // better-sqlite3 là native addon — giữ nguyên ở runtime Node, không bundle vào server build.
  experimental: {
    // Native / dynamic-require packages: giữ ở runtime Node, không bundle.
    serverComponentsExternalPackages: ["better-sqlite3", "pdf-parse", "mammoth", "@anthropic-ai/sdk", "@google/generative-ai"],
  },
};

export default nextConfig;
