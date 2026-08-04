import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // next/image 400s any external src whose host isn't allow-listed here — every Supabase
    // Storage bucket (hero-gallery, business-media, marketplace-media, ...) serves from this
    // one project host, so a single wildcard-pathname entry covers all of them.
    remotePatterns: [{ protocol: "https", hostname: "nzhbwbbxnrcaiubgpjlc.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
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
