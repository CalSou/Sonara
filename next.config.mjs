/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * Tree-shake lucide-react per-module imports so fewer vendor chunks are emitted.
   * Helps avoid stale `.next` manifests pointing at missing `vendor-chunks/lucide-react.js`.
   */
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
