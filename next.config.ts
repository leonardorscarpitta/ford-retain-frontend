import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server in .next/standalone for the production image.
  output: "standalone",
};

export default nextConfig;
