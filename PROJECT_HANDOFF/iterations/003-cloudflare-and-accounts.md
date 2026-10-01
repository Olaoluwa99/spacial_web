# 003 · Cloudflare hosting and local accounts

- **Date:** 2026-10-01
- **Branch:** main
- **Status:** done (hosting live; account code prepared locally)
- **Commits:** implementation and accompanying handoff checkpoint

## Goal

User authorized Cloudflare setup, accounts next, documentation and subagents. After
identifying an unrelated Supabase organization, the user restricted Supabase work to
local code until reconnecting their own account. No remote Supabase changes permitted.

## What was done

- Initialized workers.dev and published Special with Workers Static Assets. Source
  configuration, browser/cache headers and MCP upload helpers are committed.
- Six account routes: signup/signin, password recovery/reset, callback and dashboard.
  Profile editing and saved-style library integrate with the existing catalogue.
- Pinned SupabaseSDK2.117.2; PKCE callback exchanges exactly once, preserves specific
  concurrent flow verifier and scrubs transient URL parameters. Verified user identity
  precedes private queries/writes, with safe local redirects and stale-response guards.
- Signup names are presentationmetadata and lazy profiles; ownership never uses metadata.
- Declarative profiles/saved_styles schema,7owner policies,minimal grants,invoker timestamps
  and rollback-only database verification. No applied migration or remote schema claimed.
- Missing production config disables account forms/library saves with comingsoon copy.
  Public content/downloads remain available. Account pages noindex and no-store.
-Threeagents handledUI/client/schema; rootintegrated,deployed,tested andreviewed.
  Chronological actions: ../operations/2026-10-01-cloudflare-accounts.md.

## Problems and fixes

New workers.dev initially returned1042; laterlive routechecks pass. FixturebuildoutDir
acrossfilesystems hitAstroEXDEV; changed toignoredworkspaceartifactsdirectory. Browser
assertion matchedhiddenstatus too; scoped visibleprofile status. Review caughtsignupname
beingdiscarded andcallbacklosingflowID; bothfixed andcovered inlocal checks.

## Verification

36files typecheck0errors/warnings/hints;17HTMLpageproductionbuild;9unit tests.32live
routechecks,7interactiongroups,6liveZIPhashes,custom404,sitemap/headers pass.8mocked
accountflowgroups pass withnoSupabaserequests. PGlite0.5.8 runs actual PostgreSQLschema/
RLS/grants/constraints withsimulatedAuthhelpers:1testpasses. Screenshots reviewed.
See ../verification/accounts-verification.md and JSON/capture evidence.

## Left open / next

Reconnect the owner's MCP, verify target nbeplophztgvxhsbhmar, reconcile/generate a
narrow migration, apply only when authorized, configure Auth/email/redirects, build
with publicenv andverify realusers. Customdomain/automated builds, Androidaccounts,
payments andAI remainlaterphases. No Gitpush. Uploadcredentials deletedafterdeployment.
