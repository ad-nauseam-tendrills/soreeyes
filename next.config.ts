import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the droplet (see DEPLOY.md).
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["pdf-lib"],
  experimental: {
    serverActions: { bodySizeLimit: "8mb" }, // optional attempt photos
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
