# Special web

The public home for Special: six interface styles, original live showcases, versioned
Web + Compose bundles, a getting-started guide and an interactive spring playground.

Built with TypeScript, Astro 7, custom CSS and native Web Animations. Static output;
local account integration prepared; no CMS or server rendering. Supabase is not configured yet. Manrope is served locally under its OFL
license; editorial illustrations are separate from the original bundle showcases.

## Run

Use Node 24 (minimum 22.12) and npm:

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
npm run preview
```

Local URL: http://127.0.0.1:4321. Astro 7 preview runs as a managed background server;
use `npx astro preview status` or `npx astro preview stop` to inspect/stop it.
Built output is `dist/`. Set `SITE_URL=https://your-real-domain` when building for
production to generate canonical URLs and the sitemap. Without it, no production
domain is invented. Cloudflare hosting is configured; no custom domain is attached.

## Bundle releases

The sibling `../Special/bundles/` is the source of truth. To export updated releases:

```sh
npm run sync:bundles
# Or supply a different Android checkout:
python3 scripts/sync-bundles.py /path/to/Special
```

This invokes the source release builder, then copies versioned ZIPs, reference PNGs,
original demo HTML/CSS/JS and token/motion metadata. `src/data/releases.json` records
versions, paths, sizes and SHA-256 checksums. Commit these exported assets with their
manifest. A deployed build does not need the Android checkout. Edit a bundle upstream
and follow its patch/version/reference rules; do not independently edit demo copies.

`src/data/styles.ts` holds editorial text. `src/components/StyleArt.astro` and
`src/styles/art.css` hold catalogue illustrations. Live demos are isolated in
iframes; catalogue previews load only when requested and unload when closed.

## Browser verification

`scripts/check-site.cjs` requires Playwright and a Chrome executable in the testing
environment. It is not a production dependency. Start the preview first, then run:

```sh
NODE_PATH=/path/to/environment/node_modules npm run test:browser
```

Optional `CHROME_PATH` and `SITE_TEST_URL` override the local defaults. The suite checks
sixteen content/account routes at desktop/phone widths, six archive checksums, catalogue filtering,
preview close/focus/unloading, navigation, demo sizing and reduced-motion behavior.
Reports and screenshots go in ignored `artifacts/`; visually review the captures.

Start future sessions with [PROJECT_HANDOFF/README.md](PROJECT_HANDOFF/README.md).

## Cloudflare hosting

Live site: https://special-web.olaoluwa-special.workers.dev/

`wrangler.jsonc` defines the static Worker and routing. `_headers` supplies browser
headers, hashed-asset caching and no-store for account shells. The initial deploy used
Cloudflare MCP to create an upload session, `scripts/cloudflare-assets.py` to upload
its requested asset buckets, then MCP to activate the completed static version.
Short-lived session/completion tokens were deleted after deployment. No account API
token is stored in this repository. Only `dist/` is deployed, never fixture builds.

For future CLI deployments, install an exact pinned Wrangler development dependency,
authenticate with your own Cloudflare account, check the available commands with
`--help`, build with SITE_URL, then perform a dry run before `wrangler deploy`.
Alternatively use the same MCP upload workflow. Git origin is now configured, but
this session did not push or configure automated builds. No custom domain is attached.

## Accounts · prepared locally

Six account routes provide signup, signin, password recovery, callback, a profile and
saved-style library. The browser uses the pinned Supabase SDK, PKCE, verified identity
and owner-scoped data calls. Account routes are noindex. Public content and bundle
downloads stay available without an account. Missing configuration disables forms
and marks the account/library features as coming soon; it does not create fake users.

After connecting the correct Supabase account, follow [supabase/README.md](supabase/README.md)
to reconcile/generate the migration, validate RLS and configure Auth. Copy .env.example
to ignored .env and set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY. Only
publishable keys belong in public builds. Configure the production site URL, approved
callback/localhost redirects, confirmation/recovery templates and email delivery before
opening accounts to users. Rebuild and redeploy after environment changes.

Default tests cover springs and account helpers. The optional PostgreSQL policy test
uses an isolated PGlite installation documented in supabase/README.md. To run the
browser account fixtures without contacting Supabase:

```sh
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_fixture \
npm run build -- --outDir artifacts/account-fixture-dist
python3 -m http.server 4332 --bind 127.0.0.1 --directory artifacts/account-fixture-dist
# In another terminal, with Playwright available:
ACCOUNT_TEST_URL=http://127.0.0.1:4332 NODE_PATH=/path/to/node_modules npm run test:accounts
```

Fixture requests are intercepted locally; they never reach a Supabase project. Never
deploy the fixture output. Build production again without fixture environment values.
