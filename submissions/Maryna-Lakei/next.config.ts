import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Playwright opens the dev server at 127.0.0.1. Next allows localhost only
  // unless this host is listed, and blocked dev assets never hydrate the form.
  allowedDevOrigins: ["127.0.0.1"],
  // A lockfile in the capstone parent would otherwise become the Turbopack root.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
