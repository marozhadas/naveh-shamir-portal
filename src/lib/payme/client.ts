import "server-only";
import { getPayMeConfig, type PayMeConfig } from "./config";
import { redactSecrets } from "./payme-helpers";

/**
 * Thin server-side client for the PayMe endpoints the integration needs (docs.payme.io):
 *   POST {base}/generate-subscription   — create the recurring subscription, charged with the buyer token
 *   POST {base}/cancel-subscription     — cancel it
 *
 * There is deliberately NO call that reads a subscription back: get-subscriptions is not available to Seller accounts
 * (PayMe confirmed). Subscription updates arrive only as callbacks to sub_callback_url — see process-callback.ts.
 *
 * Authentication: for a Seller account PayMe identifies the seller by seller_payme_id in the request body, and nothing
 * else — no Partner Key (payme_client_key) and no seller Secret Key (PayMe confirmed neither is used for Subscriptions).
 *
 * Secrets stay in this module: request bodies and PayMe's error text are never logged raw, and every
 * error that leaves here is passed through redactSecrets() first.
 */

export class PayMeError extends Error {
  constructor(
    message: string,
    readonly kind: "not-configured" | "network" | "rejected" | "invalid-response",
  ) {
    super(message);
    this.name = "PayMeError";
  }
}

function secretsOf(config: PayMeConfig, extra: string[] = []): string[] {
  return [config.sellerId, config.hostedFieldsKey, config.webhookSecret, ...extra];
}

async function post<T>(config: PayMeConfig, path: string, body: Record<string, unknown>, extraSecrets: string[] = []): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new PayMeError(redactSecrets(`PayMe request failed (${path}): ${error instanceof Error ? error.message : "unknown"}`, secretsOf(config, extraSecrets)), "network");
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new PayMeError(`PayMe returned a non-JSON response (${path}, HTTP ${response.status})`, "invalid-response");
  }

  const payload = json as { status_code?: number | string; status_error_details?: string; status_error_code?: number | string };
  const statusCode = Number(payload.status_code);
  if (!response.ok || statusCode !== 0) {
    const detail = redactSecrets(String(payload.status_error_details ?? payload.status_error_code ?? `HTTP ${response.status}`), secretsOf(config, extraSecrets)).slice(0, 200);
    throw new PayMeError(`PayMe rejected ${path}: ${detail}`, "rejected");
  }
  return json as T;
}

export type GeneratePayMeSubscriptionInput = {
  /** Reusable buyer token (buyer_key) obtained through Hosted Fields. */
  buyerKey: string;
  /** Merchant-side unique id (our business registration id), PayMe echoes it back as subscription_id. */
  merchantSubscriptionId: string;
  priceAgorot: number;
  /** 3 monthly / 4 yearly. */
  iterationType: 3 | 4;
  /** "dd/mm/yyyy hh:mm" — when the first charge happens (the trial end). */
  startDate: string;
  description: string;
  callbackUrl: string;
};

export type GeneratedPayMeSubscription = {
  subPaymeId: string;
  /** PayMe's own next payment date, if it reports one. */
  nextDate: string | null;
};

export async function generatePayMeSubscription(input: GeneratePayMeSubscriptionInput): Promise<GeneratedPayMeSubscription> {
  const config = getPayMeConfig();
  if (!config) throw new PayMeError("PayMe is not configured", "not-configured");

  const result = await post<{ sub_payme_id?: string; sub_next_date?: string | null }>(
    config,
    "generate-subscription",
    {
      seller_payme_id: config.sellerId,
      sub_currency: "ILS",
      sub_price: input.priceAgorot,
      sub_description: input.description,
      sub_iteration_type: input.iterationType,
      sub_iterations: -1,
      sub_start_date: input.startDate,
      sub_payment_method: "credit-card",
      sub_type: 1,
      buyer_key: input.buyerKey,
      subscription_id: input.merchantSubscriptionId,
      sub_callback_url: input.callbackUrl,
      language: "he",
    },
    [input.buyerKey],
  );

  if (!result.sub_payme_id) throw new PayMeError("PayMe did not return a subscription id", "invalid-response");
  return { subPaymeId: result.sub_payme_id, nextDate: result.sub_next_date ?? null };
}

export async function cancelPayMeSubscription(subPaymeId: string): Promise<void> {
  const config = getPayMeConfig();
  if (!config) throw new PayMeError("PayMe is not configured", "not-configured");
  await post(config, "cancel-subscription", { seller_payme_id: config.sellerId, sub_payme_id: subPaymeId, language: "he" });
}

export function parsePayMeDateTime(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  // PayMe returns ISO-like "YYYY-MM-DD HH:mm:ss" (Israel time) — interpret as Asia/Jerusalem wall-clock.
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value);
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const [, y, mo, d, h, mi, s] = match.map(Number);
  // Treat as UTC-then-correct: find the offset Jerusalem has at that instant.
  const asUtc = Date.UTC(y, mo - 1, d, h, mi, s);
  const offsetMinutes = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", timeZoneName: "shortOffset" })
    .formatToParts(new Date(asUtc))
    .find((part) => part.type === "timeZoneName")?.value.match(/GMT([+-]\d+)/)?.[1];
  const offsetHours = offsetMinutes ? Number(offsetMinutes) : 2;
  return new Date(asUtc - offsetHours * 60 * 60 * 1000);
}
