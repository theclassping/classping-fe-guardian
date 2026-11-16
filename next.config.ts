import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The album PDF renderer and image resizer ship native/binary code; keep them out of the server bundle.
  serverExternalPackages: ["@react-pdf/renderer", "sharp"],
};

export default nextConfig;
