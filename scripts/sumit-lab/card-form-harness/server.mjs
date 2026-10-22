// LOCAL browser harness for the REAL SumitCardForm component (src/components/business-dashboard/SumitCardForm).
// Run: node scripts/sumit-lab/card-form-harness/server.mjs   then open the printed http://127.0.0.1 address.
//
// What is real: the component, its helpers (payments-js.ts, load-payments-js.ts, tokenize-payer.ts), React, the bundled jQuery.
// What is mocked: SUMIT's payments.js (main.tsx) and the server action (mock-action.ts, swapped in by an alias).
// Guarantees: it reads NO environment file, holds no key, opens no connection except this local dev server (127.0.0.1 only),
// and the form's imports of Supabase / SUMIT servers are impossible here (the action module is replaced; nothing else imports them).
import { createServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const port = Number(process.env.HARNESS_PORT) || 4179;

const server = await createServer({
  root: here,
  configFile: false,
  logLevel: "warn",
  server: { host: "127.0.0.1", port, strictPort: true, fs: { allow: [repoRoot] } },
  resolve: {
    alias: [
      { find: "@/app/business/dashboard/sumit-payment-actions", replacement: path.join(here, "mock-action.ts") },
      { find: /^@\//, replacement: path.join(repoRoot, "src") + "/" },
    ],
  },
});
await server.listen();
console.log(`SumitCardForm harness: http://127.0.0.1:${port}/  (mocks only; Ctrl+C to stop)`);
