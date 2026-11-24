import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(here, "../.."),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${backendUrl}/api/auth/:path*`,
      },
      {
        source: "/api/playlists/:path*",
        destination: `${backendUrl}/api/playlists/:path*`,
      },
      {
        source: "/api/likes/:path*",
        destination: `${backendUrl}/api/likes/:path*`,
      },
      {
        source: "/api/history/:path*",
        destination: `${backendUrl}/api/history/:path*`,
      },
      {
        source: "/api/lyrics/:path*",
        destination: `${backendUrl}/api/lyrics/:path*`,
      },
      {
        source: "/api/import/:path*",
        destination: `${backendUrl}/api/import/:path*`,
      },
    ];
  },
};

export default nextConfig;
