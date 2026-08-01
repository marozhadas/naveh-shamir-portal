import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Stale/placeholder paths from earlier phases that were never real pages — the real
      // registration form has always been (and stays) at /business/register.
      { source: "/business/new", destination: "/business/register", permanent: true },
      { source: "/business/add-listing", destination: "/business/register", permanent: true },
      { source: "/add-listing", destination: "/business/register", permanent: true },
    ];
  },
};

export default nextConfig;
