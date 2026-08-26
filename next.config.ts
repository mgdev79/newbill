import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "mysql2", "ssh2"],
  webpack: (config, { nextRuntime, webpack }) => {
    // middleware.ts forces an Edge compile of instrumentation.ts. Stub the Node-only
    // scheduler entry so webpack does not follow Prisma/mysql2/ssh2 into Edge.
    if (nextRuntime === "edge") {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /instrumentation\.node/,
        }),
      );
      const stub = path.join(rootDir, "src/instrumentation.node");
      const extra: Record<string, false> = {
        [stub]: false,
        [`${stub}.ts`]: false,
        "./instrumentation.node": false,
        "./instrumentation.node.ts": false,
        ssh2: false,
      };
      const alias = config.resolve.alias;
      config.resolve.alias = Array.isArray(alias) ? [...alias, extra] : { ...alias, ...extra };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/billing/duitku-checkout.php",
        destination: "/api/v1/payments/duitku/callback",
      },
      {
        source: "/billing/xendit-checkout.php",
        destination: "/api/v1/payments/xendit/callback",
      },
      {
        source: "/billing/midtrans-checkout.php",
        destination: "/api/v1/payments/midtrans/callback",
      },
      {
        source: "/billing/nicepay-checkout.php",
        destination: "/api/v1/payments/nicepay/callback",
      },
    ];
  },
};

export default nextConfig;
