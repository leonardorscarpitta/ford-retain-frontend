import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server in .next/standalone for the production image.
  output: "standalone",
  // Don't advertise the framework (X-Powered-By).
  poweredByHeader: false,
  // Sent on every response, static assets included. The CSP is per request,
  // in src/proxy.ts, because it carries a nonce.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
