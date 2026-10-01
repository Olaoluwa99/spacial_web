# Special website handoff

*Last updated 2026-10-01 · iteration 004 in progress (Supabase database live).*

The user approved the recommended stack and requested a polished, attention-catching
site. The first website milestone is implemented in this independent repository on
`main`. Read [iteration 004](iterations/004-supabase-activation.md) and the root
[runbook](../README.md) before continuing.

## Current state

- Astro 7.3.5 + TypeScript 6.0.3, custom CSS, self-hosted Manrope and native animations.
- Home, filterable catalogue, six detail pages, original interactive bundle demos,
  downloads, usage guide, spring playground and 404 page.
- Sixteen content/account routes plus 404, robots and production sitemap. Static production build.
- Release exports: Glass/Bento 0.1.5, Clay/Kinetic 0.1.2, Aurora/Brutalism 0.1.1.
- Live Cloudflare site: https://special-web.olaoluwa-special.workers.dev/
- Supabase project `nbeplophztgvxhsbhmar` (Special) verified and migrated: profiles and
  saved_styles with owner-only RLS, verified on the real project. Public settings are in
  the ignored `.env.production`; that build is **not yet deployed**, so production still
  shows the coming-soon account state.
- Outstanding: Auth Site/redirect URLs, a working deploy path, custom SMTP, real-user test.
- No custom domain, payment or AI service configured.
- Git origin: github.com/Olaoluwa99/spacial_web.git; no push performed.
- Local preview: http://127.0.0.1:4321. Set SITE_URL for a production build.

## Architecture and boundaries

`src/pages` defines routes; `src/components` reusable presentation; `src/styles`
the editorial shell and style illustrations; `src/scripts` interactions/spring math.
`src/data/styles.ts` contains editorial copy and `releases.json` exported metadata.
`public/releases`, `public/references` and `public/demos` are upstream release exports.

The sibling Android repository `../Special` owns bundles and their evaluations.
Run `npm run sync:bundles` to refresh exports; build/deploy can then operate independently.
The catalogue art is illustrative. Embedded demos are the original reference code.
Do not claim controlled model rankings from the existing one-sample evaluations.

## Decisions · 2026-10-01

- Approved TypeScript/Astro; prioritize bespoke typography, composition and motion.
- Static catalogue first, with selective native JavaScript rather than a UI framework.
- Keep custom CSS and local content; no component kit, CMS or animation dependency.
- Use exact dependency pins and a committed lockfile. Local assets avoid runtime CDN needs.
- Real ZIP downloads with SHA-256 metadata; isolate original demos and unload closed previews.
- Cloudflare Workers Static Assets hosting is now configured and deployed with user authorization.
  The owner reconnected their Supabase account and authorized remote setup (iteration 004).

## Next phase

1. Owner signs in to the Supabase dashboard (or sets them directly) so the Auth Site URL
   and callback redirect URLs can be configured. The MCP cannot change Auth settings.
2. Restore a Cloudflare deploy path (connector with deploy tools, or wrangler with the
   owner's login), redeploy, and test a real account round trip.
3. Configure custom SMTP before advertising accounts. Custom domain and automated builds
   when requested; app distribution, payments and generation services remain later.

Cloudflare is set up; account code is locally reviewable. See the ongoing
[action log](operations/2026-10-01-cloudflare-accounts.md) for exact operations/results.
No pushes have been requested. Preserve both repositories before switching machines.

## Iterations

| # | Date | Record |
|---|---|---|
| 001 | 2026-10-01 | [First website milestone](iterations/001-website-milestone.md) |
| 002 | 2026-10-01 | [IDE ignores and deployment planning](iterations/002-ide-ignore-and-next-phase.md) |
| 003 | 2026-10-01 | [Cloudflare hosting and local account implementation](iterations/003-cloudflare-and-accounts.md) |
| 004 | 2026-10-01 | [Supabase activation](iterations/004-supabase-activation.md) |

[00-preflight.md](00-preflight.md) preserves the original pre-implementation proposal.
Its pending-approval statements are historical, superseded by this handoff.
