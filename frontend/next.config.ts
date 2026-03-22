/**
 * @file next.config.ts
 * @description Next.js configuration.
 *              Proxies /api/* requests to the Express backend at localhost:3000
 *              to avoid CORS issues during development.
 */
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* Proxy API requests to the Express backend in development */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3000/api/:path*",
      },
    ];
  },
  /* Set the turbopack root to this directory (avoids picking up parent lockfiles) */
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
