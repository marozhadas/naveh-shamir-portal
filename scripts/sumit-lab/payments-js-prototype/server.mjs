// LOCAL prototype server for observing how SUMIT's payments.js behaves in a browser (test organization, documented test cards only).
// Run: node scripts/sumit-lab/payments-js-prototype/server.mjs      then open the printed http://127.0.0.1 address in a browser.
//
// Guarantees: it refuses to start unless SUMIT_ENVIRONMENT=test and SUMIT_COMPANY_ID equals SUMIT_TEST_COMPANY_ID; it listens on
// 127.0.0.1 only and answers only requests whose Host is 127.0.0.1/localhost; it reads ONLY SUMIT_* and PAYMENTS_PROVIDER from
// .env.local and never prints a value; /sink records the NAMES of the posted fields, never their values; it has no database and no
// Supabase code. The CompanyID and the PUBLIC key go to the page (that is what payments.js needs) - never the API key.
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..");

const env = {};
const envFile = path.join(root, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = /^\s*(SUMIT_[A-Z0-9_]+|PAYMENTS_PROVIDER)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
for (const key of Object.keys(process.env)) if (/^(SUMIT_[A-Z0-9_]+|PAYMENTS_PROVIDER)$/.test(key)) env[key] = process.env[key];

const companyId = /^[0-9]{1,15}$/.test(env.SUMIT_COMPANY_ID ?? "") ? Number(env.SUMIT_COMPANY_ID) : null;
const testCompanyId = /^[0-9]{1,15}$/.test(env.SUMIT_TEST_COMPANY_ID ?? "") ? Number(env.SUMIT_TEST_COMPANY_ID) : null;
const publicKey = (env.SUMIT_API_PUBLIC_KEY ?? "").trim();
if ((env.SUMIT_ENVIRONMENT ?? "").trim().toLowerCase() !== "test" || companyId === null || companyId !== testCompanyId || !publicKey) {
  console.error("REFUSED: needs SUMIT_ENVIRONMENT=test, SUMIT_COMPANY_ID equal to SUMIT_TEST_COMPANY_ID, and SUMIT_API_PUBLIC_KEY (names only - no value is printed).");
  process.exit(1);
}

const sink = { count: 0, fieldNames: [] };
const port = Number(process.env.PROTOTYPE_PORT) || 4178;

const server = createServer((request, response) => {
  const host = (request.headers.host ?? "").split(":")[0];
  if (host !== "127.0.0.1" && host !== "localhost") {
    response.writeHead(403).end("forbidden");
    return;
  }
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const send = (status, type, body) => response.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" }).end(body);

  if (request.method === "GET" && url.pathname === "/") return send(200, "text/html; charset=utf-8", readFileSync(path.join(here, "index.html")));
  if (request.method === "GET" && url.pathname === "/jquery.js") return send(200, "text/javascript", readFileSync(path.join(root, "node_modules", "jquery", "dist", "jquery.min.js")));
  if (request.method === "GET" && url.pathname === "/config.json") return send(200, "application/json", JSON.stringify({ companyId, apiPublicKey: publicKey }));
  if (request.method === "GET" && url.pathname === "/sink-log") return send(200, "application/json", JSON.stringify(sink));
  if (request.method === "POST" && url.pathname === "/sink") {
    let raw = "";
    request.on("data", (chunk) => (raw += chunk));
    request.on("end", () => {
      sink.count += 1;
      // NAMES only: a value (a card number, a token) is never kept
      sink.fieldNames = [...new URLSearchParams(raw).keys()];
      send(200, "text/html; charset=utf-8", "<!doctype html><title>sink</title><p>posted</p>");
    });
    return;
  }
  send(404, "text/plain", "not found");
});

server.listen(port, "127.0.0.1", () => console.log(`payments.js prototype: http://127.0.0.1:${port}/  (test organization only; Ctrl+C to stop)`));
