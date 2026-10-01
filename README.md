# Special web

The public home for Special: six interface styles, original live showcases, versioned
Web + Compose bundles, a getting-started guide and an interactive spring playground.

Built with TypeScript, Astro 7, custom CSS and native Web Animations. Static output;
no account service, CMS or runtime backend. Manrope is served locally under its OFL
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
domain is invented. Hosting and a domain have not been configured.

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
ten routes at desktop/phone widths, six archive checksums, catalogue filtering,
preview close/focus/unloading, navigation, demo sizing and reduced-motion behavior.
Reports and screenshots go in ignored `artifacts/`; visually review the captures.

Start future sessions with [PROJECT_HANDOFF/README.md](PROJECT_HANDOFF/README.md).
