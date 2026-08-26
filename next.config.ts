import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "mysql2"],
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
