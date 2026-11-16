import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The album PDF renderer and image resizer ship native/binary code; keep them out of the server bundle.
  serverExternalPackages: ["@react-pdf/renderer", "sharp"],
  // pdfkit loads its standard fonts through "#standard-fonts/*" subpath imports, which output tracing cannot follow;
  // without these files the album route fails on Vercel with "Cannot find module .../standard-fonts/Helvetica.cjs".
  outputFileTracingIncludes: {
    "/api/album/*": ["./node_modules/pdfkit/js/standard-fonts/**/*", "./node_modules/pdfkit/js/data/**/*"],
  },
};

export default nextConfig;
