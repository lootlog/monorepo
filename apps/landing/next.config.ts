import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@lootlog/ui"],
  output: "export",
  images: {
    unoptimized: true,
  },
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
