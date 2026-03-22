/**
 * @file next.config.ts
 * @description Next.js configuration.
 *              Proxies /api/* requests to the Express backend at localhost:3000
 *              so the frontend can call /api/auth/login etc. without CORS issues.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Proxy API requests to the Express backend running on port 3000 */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
