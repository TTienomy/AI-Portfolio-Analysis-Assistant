import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },

  basePath: isProd ? "/AI-Portfolio-Analysis-Assistant" : "",
  assetPrefix: isProd ? "/AI-Portfolio-Analysis-Assistant/" : "",
};

export default nextConfig;
