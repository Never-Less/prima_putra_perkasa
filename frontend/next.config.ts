import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const locatorLoader = fileURLToPath(
  new URL("./loaders/locator-webpack-loader.cjs", import.meta.url)
);

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/purchaseOrder",
        destination: "/salesOrder",
        permanent: false,
      },
      {
        source: "/purchaseOrder/form",
        destination: "/salesOrder/form",
        permanent: false,
      },
      {
        source: "/purchaseOrder/export/:path*",
        destination: "/salesOrder/export/:path*",
        permanent: false,
      },
    ];
  },
  turbopack: {
    rules: {
      "**/*.{tsx,jsx}": {
        loaders: [
          {
            loader: locatorLoader,
            options: { env: "development" },
          },
        ],
      },
    },
  },
};

export default nextConfig;
