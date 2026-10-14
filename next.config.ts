import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const projectRoot = dirname(fileURLToPath(import.meta.url));
const config: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
  outputFileTracingIncludes: {
    "/api/admin/content/coverage": [
      "./content/lessons/**/*.json",
      "./content/factory/candidates/*.jsonl",
    ],
    "/api/admin/content/draft": ["./content/lessons/**/*.json"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "microphone=(self), camera=(), geolocation=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
