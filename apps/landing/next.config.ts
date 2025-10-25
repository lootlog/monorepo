/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@lootlog/ui"],
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
