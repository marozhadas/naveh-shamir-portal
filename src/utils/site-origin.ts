/** Absolute site origin for building links inside emails — Vercel sets VERCEL_PROJECT_PRODUCTION_URL/VERCEL_URL automatically. */
export function getSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:3000";
}
