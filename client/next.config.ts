import type { NextConfig } from "next";

// Use Next's compiled webpack to avoid needing `webpack` as a direct dependency.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpack = require("next/dist/compiled/webpack/webpack");

type NextConfigWithExtras = NextConfig & {
  eslint?: { ignoreDuringBuilds?: boolean };
  typescript?: { ignoreBuildErrors?: boolean };
  turbopack?: Record<string, unknown>;
  webpack?: (...args: any[]) => any;
};

const nextConfig: NextConfigWithExtras = {
  // Output configuration for Vercel
  output: "standalone",
  
  // Disable eslint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript errors during builds (optional - remove if you want strict checking)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Add empty turbopack config to acknowledge we're using webpack
  turbopack: {},
  
  // Use webpack instead of Turbopack for builds to avoid issues with thread-stream test files
  webpack: (config, { isServer }) => {
    // Ignore test files and other non-production files from thread-stream
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream[\\/]test/,
      })
    );
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream[\\/]bench/,
      })
    );
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /\.(md|txt|sh|zip|LICENSE)$/,
        contextRegExp: /thread-stream/,
      })
    );
    
    // Ignore server-side only packages on client
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        os: false,
      };

      // Prevent circular runtime chunks between CoFHE + TFHE WASM in dev.
      config.optimization = config.optimization || {};
      const existingCacheGroups = config.optimization.splitChunks?.cacheGroups ?? {};
      config.optimization.splitChunks = {
        ...(config.optimization.splitChunks ?? {}),
        cacheGroups: {
          ...existingCacheGroups,
          cofheTfhe: {
            test: /[\\/]node_modules[\\/](?:@cofhe|cofhejs|tfhe)[\\/]/,
            name: "cofhe-tfhe",
            chunks: "all",
            priority: 30,
            enforce: true,
          },
        },
      };
    }
    
    return config;
  },
};

export default nextConfig;
