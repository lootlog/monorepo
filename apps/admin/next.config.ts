/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/admin",
  output: "standalone",
  transpilePackages: ["@lootlog/ui"],
};

export default nextConfig;
