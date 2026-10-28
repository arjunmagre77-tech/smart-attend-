import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Prevent firebase-admin from being bundled for the client
  serverExternalPackages: ["firebase-admin"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Exclude node_modules from file watching to prevent
  // Turbopack's "filesystem settling" loop on slow drives
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent node-only modules from reaching the browser bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    // Exclude node_modules from webpack watcher too
    config.watchOptions = {
      ignored: /node_modules/,
      poll: false,
    };
    return config;
  },
};

export default nextConfig;
