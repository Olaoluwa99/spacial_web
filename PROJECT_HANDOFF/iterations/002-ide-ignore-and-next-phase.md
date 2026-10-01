# 002 · IDE ignores and deployment planning

- **Date:** 2026-10-01
- **Branch:** main
- **Status:** done

## Goal and changes

Ignore the user's IDE files and explain the next infrastructure phase. Added `.idea/`
and `*.iml` to the website .gitignore. Android already ignores both; neither repository
has tracked .idea files. Local settings remain on disk.

## Verification

Git check-ignore confirms website IDE paths are excluded; git diff --check passes.
No runtime changes; no application tests needed.

## Next

Review/refine the website, then configure production hosting/domain and SITE_URL.
Recommend a Cloudflare account now and Workers Static Assets for hosting. Supabase
is deferred until accounts, saved projects, user libraries or other persistent data
are scoped. Both services can coexist. This is guidance, not approval to create
services, connect accounts, deploy or push. Official provider documentation checked.
