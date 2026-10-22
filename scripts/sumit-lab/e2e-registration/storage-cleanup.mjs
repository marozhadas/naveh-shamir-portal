// Cleanup of the storage files of the ONE test registration (see docs/sumit-e2e-registration-test.md).
//   node scripts/sumit-lab/e2e-registration/storage-cleanup.mjs --id <registration uuid> --since <ISO time> --expect <n>            (list only)
//   node scripts/sumit-lab/e2e-registration/storage-cleanup.mjs --id <registration uuid> --since <ISO time> --expect <n> --delete   (delete)
//
// It refuses unless ALL of this holds:
//   - the registration row NO LONGER exists (the database cleanup came first);
//   - every object under business-media/registrations/<id>/ was created at or after --since;
//   - the number of those objects equals --expect.
// It touches only paths under registrations/<id>/. It reads the Supabase URL and service key from .env.local, uses them only in
// memory and prints neither (it prints object names, which are random).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..");
const BUCKET = "business-media";
const KINDS = ["cover", "gallery", "testimonial"];

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
const fail = (message) => {
  console.error("REFUSED: " + message);
  process.exit(1);
};

const id = arg("id");
const since = arg("since");
const expect = Number(arg("expect"));
const doDelete = process.argv.includes("--delete");
if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) fail("--id must be the registration uuid");
if (!since || Number.isNaN(new Date(since).getTime())) fail("--since must be an ISO time (the start of the test)");
if (!Number.isInteger(expect) || expect < 0 || expect > 50) fail("--expect must be the number of images uploaded in the test");

const env = {};
const file = path.join(root, ".env.local");
if (existsSync(file)) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) fail("the Supabase URL / service key are missing in .env.local (names only - no value is printed)");

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// 1) the database cleanup must have happened first
const { data: row, error: rowError } = await client.from("business_registrations").select("id").eq("id", id).maybeSingle();
if (rowError) fail("could not check the registration row: " + rowError.message);
if (row) fail("the registration row still exists - run the database cleanup first");

// 2) list ONLY this registration's folders
const objects = [];
for (const kind of KINDS) {
  const prefix = `registrations/${id}/${kind}`;
  const { data, error } = await client.storage.from(BUCKET).list(prefix, { limit: 100 });
  if (error) fail(`could not list ${kind}: ${error.message}`);
  for (const entry of data ?? []) {
    if (!entry.id) continue; // a sub-folder marker, not a file
    objects.push({ name: `${prefix}/${entry.name}`, created: entry.created_at });
  }
}
console.log(`found ${objects.length} object(s) under registrations/<id>/; expected ${expect}`);
for (const object of objects) console.log(" - " + object.name.replace(`registrations/${id}/`, "") + "  created " + object.created);

// 3) every object must belong to this test
if (objects.some((object) => !object.created || new Date(object.created).getTime() < new Date(since).getTime())) fail("an object predates --since - nothing was deleted");
if (objects.length !== expect) fail(`the count (${objects.length}) differs from --expect (${expect}) - nothing was deleted`);

if (!doDelete) {
  console.log("list only (add --delete to remove exactly these objects)");
  process.exit(0);
}
if (objects.length === 0) {
  console.log("nothing to delete");
  process.exit(0);
}
const { error: removeError } = await client.storage.from(BUCKET).remove(objects.map((object) => object.name));
if (removeError) fail("remove failed: " + removeError.message);
console.log(`deleted ${objects.length} object(s)`);
