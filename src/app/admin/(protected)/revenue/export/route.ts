import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { loadRevenueData } from "@/lib/admin/revenue-data";
import { revenueSeriesToCsv, subscriptionsToCsv, transactionsToCsv } from "@/lib/admin/revenue-csv";
import {
  computeRevenueSeries,
  filterSubscriptions,
  isPeriodPreset,
  resolvePeriod,
  type Granularity,
  type OfferKey,
  type SubscriptionFilters,
  type SubscriptionStatus,
} from "@/lib/admin/revenue-metrics";

export const dynamic = "force-dynamic";

const GRANULARITY_LABEL: Record<Granularity, string> = { day: "יום", week: "שבוע", month: "חודש" };

/**
 * Admin-only CSV export. Route handlers are NOT covered by the admin layout guard, so the session is checked here
 * explicitly. The CSV builders only see sanitised rows (no card data / tokens / secrets).
 */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const type = params.get("type");
  const presetParam = params.get("period");
  const preset = isPeriodPreset(presetParam) ? presetParam : "30d";
  const period = resolvePeriod(preset, new Date(), params.get("from"), params.get("to"));
  const groupParam = params.get("group");
  const granularity: Granularity = groupParam === "week" || groupParam === "month" ? groupParam : "day";

  const data = await loadRevenueData();

  let body: string;
  if (type === "transactions") {
    const inRange = data.transactions.filter((t) => {
      const at = new Date(t.occurredAt).getTime();
      return at >= period.from.getTime() && at < period.to.getTime();
    });
    body = transactionsToCsv(inRange);
  } else if (type === "subscriptions") {
    const filters: SubscriptionFilters = {};
    const plan = params.get("plan");
    if (plan === "plus" || plan === "premium") filters.plan = plan;
    const offer = params.get("offer");
    if (offer === "standard" || offer === "pilot") filters.offer = offer as OfferKey;
    const interval = params.get("interval");
    if (interval === "monthly" || interval === "yearly") filters.interval = interval;
    const status = params.get("status");
    if (status) filters.status = status as SubscriptionStatus;
    body = subscriptionsToCsv(filterSubscriptions(data.subscriptions, filters));
  } else if (type === "revenue") {
    body = revenueSeriesToCsv(computeRevenueSeries(data.transactions, period, granularity), GRANULARITY_LABEL[granularity]);
  } else {
    return new NextResponse("Unknown export type", { status: 400 });
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="naveh-shamir-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
