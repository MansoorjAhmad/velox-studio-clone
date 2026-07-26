import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Turbopack this folder is the workspace root — avoids the
  // "multiple lockfiles detected" warning from the old pnpm-lock.yaml
  // sitting in the parent ZCodeProject/ directory.
  turbopack: {
    root: __dirname,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
