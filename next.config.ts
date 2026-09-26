import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Every page here is force-dynamic, and for dynamic routes Next leaves
    // the client cache off by default (staleTimes.dynamic = 0). That meant
    // even tapping back to a tab you were just on paid a full server
    // round-trip. Caching page segments briefly makes repeat navigation
    // instant. Mutations stay correct because every server action calls
    // revalidatePath, which clears these entries.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
