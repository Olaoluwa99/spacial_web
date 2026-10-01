import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

// Keep the optional Postgres WASM runtime outside application dependencies.
// SCHEMA_TEST_NODE_MODULES=/tmp/special-schema-validation/node_modules node --test scripts/schema.test.mjs
const moduleDirectory = process.env.SCHEMA_TEST_NODE_MODULES;

test(
  "Account schema enforces grants, owner isolation, constraints and cascade deletion in PostgreSQL",
  {
    skip: moduleDirectory
      ? false
      : "Set SCHEMA_TEST_NODE_MODULES to an isolated installation of @electric-sql/pglite.",
  },
  async () => {
    const optionalRequire = createRequire(
      resolve(moduleDirectory, "..", "package.json"),
    );
    const { PGlite } = await import(
      pathToFileURL(optionalRequire.resolve("@electric-sql/pglite")).href
    );
    const database = new PGlite();
    try {
      await database.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create table auth.users (id uuid primary key, email text);
      create function auth.uid() returns uuid language sql stable as $$
        select coalesce(
          nullif(current_setting('request.jwt.claim.sub', true), ''),
          nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
        )::uuid;
      $$;
      grant usage on schema auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
    `);
      const schema = await readFile(
        new URL("../supabase/schemas/accounts.sql", import.meta.url),
        "utf8",
      );
      const verification = await readFile(
        new URL("../supabase/verify/rls.sql", import.meta.url),
        "utf8",
      );
      await database.exec(schema);
      const results = await database.exec(verification);
      assert.equal(
        results.at(-1).rows[0].result,
        "RLS verification passed; all fixtures rolled back.",
      );
      for (const table of [
        "auth.users",
        "public.profiles",
        "public.saved_styles",
      ]) {
        const result = await database.query(
          `select count(*)::integer as count from ${table}`,
        );
        assert.equal(
          result.rows[0].count,
          0,
          `${table} fixtures must be rolled back`,
        );
      }
      // Table creation and validation use actual PostgreSQL, but Auth/JWT helpers
      // above are a simulation. Real Supabase Auth and Data API remain integration checks.
    } finally {
      await database.close();
    }
  },
);
