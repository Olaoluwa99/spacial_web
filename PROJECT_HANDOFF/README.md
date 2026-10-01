# Special website handoff

*Last updated 2026-10-01 · iteration 001 completed.*

The user approved the recommended stack and requested a polished, attention-catching
site. The first website milestone is implemented in this independent repository on
`main`. Read [iteration 001](iterations/001-website-milestone.md) and the root
[runbook](../README.md) before continuing.

## Current state

- Astro 7.3.5 + TypeScript 6.0.3, custom CSS, self-hosted Manrope and native animations.
- Home, filterable catalogue, six detail pages, original interactive bundle demos,
  downloads, usage guide, spring playground and 404 page.
- Ten content routes plus 404, robots and conditional sitemap. Static production build.
- Release exports: Glass/Bento 0.1.5, Clay/Kinetic 0.1.2, Aurora/Brutalism 0.1.1.
- No remote, deployment, production domain, accounts, backend or payments configured.
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
- Cloudflare static hosting remains the suggested deployment option; provider/domain setup
  is a future action. No deployment or push authorized in this session.

## Next phase

1. User reviews the local design and selects any visual refinements.
2. Select domain/hosting, configure SITE_URL and publish when requested; verify live links,
   headers and caching. Add social-share artwork when the public identity is agreed.
3. Add app distribution link when available. Accounts, payments and generation services
   remain later phases requiring their own scope and credentials.

Before changing machines, preserve both repositories on their remotes. The website
currently has no remote; Android has local commits awaiting push. Do not push unasked.

## Iterations

| # | Date | Record |
|---|---|---|
| 001 | 2026-10-01 | [First website milestone](iterations/001-website-milestone.md) |

[00-preflight.md](00-preflight.md) preserves the original pre-implementation proposal.
Its pending-approval statements are historical, superseded by this handoff.
