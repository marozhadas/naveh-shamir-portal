import type { Metadata } from "next";
import Link from "next/link";
import { getMissingPayMeVariables, isPayMeConfigured } from "@/lib/payme/config";
import { loadRevenueData } from "@/lib/admin/revenue-data";
import {
  PERIOD_PRESETS,
  SUBSCRIPTION_STATUS_HE,
  TRANSACTION_KIND_HE,
  TRANSACTION_STATUS_HE,
  computeAttention,
  computeKpis,
  computePilotSummary,
  computeRevenueBreakdown,
  computeRevenueSeries,
  computeSummaryMetrics,
  computeTrialSplit,
  daysLeft,
  filterSubscriptions,
  formatAgorotAsIls,
  isPeriodPreset,
  offerOf,
  resolvePeriod,
  type ConversionStats,
  type Granularity,
  type OfferKey,
  type RevenueSubscription,
  type SubscriptionFilters,
  type SubscriptionStatus,
} from "@/lib/admin/revenue-metrics";
import { RevenueChart } from "./RevenueChart";
import styles from "./revenue.module.css";

export const metadata: Metadata = { title: "הכנסות וסליקה | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TABS = [
  { id: "overview", label: "סיכום" },
  { id: "attention", label: "דורש טיפול" },
  { id: "transactions", label: "עסקאות" },
  { id: "subscriptions", label: "מנויים" },
  { id: "trials", label: "תקופות ניסיון" },
  { id: "cancellations", label: "ביטולים" },
  { id: "events", label: "אירועי סליקה" },
  { id: "audit", label: "יומן פעולות" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const PAYME_EMPTY = "נתוני סליקה יופיעו כאן לאחר חיבור PayMe.";
const NOT_ENOUGH_DATA = "אין עדיין מספיק נתונים";

type SearchParams = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "numeric", year: "numeric" }).format(new Date(iso));
}
function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
const planLabel = (plan: string | null) => (plan === "plus" ? "Plus" : plan === "premium" ? "Premium" : "—");
const intervalLabel = (interval: string | null) => (interval === "monthly" ? "חודשי" : interval === "yearly" ? "שנתי" : "—");
const ils = (value: number | null) => (value === null ? "—" : `${value} ₪`);

function conversionText(stats: ConversionStats): string {
  return stats.rate === null ? NOT_ENOUGH_DATA : `${stats.rate}% (${stats.converted} מתוך ${stats.endedInPeriod})`;
}

export default async function AdminRevenuePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const now = new Date();

  const tab: TabId = (TABS.find((t) => t.id === one(params.tab))?.id ?? "overview") as TabId;
  const presetParam = one(params.period);
  const preset = isPeriodPreset(presetParam) ? presetParam : "30d";
  const from = one(params.from) ?? "";
  const to = one(params.to) ?? "";
  const period = resolvePeriod(preset, now, from, to);
  const granularity: Granularity = ["day", "week", "month"].includes(one(params.group) ?? "") ? (one(params.group) as Granularity) : "day";

  const filters: SubscriptionFilters = {};
  const planParam = one(params.plan);
  if (planParam === "plus" || planParam === "premium") filters.plan = planParam;
  const offerParam = one(params.offer);
  if (offerParam === "standard" || offerParam === "pilot") filters.offer = offerParam as OfferKey;
  const intervalParam = one(params.interval);
  if (intervalParam === "monthly" || intervalParam === "yearly") filters.interval = intervalParam;
  const statusParam = one(params.status);
  const STATUSES = Object.keys(SUBSCRIPTION_STATUS_HE) as SubscriptionStatus[];
  if (STATUSES.includes(statusParam as SubscriptionStatus)) filters.status = statusParam as SubscriptionStatus;

  const data = await loadRevenueData();
  const attention = computeAttention({ subscriptions: data.subscriptions, billingEvents: data.billingEvents, now });
  const kpis = computeKpis({ subscriptions: data.subscriptions, transactions: data.transactions, attentionCount: attention.length, period });
  const summary = computeSummaryMetrics({ subscriptions: data.subscriptions, transactions: data.transactions, businessEvents: data.businessEvents, period });
  const pilot = computePilotSummary(data.subscriptions, data.transactions, data.pilotBusinessCount, now);
  const series = computeRevenueSeries(data.transactions, period, granularity);
  const byPlan = computeRevenueBreakdown(data.transactions, period, "plan");
  const byInterval = computeRevenueBreakdown(data.transactions, period, "interval");
  const payMeReady = isPayMeConfigured();
  const missingVars = payMeReady ? [] : getMissingPayMeVariables();

  const periodQuery = new URLSearchParams({ period: preset, ...(preset === "custom" ? { from, to } : {}), group: granularity });
  const tabHref = (id: TabId, extra: Record<string, string> = {}) => {
    const q = new URLSearchParams(periodQuery);
    q.set("tab", id);
    for (const [k, v] of Object.entries(extra)) q.set(k, v);
    return `/admin/revenue?${q.toString()}`;
  };
  const exportHref = (type: "transactions" | "subscriptions" | "revenue") => {
    const q = new URLSearchParams(periodQuery);
    q.set("type", type);
    for (const [k, v] of Object.entries(filters)) if (v) q.set(k, v);
    return `/admin/revenue/export?${q.toString()}`;
  };

  const periodTransactions = data.transactions.filter((t) => {
    const at = new Date(t.occurredAt).getTime();
    return at >= period.from.getTime() && at < period.to.getTime();
  });
  const filteredSubs = filterSubscriptions(data.subscriptions, filters);
  const trials = data.subscriptions.filter((s) => s.trialStartedAt);
  const cancellations = data.subscriptions.filter((s) => s.canceledAt && new Date(s.canceledAt) >= period.from && new Date(s.canceledAt) < period.to);

  const subscriptionFilterLink = (key: string, value: string, label: string, active: boolean) => {
    const q = new URLSearchParams(periodQuery);
    q.set("tab", "subscriptions");
    for (const [k, v] of Object.entries(filters)) if (v && k !== key) q.set(k, v);
    if (!active) q.set(key, value);
    return (
      <Link key={`${key}-${value}`} href={`/admin/revenue?${q.toString()}`} className={`${styles.chip} ${active ? styles.chipActive : ""}`} aria-pressed={active}>
        {label}
      </Link>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>הכנסות וסליקה</h1>
          <p className={styles.subtitle}>כל הפעילות הכספית של הפורטל: מנויים, ניסיונות, חיובים וכשלים. &quot;הכנסות בפועל&quot; הן רק תשלומים ש-PayMe אישרה.</p>
        </div>
        <p className={styles.periodLabel}>
          תקופה: <strong>{period.label}</strong>
        </p>
      </div>

      {!payMeReady && (
        <div className={styles.banner} role="status">
          <strong>סליקת PayMe עדיין לא פעילה.</strong> {PAYME_EMPTY} כדי להפעיל יש להגדיר ב-Vercel את משתני הסביבה: {missingVars.map((name) => <code key={name}>{name}</code>)}
        </div>
      )}

      <form method="get" className={styles.filters} aria-label="סינון תקופה">
        <input type="hidden" name="tab" value={tab} />
        {Object.entries(filters).map(([key, value]) => (value ? <input key={key} type="hidden" name={key} value={value} /> : null))}
        <label>
          תקופה
          <select name="period" defaultValue={preset}>
            {PERIOD_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          מתאריך
          <input type="date" name="from" defaultValue={from} />
        </label>
        <label>
          עד תאריך
          <input type="date" name="to" defaultValue={to} />
        </label>
        <label>
          קיבוץ הגרף
          <select name="group" defaultValue={granularity}>
            <option value="day">ימים</option>
            <option value="week">שבועות</option>
            <option value="month">חודשים</option>
          </select>
        </label>
        <button type="submit" className={styles.apply}>
          החלה
        </button>
      </form>

      <nav className={styles.tabs} aria-label="אזורי ההכנסות">
        {TABS.map((t) => (
          <Link key={t.id} href={tabHref(t.id)} className={`${styles.tab} ${t.id === tab ? styles.tabActive : ""}`} aria-current={t.id === tab ? "page" : undefined}>
            {t.label}
            {t.id === "attention" && attention.length > 0 && <span className={styles.tabBadge}>{attention.length}</span>}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <>
          <section aria-labelledby="actual-heading" className={styles.block}>
            <h2 id="actual-heading" className={styles.blockTitle}>
              הכנסות בפועל <span className={styles.tag}>נגבה</span>
            </h2>
            <div className={styles.kpiGrid}>
              <div className={styles.kpi}>
                <span className={styles.kpiValue}>{formatAgorotAsIls(kpis.collectedAgorot)}</span>
                <span className={styles.kpiLabel}>הכנסה שנגבתה בתקופה ({kpis.collectedTransactions} חיובים)</span>
                <span className={styles.kpiNote}>רק חיובים מוצלחים ש-PayMe אישרה. ניסיון, עסק ממתין וחיוב שנכשל אינם הכנסה.</span>
              </div>
              <div className={styles.kpi}>
                <span className={styles.kpiValue}>{kpis.activePaying}</span>
                <span className={styles.kpiLabel}>מנויים משלמים פעילים</span>
                <span className={styles.kpiNote}>סטטוס active</span>
              </div>
              <div className={styles.kpi}>
                <span className={styles.kpiValue}>{kpis.trialing.total}</span>
                <span className={styles.kpiLabel}>בתקופת ניסיון</span>
                <span className={styles.kpiNote}>
                  {kpis.trialing.standard} רגילים (30 ימים) · {kpis.trialing.pilot} פיילוט (90 ימים)
                </span>
              </div>
              <div className={`${styles.kpi} ${kpis.failedNow > 0 ? styles.kpiWarn : ""}`}>
                <span className={styles.kpiValue}>{kpis.failedNow}</span>
                <span className={styles.kpiLabel}>חיובים שנכשלו כרגע</span>
                <span className={styles.kpiNote}>past-due או תקופת חסד</span>
              </div>
              <Link href={tabHref("attention")} className={`${styles.kpi} ${styles.kpiLink} ${kpis.needsAttention > 0 ? styles.kpiWarn : ""}`}>
                <span className={styles.kpiValue}>{kpis.needsAttention}</span>
                <span className={styles.kpiLabel}>דורש טיפול</span>
                <span className={styles.kpiNote}>כשלי חיוב, חסד שעומד להסתיים, webhook שנכשל, מנוי שלא מסתנכרן</span>
              </Link>
            </div>
          </section>

          <section aria-labelledby="forecast-heading" className={styles.block}>
            <h2 id="forecast-heading" className={styles.blockTitle}>
              הכנסה חוזרת צפויה <span className={`${styles.tag} ${styles.tagForecast}`}>צפי — לא כסף שנכנס</span>
            </h2>
            <div className={styles.kpiGrid}>
              <div className={styles.kpi}>
                <span className={styles.kpiValue}>{kpis.mrrIls === null ? "—" : `${kpis.mrrIls} ₪`}</span>
                <span className={styles.kpiLabel}>MRR — הכנסה חודשית חוזרת</span>
                <span className={styles.kpiNote}>{kpis.mrrIls === null ? NOT_ENOUGH_DATA + " — עדיין אין מנוי משלם פעיל." : "מנויים פעילים בלבד. מסלול שנתי מחולק ב-12 לצורך החישוב בלבד — לא נגבה כל חודש."}</span>
              </div>
              <div className={styles.kpi}>
                <span className={styles.kpiValue}>{kpis.arrIls === null ? "—" : `${kpis.arrIls} ₪`}</span>
                <span className={styles.kpiLabel}>ARR — הכנסה שנתית חוזרת צפויה</span>
                <span className={styles.kpiNote}>{kpis.arrIls === null ? NOT_ENOUGH_DATA : "MRR × 12. ניסיונות וחידושים עתידיים אינם נספרים כהכנסה."}</span>
              </div>
            </div>
          </section>

          <section aria-labelledby="chart-heading" className={styles.block}>
            <h2 id="chart-heading" className={styles.blockTitle}>
              הכנסות בפועל לאורך זמן
            </h2>
            {kpis.collectedTransactions === 0 ? (
              <p className={styles.empty}>{payMeReady ? "לא נגבו חיובים בתקופה שנבחרה." : PAYME_EMPTY}</p>
            ) : (
              <RevenueChart series={series} />
            )}
            <div className={styles.splitGrid}>
              <div>
                <h3 className={styles.subTitle}>לפי חבילה</h3>
                {byPlan.length === 0 ? <p className={styles.empty}>—</p> : <ul className={styles.plainList}>{byPlan.map((row) => <li key={row.key}>{row.label}: <strong>{formatAgorotAsIls(row.amountAgorot)}</strong> ({row.count})</li>)}</ul>}
              </div>
              <div>
                <h3 className={styles.subTitle}>לפי מסלול</h3>
                {byInterval.length === 0 ? <p className={styles.empty}>—</p> : <ul className={styles.plainList}>{byInterval.map((row) => <li key={row.key}>{row.label}: <strong>{formatAgorotAsIls(row.amountAgorot)}</strong> ({row.count})</li>)}</ul>}
              </div>
            </div>
          </section>

          <section aria-labelledby="metrics-heading" className={styles.block}>
            <h2 id="metrics-heading" className={styles.blockTitle}>
              מדדים עסקיים בתקופה
            </h2>
            <dl className={styles.metricGrid}>
              <div><dt>מנויים משלמים חדשים</dt><dd>{summary.newPayingSubscriptions}</dd></div>
              <div><dt>תקופות ניסיון שהתחילו</dt><dd>{summary.trialsStarted.total} <small>({summary.trialsStarted.standard} רגילים · {summary.trialsStarted.pilot} פיילוט)</small></dd></div>
              <div><dt>ניסיון → משלם (רגיל, 30 ימים)</dt><dd>{conversionText(summary.conversion.standard)}</dd></div>
              <div><dt>ניסיון → משלם (פיילוט, 90 ימים)</dt><dd>{conversionText(summary.conversion.pilot)}</dd></div>
              <div><dt>ביטולים</dt><dd>{summary.cancellations}</dd></div>
              <div><dt>חיובים שנכשלו</dt><dd>{summary.failedPayments}</dd></div>
              <div><dt>חיובים שהוחזרו (התאוששו)</dt><dd>{summary.recoveredPayments}</dd></div>
            </dl>
            <p className={styles.kpiNote}>שיעור המרה נמדד רק על ניסיונות שהסתיימו בתקופה, והפיילוט לא מעורבב עם ניסיון רגיל.</p>
          </section>

          <section aria-labelledby="pilot-heading" className={styles.block}>
            <h2 id="pilot-heading" className={styles.blockTitle}>
              קבוצת הפיילוט
            </h2>
            <dl className={styles.metricGrid}>
              <div><dt>עסקי פיילוט מוגדרים</dt><dd>{pilot.pilotBusinesses}</dd></div>
              <div><dt>התחילו ניסיון</dt><dd>{pilot.trialStarted}</dd></div>
              <div><dt>עדיין בניסיון</dt><dd>{pilot.trialing}</dd></div>
              <div><dt>הפכו למנויים משלמים</dt><dd>{pilot.convertedToPaid}</dd></div>
              <div><dt>נכשלו בחיוב הראשון</dt><dd>{pilot.failedFirstCharge}</dd></div>
            </dl>
            {pilot.remaining.length > 0 && (
              <ul className={styles.plainList}>
                {pilot.remaining.map((r) => (
                  <li key={r.businessId}>
                    <Link href={`/admin/businesses/${r.businessId}`}>{r.businessName}</Link> — נותרו {r.daysLeft} ימים
                  </li>
                ))}
              </ul>
            )}
            <p>
              <Link href={tabHref("subscriptions", { offer: "pilot" })}>הצגת מנויי הפיילוט בלבד ←</Link>
            </p>
          </section>

          <p className={styles.exportRow}>
            <a href={exportHref("revenue")}>ייצוא CSV — הכנסות לפי תקופה</a>
          </p>
        </>
      )}

      {tab === "attention" && (
        <section className={styles.block} aria-labelledby="attention-heading">
          <h2 id="attention-heading" className={styles.blockTitle}>
            דורש טיפול
          </h2>
          {attention.length === 0 ? (
            <p className={styles.empty}>אין כרגע מקרים שדורשים טיפול.</p>
          ) : (
            <ul className={styles.attentionList}>
              {attention.map((item, index) => (
                <li key={`${item.kind}-${item.businessId ?? index}-${index}`} className={`${styles.attentionItem} ${item.urgent ? styles.attentionUrgent : ""}`}>
                  <p className={styles.attentionTitle}>{item.message}</p>
                  <dl className={styles.attentionMeta}>
                    {item.amountIls !== null && (<div><dt>סכום</dt><dd>{item.amountIls} ₪</dd></div>)}
                    {item.failedAt && (<div><dt>ניסיון החיוב</dt><dd>{fmtDateTime(item.failedAt)}</dd></div>)}
                    {item.reason && (<div><dt>סיבה (כפי ש-PayMe מחזירה)</dt><dd>{item.reason}</dd></div>)}
                    {item.graceDaysLeft !== null && item.kind !== "past-due" && (<div><dt>נותרו בתקופת החסד</dt><dd>{item.graceDaysLeft} ימים{item.graceEndsAt ? ` (עד ${fmtDate(item.graceEndsAt)})` : ""}</dd></div>)}
                    {item.kind === "past-due" && (<div><dt>מצב</dt><dd>תקופת החסד הסתיימה — ההטבות הופסקו</dd></div>)}
                  </dl>
                  {item.urgent && item.graceDaysLeft !== null && item.kind === "grace-ending" && (
                    <p className={styles.warning} role="alert">⚠ נותר פחות מיומיים — ללא תשלום העסק יאבד את ההטבות.</p>
                  )}
                  {item.businessId && (
                    <Link href={`/admin/businesses/${item.businessId}`} className={styles.attentionLink}>
                      צפייה בפרטי העסק והמנוי
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "transactions" && (
        <section className={styles.block} aria-labelledby="tx-heading">
          <div className={styles.blockHead}>
            <h2 id="tx-heading" className={styles.blockTitle}>עסקאות ({periodTransactions.length})</h2>
            <a href={exportHref("transactions")} className={styles.exportLink}>ייצוא CSV</a>
          </div>
          {periodTransactions.length === 0 ? (
            <p className={styles.empty}>{payMeReady ? "אין עסקאות בתקופה שנבחרה." : PAYME_EMPTY}</p>
          ) : (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr><th>תאריך</th><th>עסק</th><th>חבילה</th><th>מסלול</th><th>סכום</th><th>סטטוס</th><th>סוג פעולה</th><th>מזהה PayMe</th></tr>
                </thead>
                <tbody>
                  {periodTransactions.map((t) => (
                    <tr key={t.id}>
                      <td>{fmtDateTime(t.occurredAt)}</td>
                      <td>{t.businessId ? <Link href={`/admin/businesses/${t.businessId}`}>{t.businessName ?? "עסק"}</Link> : (t.businessName ?? "—")}</td>
                      <td>{planLabel(t.planId)}</td>
                      <td>{intervalLabel(t.interval)}</td>
                      <td>{formatAgorotAsIls(t.amountAgorot)}</td>
                      <td><span className={t.status === "succeeded" ? styles.ok : t.status === "failed" ? styles.bad : styles.muted}>{TRANSACTION_STATUS_HE[t.status]}</span></td>
                      <td>{TRANSACTION_KIND_HE[t.kind]}</td>
                      <td dir="ltr" className={styles.mono}>{t.providerTransactionId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "subscriptions" && (
        <section className={styles.block} aria-labelledby="subs-heading">
          <div className={styles.blockHead}>
            <h2 id="subs-heading" className={styles.blockTitle}>מנויים ({filteredSubs.length})</h2>
            <a href={exportHref("subscriptions")} className={styles.exportLink}>ייצוא CSV</a>
          </div>
          <div className={styles.chips} role="group" aria-label="סינון מנויים">
            {subscriptionFilterLink("plan", "plus", "Plus", filters.plan === "plus")}
            {subscriptionFilterLink("plan", "premium", "Premium", filters.plan === "premium")}
            {subscriptionFilterLink("offer", "standard", "רגיל", filters.offer === "standard")}
            {subscriptionFilterLink("offer", "pilot", "Pilot בלבד", filters.offer === "pilot")}
            {subscriptionFilterLink("interval", "monthly", "חודשי", filters.interval === "monthly")}
            {subscriptionFilterLink("interval", "yearly", "שנתי", filters.interval === "yearly")}
            {(["trialing", "active", "past-due", "grace-period", "canceled", "expired"] as SubscriptionStatus[]).map((s) =>
              subscriptionFilterLink("status", s, SUBSCRIPTION_STATUS_HE[s], filters.status === s),
            )}
          </div>
          {filteredSubs.length === 0 ? (
            <p className={styles.empty}>אין מנויים להצגה{Object.keys(filters).length ? " בסינון שנבחר" : " עדיין — מנוי נוצר כשעסק מפעיל תקופת ניסיון"}.</p>
          ) : (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr><th>עסק</th><th>חבילה</th><th>מסלול</th><th>מחיר (snapshot)</th><th>הטבה</th><th>סטטוס</th><th>סיום ניסיון</th><th>חיוב הבא</th><th>אמצעי תשלום</th><th>תשלום אחרון</th><th>כשל אחרון</th></tr>
                </thead>
                <tbody>
                  {filteredSubs.map((s) => (
                    <SubscriptionRow key={s.id} sub={s} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "trials" && (
        <section className={styles.block} aria-labelledby="trials-heading">
          <h2 id="trials-heading" className={styles.blockTitle}>תקופות ניסיון ({trials.length})</h2>
          <p className={styles.kpiNote}>
            {computeTrialSplit(data.subscriptions).standard} רגילים (30 ימים) · {computeTrialSplit(data.subscriptions).pilot} פיילוט (90 ימים) בניסיון כרגע. הנתונים לקוחים מה-snapshot שנשמר במנוי, לא מההצעה הנוכחית.
          </p>
          {trials.length === 0 ? (
            <p className={styles.empty}>עדיין לא הופעלה תקופת ניסיון באף עסק.</p>
          ) : (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr><th>עסק</th><th>חבילה</th><th>הטבה</th><th>ימי ניסיון</th><th>התחלה</th><th>סיום</th><th>נותרו</th><th>אמצעי תשלום</th></tr>
                </thead>
                <tbody>
                  {trials.map((s) => (
                    <tr key={s.id}>
                      <td><Link href={`/admin/businesses/${s.businessId}`}>{s.businessName}</Link></td>
                      <td>{planLabel(s.planId)}</td>
                      <td>{offerOf(s) === "pilot" ? "פיילוט" : "רגיל"}</td>
                      <td>{s.trialDays ?? (offerOf(s) === "pilot" ? 90 : 30)}</td>
                      <td>{fmtDate(s.trialStartedAt)}</td>
                      <td>{fmtDate(s.trialEndsAt)}</td>
                      <td>{s.status === "trialing" ? `${daysLeft(s.trialEndsAt, now)} ימים` : SUBSCRIPTION_STATUS_HE[s.status]}</td>
                      <td>{s.hasPaymentMethod ? "מוגדר" : "לא מוגדר"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "cancellations" && (
        <section className={styles.block} aria-labelledby="cancel-heading">
          <h2 id="cancel-heading" className={styles.blockTitle}>ביטולים בתקופה ({cancellations.length})</h2>
          {cancellations.length === 0 ? (
            <p className={styles.empty}>לא היו ביטולים בתקופה שנבחרה.</p>
          ) : (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead><tr><th>עסק</th><th>חבילה</th><th>מסלול</th><th>מועד הביטול</th></tr></thead>
                <tbody>
                  {cancellations.map((s) => (
                    <tr key={s.id}>
                      <td><Link href={`/admin/businesses/${s.businessId}`}>{s.businessName}</Link></td>
                      <td>{planLabel(s.planId)}</td>
                      <td>{intervalLabel(s.interval)}</td>
                      <td>{fmtDateTime(s.canceledAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={styles.kpiNote}>סיבות ביטול עדיין לא נאספות, ולכן אינן מוצגות.</p>
        </section>
      )}

      {tab === "events" && (
        <section className={styles.block} aria-labelledby="events-heading">
          <h2 id="events-heading" className={styles.blockTitle}>אירועי סליקה (לצורכי ניפוי שגיאות)</h2>
          {data.billingEvents.length === 0 ? (
            <p className={styles.empty}>{PAYME_EMPTY}</p>
          ) : (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead><tr><th>זמן</th><th>ספק</th><th>סוג אירוע</th><th>מזהה אירוע</th><th>סטטוס</th><th>מנוי / עסק</th></tr></thead>
                <tbody>
                  {data.billingEvents.map((e) => (
                    <tr key={e.id}>
                      <td>{fmtDateTime(e.receivedAt)}</td>
                      <td>PayMe</td>
                      <td>{e.eventType}</td>
                      <td dir="ltr" className={styles.mono}>{e.providerEventId.slice(0, 16)}…</td>
                      <td><span className={e.status === "processed" ? styles.ok : e.status === "failed" ? styles.bad : styles.muted}>{e.status === "processed" ? "עובד" : e.status === "failed" ? `נכשל${e.error ? ` — ${e.error}` : ""}` : e.status === "ignored" ? "ללא שינוי" : "התקבל"}</span></td>
                      <td>{e.businessId ? <Link href={`/admin/businesses/${e.businessId}`}>עסק</Link> : "—"} {e.providerSubscriptionId && <span dir="ltr" className={styles.mono}>{e.providerSubscriptionId.slice(0, 12)}…</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={styles.kpiNote}>לא מוצגים כאן מספר כרטיס, CVV, סודות או טוקן תשלום. אירוע שנכשל בעיבוד מופיע גם תחת &quot;דורש טיפול&quot;.</p>
        </section>
      )}

      {tab === "audit" && (
        <section className={styles.block} aria-labelledby="audit-heading">
          <h2 id="audit-heading" className={styles.blockTitle}>יומן פעולות ידניות על מנויים</h2>
          {data.audit.length === 0 ? (
            <p className={styles.empty}>עדיין לא בוצעו פעולות ידניות.</p>
          ) : (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead><tr><th>זמן</th><th>פעולה</th><th>עסק</th><th>לפני</th><th>אחרי</th><th>מנהל</th></tr></thead>
                <tbody>
                  {data.audit.map((a) => (
                    <tr key={a.id}>
                      <td>{fmtDateTime(a.createdAt)}</td>
                      <td>{AUDIT_LABEL[a.action] ?? a.action}</td>
                      <td>{a.businessId ? <Link href={`/admin/businesses/${a.businessId}`}>{a.businessName ?? "עסק"}</Link> : "—"}</td>
                      <td>{a.before ?? "—"}</td>
                      <td>{a.after ?? "—"}</td>
                      <td>{a.adminId ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

const AUDIT_LABEL: Record<string, string> = {
  "business-plan-changed": "שינוי חבילה",
  "business-pilot-assigned": "סימון כפיילוט",
  "business-pilot-removed": "הסרת פיילוט",
  "business-offer-changed": "שינוי הצעה",
  "business-billing-test-changed": "בדיקת סליקה (Sandbox)",
};

function SubscriptionRow({ sub }: { sub: RevenueSubscription }) {
  const pilotRow = offerOf(sub) === "pilot";
  return (
    <tr>
      <td><Link href={`/admin/businesses/${sub.businessId}`}>{sub.businessName}</Link></td>
      <td>{planLabel(sub.planId)}</td>
      <td>{intervalLabel(sub.interval)}</td>
      <td>{ils(sub.priceIls)}{sub.isLaunchPrice ? <span className={styles.launch}> מחיר השקה</span> : null}</td>
      <td>{pilotRow ? "פיילוט" : "רגיל"} · {sub.trialDays ?? (pilotRow ? 90 : 30)} ימים</td>
      <td>{SUBSCRIPTION_STATUS_HE[sub.status]}</td>
      <td>{fmtDate(sub.trialEndsAt)}</td>
      <td>{sub.nextBillingAt ? fmtDate(sub.nextBillingAt) : "—"}</td>
      <td>{sub.hasPaymentMethod ? "מוגדר" : "לא מוגדר"}</td>
      <td>{fmtDate(sub.lastPaymentSucceededAt)}</td>
      <td>{fmtDate(sub.lastPaymentFailedAt)}</td>
    </tr>
  );
}
