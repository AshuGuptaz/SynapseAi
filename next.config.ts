import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep these CJS packages out of the Turbopack bundle so Node.js loads
  // them natively — avoids ESM-interop issues with pdf-parse and xlsx.
  serverExternalPackages: ['pdf-parse', 'mammoth', 'xlsx'],
};

export default nextConfig;
