# 003 · Cloudflare hosting and local accounts

- **Date:** 2026-10-01
- **Branch:** main
- **Status:** done (hosting live; account code prepared locally)
- **Commits:** `e08b819` implementation; accompanying handoff checkpoint

## Goal

The user authorized Cloudflare setup, accounts next, documentation and subagents.
After identifying an unrelated Supabase organization, the user restricted Supabase
work to local code until reconnecting their own account. No remote Supabase changes.

## What was done

- Initialized workers.dev and published Special with Workers Static Assets. Committed
  routing configuration, browser/cache headers and MCP asset-upload helpers.
- Added six account routes: signup, signin, password recovery/reset, callback and
  dashboard. Profile editing and a saved-style library connect to the catalogue.
- Pinned Supabase SDK 2.117.2. PKCE callback exchanges once, preserves the verifier for
  concurrent flows and scrubs transient URL parameters. Verified identity precedes
  private queries/writes, with safe local redirects and stale-response guards.
- Signup names supply presentation metadata and lazy profiles; ownership never uses
  user-editable metadata. Missing configuration disables forms and library saves.
- Prepared declarative profiles/saved_styles schema, seven owner policies, minimal
  grants, invoker timestamp trigger and rollback-only verification. Nothing applied
  to a remote database. Account pages are noindex and use no-store headers.
- Three agents handled UI, client and schema. The root integrated, deployed and reviewed.
  The action log is ../operations/2026-10-01-cloudflare-accounts.md.

## Problems and fixes

Initial workers.dev requests returned 1042; subsequent live checks passed. An Astro
fixture build into /tmp hit a cross-filesystem rename error; moved its output into
ignored artifacts. Scoped a browser assertion to the visible profile status. Review
caught a discarded signup name and lost callback flow ID; both corrected and tested.

## Verification

- Type check: 36 files, zero errors/warnings/hints. Build: 17 HTML pages plus robots/sitemap.
- Nine unit tests pass. Live browser: 32 route checks, seven interaction groups, zero
  page/HTTP errors. Six live ZIP hashes, custom 404, sitemap and headers pass.
- Eight mocked account-flow groups pass without Supabase requests. PGlite 0.5.8 executes
  the actual PostgreSQL schema, policies, grants and constraints with simulated Auth:
  one database test passes. Actual Supabase integration remains pending.
- Account screenshots reviewed on desktop/phone, including a synthetic signed-in
  dashboard. Evidence: ../verification/accounts-verification.md.

## Left open / next

Reconnect the owner's MCP and verify target nbeplophztgvxhsbhmar. Reconcile schema,
generate a narrow migration, apply only when authorized, configure Auth/email/redirects,
build with public environment settings and test real users. Custom domain, automated
builds, Android accounts, payments and AI are later phases. No Git push. Upload tokens
deleted after deployment; temporary fixture servers stopped, local preview kept running.
