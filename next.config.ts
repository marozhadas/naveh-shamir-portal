import type { NextConfig } from "next";
import { SITE_CONFIG } from "./src/data/config";
import { buildLegacyHostRedirects } from "./src/lib/seo/legacy-host-redirect";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Next's own default is 1MB, well under a modern phone camera JPEG (routinely 3-10MB) —
      // uploadMarketplaceImageAction/uploadBusinessMediaAction (each capped separately at 5MB of
      // real content) never even got a chance to run their own size check; the request was
      // rejected at this transport layer first. 6MB leaves headroom above that 5MB content cap
      // for multipart boundary/header overhead (see the Server Actions docs on bodySizeLimit).
      bodySizeLimit: "6mb",
    },
  },
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
      // naveh-shamir-portal.vercel.app (the exact production Vercel host — never *.vercel.app, so previews keep working)
      // → the official domain, 308, path and query kept. See src/lib/seo/legacy-host-redirect.ts.
      ...buildLegacyHostRedirects(SITE_CONFIG.siteUrl),
    ];
  },
};

export default nextConfig;
