# 004 · Supabase activation

- **Date:** 2026-10-01
- **Branch:** main
- **Status:** in progress (database live; Auth URLs, email and redeploy outstanding)
- **Commits:** handoff checkpoint for this iteration

## Goal

The user reconnected their own Supabase account and asked to check access to project
`nbeplophztgvxhsbhmar` and to Cloudflare. After the read-only check they authorized the
remote setup: apply the schema, verify the access rules, configure Auth URLs and
redeploy the site with public settings.

## What was done

1. Read-only check. Supabase MCP shows one organization, "Daniel's Org"
   (`eosxajspzovohewovrxe`), with one project: **Special**, `nbeplophztgvxhsbhmar`,
   eu-west-1, Postgres 17, ACTIVE_HEALTHY, created 2026-10-01 15:05 UTC. It had no
   migrations, no `public` tables or functions and no Auth users. Cloudflare MCP shows
   the single Worker `special-web` (modified 17:26 UTC).
2. Applied migration `20261001181148_special_accounts` through the MCP. It is the
   declarative schema verbatim; saved as `supabase/migrations/20261001181148_special_accounts.sql`.
3. Ran `supabase/verify/rls.sql` against the real project in one transaction ending in
   `ROLLBACK`. It passed: anonymous denial, owner CRUD, cross-user denial, no ownership
   transfer, no saved-style UPDATE, constraints, missing-identity denial and cascade.
4. Confirmed afterwards: 0 users, 0 profiles, 0 saved styles; 7 policies; client grants
   only to `authenticated` (profiles SELECT/INSERT/UPDATE/DELETE, saved_styles
   SELECT/INSERT/DELETE). Security and performance advisors returned no lints.
5. Wrote the public build settings to `.env.production` (git-ignored): `SITE_URL`,
   `PUBLIC_SUPABASE_URL=https://nbeplophztgvxhsbhmar.supabase.co` and the `default`
   `sb_publishable_…` key (read again with the MCP's `get_publishable_keys`). No secret
   or service-role key was read or written. The legacy anon JWT key is not used.
6. `npm run check` (36 files, 0 issues), `npm test` (9 pass) and `npm run build`
   (17 pages) pass with the configuration. The bundle contains the project URL and no
   `sb_secret_` value; the only `service_role` text is supabase-js admin library code.

## Problems and blockers

- **Auth URL configuration is not exposed by the Supabase MCP.** The built-in browser's
  dashboard session is signed out, and signing in is the owner's action. Needed in
  Authentication → URL Configuration:
  - Site URL: `https://special-web.olaoluwa-special.workers.dev`
  - Redirect URLs: `https://special-web.olaoluwa-special.workers.dev/account/callback/**`
    and, for local preview, `http://127.0.0.1:4321/account/callback/**`
- **Redeploy is blocked.** The Cloudflare MCP connected now only lists/reads Workers;
  the upload-session/deploy tools used in iteration 003 are not available, and wrangler
  is not installed. The built `dist/` with account settings is ready but **not live**;
  production still shows the coming-soon state.
- **Email delivery.** Supabase's built-in email sender is rate-limited and intended for
  testing (it only delivers to the organization's team addresses). Real sign-ups need
  custom SMTP before accounts are advertised publicly.

## Verification

Remote schema, policies, grants, rollback and advisors verified through the MCP as above.
Local check/test/build pass. No real sign-up, email, PostgREST call or live account
page has been exercised yet.

## Left open / next

1. Owner signs in to the dashboard (or sets the URLs directly) for the Auth URL settings.
2. Restore a deploy path: reconnect the Cloudflare connector with Worker deploy tools, or
   approve installing wrangler and run `wrangler login` (owner) then `wrangler deploy`.
3. Redeploy, then test a real sign-up/confirm/sign-in/profile/save/sign-out round trip
   with an address the built-in sender can reach.
4. Configure custom SMTP (and optionally branded templates) before public launch.
