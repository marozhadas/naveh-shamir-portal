/**
 * A FAKE, in-memory stand-in for the Supabase admin client, for the lab step that runs the real "save a card for a registration"
 * service against SUMIT Test. It exists so that step can never touch the real database:
 *   - it answers only the exact queries the service makes (the registration, "is there a subscription", the card row, the event);
 *   - it allows exactly two writes - an upsert into billing_payment_methods and an insert into business_events_log;
 *   - ANY other table or operation throws, so a change in the service that starts writing somewhere else fails the lab loudly
 *     instead of silently reaching a database.
 * It holds no credentials and opens no connection. Nothing here is imported by the app.
 */

export type FakeOp = { table: string; op: "select" | "upsert" | "insert"; payload?: unknown; options?: unknown };
type Row = Record<string, unknown>;

export function createFakeRegistrationDb(registration: Row) {
  const log: FakeOp[] = [];
  const rows: { billing_payment_methods: Row[]; business_events_log: Row[] } = { billing_payment_methods: [], business_events_log: [] };

  function from(table: string) {
    const filters: Record<string, unknown> = {};
    const query = {
      select() {
        log.push({ table, op: "select" });
        return query;
      },
      eq(column: string, value: unknown) {
        filters[column] = value;
        return query;
      },
      async maybeSingle() {
        if (table === "business_registrations") {
          const match = filters.id === registration.id && filters.owner_id === registration.owner_id;
          return { data: match ? registration : null, error: null };
        }
        if (table === "business_subscriptions") return { data: null, error: null };
        throw new Error(`FAKE DB: unexpected read of "${table}"`);
      },
      async upsert(payload: Row, options: unknown) {
        if (table !== "billing_payment_methods") throw new Error(`FAKE DB: unexpected write to "${table}"`);
        log.push({ table, op: "upsert", payload, options });
        rows.billing_payment_methods = [...rows.billing_payment_methods.filter((row) => row.business_registration_id !== payload.business_registration_id), payload];
        return { error: null };
      },
      async insert(payload: Row) {
        if (table !== "business_events_log") throw new Error(`FAKE DB: unexpected write to "${table}"`);
        log.push({ table, op: "insert", payload });
        rows.business_events_log.push(payload);
        return { error: null };
      },
      update() {
        throw new Error(`FAKE DB: update of "${table}" is not allowed`);
      },
      delete() {
        throw new Error(`FAKE DB: delete from "${table}" is not allowed`);
      },
    };
    return query;
  }

  return { admin: { from } as never, log, rows };
}
