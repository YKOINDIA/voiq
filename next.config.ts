import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"]
  },
  experimental: {
    optimizePackageImports: ["@supabase/ssr", "@supabase/supabase-js"]
  }
};

export default nextConfig;
