import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The album PDF renderer and image resizer ship native/binary code; keep them out of the server bundle.
  serverExternalPackages: ["@react-pdf/renderer", "sharp"],
  // The shared album package (../packages/classping-album, a file: dependency copied into node_modules) ships TypeScript source.
  transpilePackages: ["classping-album"],
};

export default nextConfig;
