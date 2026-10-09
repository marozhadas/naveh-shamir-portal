import { NextResponse } from "next/server";
import { getPayMeConfig } from "@/lib/payme/config";
import { constantTimeEquals } from "@/lib/payme/payme-helpers";
import { processPayMeCallback } from "@/lib/payme/process-callback";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 20_000;

type RouteContext = { params: Promise<{ secret: string }> };

/**
 * PayMe subscription callbacks (sub_callback_url → POST, application/x-www-form-urlencoded).
 *
 * Authentication (the model PayMe confirmed for Seller accounts): subscription callbacks carry no signature and
 * there is no endpoint to read a subscription back, so step one is the URL itself — PAYME_WEBHOOK_SECRET is the
 * last path segment of the callback URL we gave PayMe and is compared in constant time. A wrong/missing secret
 * gets a plain 404 (it must look like the route does not exist) and the body is never read. The remaining checks
 * (our seller id, a subscription id we stored, idempotency) are in processPayMeCallback / verify-callback.ts.
 */
export async function POST(request: Request, { params }: RouteContext): Promise<Response> {
  const config = getPayMeConfig();
  if (!config) return new NextResponse(null, { status: 404 });

  const { secret } = await params;
  let provided = secret;
  try {
    provided = decodeURIComponent(secret);
  } catch {
    // keep the raw value — it will simply not match
  }
  if (!constantTimeEquals(provided, config.webhookSecret)) return new NextResponse(null, { status: 404 });

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

  const result = await processPayMeCallback(body);
  return NextResponse.json({ ok: result.httpStatus === 200, outcome: result.outcome }, { status: result.httpStatus });
}

// Only POST is accepted.
export function GET(): Response {
  return new NextResponse(null, { status: 404 });
}
