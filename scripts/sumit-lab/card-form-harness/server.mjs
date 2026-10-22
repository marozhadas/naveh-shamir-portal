// LOCAL browser harness for the REAL SumitCardForm component (src/components/business-dashboard/SumitCardForm).
// Run: node scripts/sumit-lab/card-form-harness/server.mjs   then open the printed http://127.0.0.1 address.
//
// What is real: the component, its helpers (payments-js.ts, load-payments-js.ts, tokenize-payer.ts), React, the bundled jQuery.
// What is mocked: the server action (mock-action.ts, swapped in by an alias) and - unless HARNESS_REAL=1 - SUMIT's payments.js (main.tsx).
// Default mode: it reads NO environment file, holds no key and opens no connection except this local dev server (127.0.0.1 only).
// HARNESS_REAL=1 + page ?real=1: the page loads SUMIT's REAL payments.js against the TEST organization (see below); the server action
// is STILL a mock. Either way the form's imports of Supabase / SUMIT servers are impossible here (nothing else imports them).
import { createServer } from "vite";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const port = Number(process.env.HARNESS_PORT) || 4179;

// REAL mode (HARNESS_REAL=1): the page may load SUMIT's real payments.js with the TEST organization's CompanyID and PUBLIC key (never the API key).
// Refuses to start unless SUMIT_ENVIRONMENT=test and SUMIT_COMPANY_ID equals SUMIT_TEST_COMPANY_ID. Prints no value.
let realConfig = null;
if (process.env.HARNESS_REAL === "1") {
  const env = {};
  const file = path.join(repoRoot, ".env.local");
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = /^\s*(SUMIT_[A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (match) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
  const id = /^[0-9]{1,15}$/.test(env.SUMIT_COMPANY_ID ?? "") ? Number(env.SUMIT_COMPANY_ID) : null;
  const testId = /^[0-9]{1,15}$/.test(env.SUMIT_TEST_COMPANY_ID ?? "") ? Number(env.SUMIT_TEST_COMPANY_ID) : null;
  const publicKey = (env.SUMIT_API_PUBLIC_KEY ?? "").trim();
  if ((env.SUMIT_ENVIRONMENT ?? "").trim().toLowerCase() !== "test" || id === null || id !== testId || !publicKey) {
    console.error("REFUSED: real mode needs SUMIT_ENVIRONMENT=test, SUMIT_COMPANY_ID equal to SUMIT_TEST_COMPANY_ID and SUMIT_API_PUBLIC_KEY (names only - no value is printed).");
    process.exit(1);
  }
  realConfig = { companyId: id, apiPublicKey: publicKey };
}

const server = await createServer({
  plugins: [
    {
      name: "harness-real-config",
      configureServer(devServer) {
        devServer.middlewares.use("/config.json", (request, response) => {
          const host = (request.headers.host ?? "").split(":")[0];
          if (!realConfig || (host !== "127.0.0.1" && host !== "localhost")) {
            response.statusCode = 404;
            response.end("not found");
            return;
          }
          response.setHeader("Content-Type", "application/json");
          response.setHeader("Cache-Control", "no-store");
          response.end(JSON.stringify(realConfig));
        });
      },
    },
  ],
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
