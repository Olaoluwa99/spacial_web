# Accounts database preparation

**Prepared locally; not applied or connected to any Supabase project.** The user has
asked to reconnect the MCP to their own account before any Supabase setup. Do not
apply this code through the currently connected account. The supplied project URL
is an intended destination, not evidence of ownership or a verified connection.

`schemas/accounts.sql` declares the desired database state. There is no invented
timestamped migration or recorded migration history. A Supabase CLI/local stack is
not available in this workspace. The desired schema and complete RLS script passed
in local PostgreSQL WASM (PGlite 0.5.8), using simulated Supabase Auth helpers and
roles. They have not been applied to an actual Supabase environment.

## Application contract

| Table | Columns | Authenticated operations |
|---|---|---|
| `public.profiles` | `user_id` UUID primary key; `display_name` text (default empty, max 80 characters); `created_at`, `updated_at` timestamps | Read, insert, update and delete own row |
| `public.saved_styles` | `user_id` UUID; `style_id` catalogue slug; `created_at` timestamp; primary key `(user_id, style_id)` | Read, insert and delete own rows |

Both user IDs reference `auth.users(id)` with cascade deletion. Both tables enable
RLS, revoke public/anonymous access, and grant only required operations. Separate
ownership policies use `(select auth.uid()) = user_id`. Profile updates check both
the existing and resulting owner. Primary keys index both user foreign keys.
There are no public profiles, roles, payments or privileged metadata fields.

The browser can upsert `{ user_id, display_name }` into profiles with
`onConflict: 'user_id'`. Profile timestamps are database-managed by a trigger with
`security invoker` and an empty search path; no automatic Auth trigger is required.
Saving a style uses insert with `ignoreDuplicates: true`, or handles duplicate-key
error `23505`. Do not use a saved-style upsert that updates rows: UPDATE is not
granted. Removing a saved style deletes the matching `(user_id, style_id)`.

## Later: validate locally, then apply to the owner's project

These are operator instructions for later, **not commands executed this session**.

1. Install an appropriate Supabase CLI using the official installation instructions,
   and Docker for the local stack. Run `supabase --version`, `supabase --help`, then
   help for every command before using it. Run `supabase init` if there is no
   `supabase/config.toml`; do not overwrite a project that already has one.
2. For a new project on the current pg-delta engine, enable
   `[experimental.pgdelta]` with `enabled = true` in the generated config. Discover
   `supabase db schema declarative sync --help`, then generate the migration:

   ```bash
   supabase db schema declarative sync -f special_accounts --no-apply
   ```

   On the legacy migra engine instead, set `[db.migrations].schema_paths` to
   `["./schemas/*.sql"]`, stop the local stack, and use
   `supabase db diff -f special_accounts` after checking its help. Do not mix the two
   engines. Current pg-delta does not use `schema_paths` for ordering.
3. Review the generated migration, including the grants, seven policies, function
   permissions and trigger. It must not drop unrelated objects. The desired schema
   is for new tables; existing `profiles` or `saved_styles` require reconciliation.
4. Start the local database, apply the reviewed migration with
   `supabase migration up`, and check `supabase migration list --local`. Get the
   local database URL from `supabase status`. Run the rollback-only SQL test against
   **that local database**, using a local administrator connection:

   ```bash
   psql "$SPECIAL_LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/verify/rls.sql
   ```

   `SPECIAL_LOCAL_DATABASE_URL` is a local shell variable supplied by the operator;
   never commit its value. The test uses two temporary Auth users and role changes,
   checks owner/other-user/anonymous operations and constraints, and ends with
   `ROLLBACK`. It requires an administrator role that can create test users and
   `SET ROLE`; it does not use a production browser key. If it fails, disconnect
   (or issue `ROLLBACK`) before retrying.
5. Once the owner explicitly approves remote changes, verify the correct account
   and project before `supabase login` / `supabase link`. If the target contains
   existing schema/history, baseline it in a separate workspace first; never run
   sync against this partial schema tree and an unrelated baseline, as it may
   generate removals of unrelated objects. Merge the complete desired schema and
   regenerate a narrowly scoped migration. Review the resulting dry-run before
   `supabase db push`. Do not run the fixture test in production.
6. Check Database Advisors and the live API as two separate test users. Confirm the
   Data API exposes `public` with the explicit grants. Configure Auth site URL,
   approved callback URLs, email/password provider and confirmation/recovery email
   delivery for the final site. Only a project URL and publishable key belong in
   the site's public environment; service-role/secret keys never belong there.

## Verification performed

On 2026-10-01, `scripts/schema.test.mjs` executed the desired schema and the complete
rollback-only verification SQL in PGlite 0.5.8. It passed one database test, including
owner profile upsert/update/delete, saved-style insert/delete, duplicate saves,
cross-user denial, anonymous denial, missing identity denial, forbidden ownership
transfer, unsupported saved-style UPDATE, invalid-style/name constraints, cascading
Auth-user deletion and complete fixture rollback. The isolated runtime is installed
under `/tmp/special-schema-validation`, outside application dependencies.

To reproduce this optional database test without modifying package.json:

```bash
npm install --prefix /tmp/special-schema-validation --save-exact @electric-sql/pglite@0.5.8 --no-audit --no-fund
SCHEMA_TEST_NODE_MODULES=/tmp/special-schema-validation/node_modules node --test scripts/schema.test.mjs
```

Without the environment variable, the optional test reports a skip. The test uses
actual PostgreSQL policy/grant execution, but its `auth.users`, `auth.uid()` and JWT
settings are local simulations. Real Supabase Auth, PostgREST, project-specific
grants, migration generation and email delivery remain integration checks. The
Supabase local-stack test and later real-user API checks above are still required.

References checked 2026-10-01:
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[declarative schemas](https://supabase.com/docs/guides/local-development/declarative-database-schemas),
[Data API grant changes](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).
