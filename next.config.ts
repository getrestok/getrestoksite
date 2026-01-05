import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "internal.getrestok.com",
          },
        ],
        destination: "/internal/:path*",
      },
    ];
  },
};

export default nextConfig;