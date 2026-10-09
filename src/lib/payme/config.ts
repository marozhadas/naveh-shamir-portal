import "server-only";

/**
 * PayMe configuration — read ONLY from server environment variables (set in Vercel → Project →
 * Settings → Environment Variables; never committed, never prefixed NEXT_PUBLIC_, so none of it can
 * reach a client bundle):
 *
 *   PAYME_ENV                  "sandbox" | "live"   — which PayMe environment (API base URL + hosted-fields mode)
 *   PAYME_SELLER_ID            Seller ID — seller_payme_id (the MPL… id of the seller account). Server-only.
 *   PAYME_SECRET_KEY           the seller's Secret Key (PayMe's "seller_payme_secret"). Server-only, NEVER sent to the
 *                              browser. (This account has no Partner Key / payme_client_key — that one is for
 *                              marketplace platforms — so the code no longer uses or requires it.)
 *   PAYME_HOSTED_FIELDS_KEY    the seller's Public Key (PayMe's "seller_public_key" / JSAPI key) that Hosted Fields is
 *                              initialised with. PayMe designs it to run in the browser, so it is the one value that
 *                              may reach the client: handed only to the authenticated owner's payment-method form
 *                              at request time (a server prop), never bundled, never NEXT_PUBLIC_.
 *   PAYME_WEBHOOK_SECRET       a long random string (≥ 32 chars) that is embedded in the callback URL we give
 *                              PayMe; only callers that know it are accepted
 *
 * The integration is OFF until every variable is present — the rest of the app keeps working exactly as it
 * did before PayMe (trial without a card, no billing).
 */

export type PayMeEnvironment = "sandbox" | "live";

export type PayMeConfig = {
  env: PayMeEnvironment;
  baseUrl: string;
  sellerId: string;
  secretKey: string;
  hostedFieldsKey: string;
  webhookSecret: string;
};

const BASE_URL: Record<PayMeEnvironment, string> = {
  sandbox: "https://sandbox.payme.io/api",
  live: "https://live.payme.io/api",
};

export const PAYME_ENV_VARIABLE_NAMES = ["PAYME_ENV", "PAYME_SELLER_ID", "PAYME_SECRET_KEY", "PAYME_HOSTED_FIELDS_KEY", "PAYME_WEBHOOK_SECRET"] as const;

const MIN_WEBHOOK_SECRET_LENGTH = 32;

export function getPayMeConfig(): PayMeConfig | null {
  const env = process.env.PAYME_ENV;
  const sellerId = process.env.PAYME_SELLER_ID;
  const secretKey = process.env.PAYME_SECRET_KEY;
  const hostedFieldsKey = process.env.PAYME_HOSTED_FIELDS_KEY;
  const webhookSecret = process.env.PAYME_WEBHOOK_SECRET;

  if (env !== "sandbox" && env !== "live") return null;
  if (!sellerId || !secretKey || !hostedFieldsKey || !webhookSecret) return null;
  if (webhookSecret.length < MIN_WEBHOOK_SECRET_LENGTH) return null;

  return { env, baseUrl: BASE_URL[env], sellerId, secretKey, hostedFieldsKey, webhookSecret };
}

export function isPayMeConfigured(): boolean {
  return getPayMeConfig() !== null;
}

/** The names of the variables that are still missing/invalid — for an admin-side status line (never the values). */
export function getMissingPayMeVariables(): string[] {
  const missing: string[] = [];
  const env = process.env.PAYME_ENV;
  if (env !== "sandbox" && env !== "live") missing.push("PAYME_ENV");
  for (const name of ["PAYME_SELLER_ID", "PAYME_SECRET_KEY", "PAYME_HOSTED_FIELDS_KEY"] as const) {
    if (!process.env[name]) missing.push(name);
  }
  const secret = process.env.PAYME_WEBHOOK_SECRET;
  if (!secret || secret.length < MIN_WEBHOOK_SECRET_LENGTH) missing.push("PAYME_WEBHOOK_SECRET");
  return missing;
}

/** The callback URL handed to PayMe (sub_callback_url) — the secret is the last path segment. */
export function buildPayMeCallbackUrl(origin: string, webhookSecret: string): string {
  return `${origin.replace(/\/+$/, "")}/api/webhooks/payme/${encodeURIComponent(webhookSecret)}`;
}
