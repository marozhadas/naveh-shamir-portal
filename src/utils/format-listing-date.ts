const FORMATTER = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short" });

/** Short Hebrew date (e.g. "12 באוג") — used wherever a listing/card only needs a publish date, not a full timestamp. */
export function formatListingDate(isoDate: string): string {
  return FORMATTER.format(new Date(isoDate));
}
