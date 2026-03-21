import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  images: { unoptimized: true },
  transpilePackages: ["@lootlog/ui"],
  typescript: { ignoreBuildErrors: true },
};

export default withMDX(config);
