# Website preflight · awaiting stack approval

*Last updated 2026-10-01, iteration 010.*

## User direction and workspaces

The user created `special_web` for the website codebase and requested a handoff and
technology proposal before implementation. Website planning is the current priority;
Compose generation evaluation remains in the backlog.

- Android/bundle source: `/home/olaoluwa/AndroidStudioProjects/Special`.
- Website: `/home/olaoluwa/AndroidStudioProjects/special_web` (sibling, empty at inspection).
- This file is the website starting brief. The committed source checkpoint is
  `../../Special/PROJECT_HANDOFF/07-website-preflight.md` relative to this folder.
- The website directory has no Git repository, package manifest, dependencies or source.
  No framework was scaffolded, dependency installed, remote created or deployment performed.

Keep the website as its own codebase/repository, as decided in the original plan.
Website Git initialization and dependency installation belong to the implementation
step after the user chooses the stack. This web handoff is saved locally; the companion
main handoff is versioned in the Android repository.

## First milestone (proposed)

1. Home page explaining Special and introducing the six styles.
2. Style catalogue and individual style pages: description, token/motion highlights,
   reference image, live demo, bundle version and download.
3. Installation/use guide for bundles and a link to the Android app when available.
4. Responsive navigation, keyboard access, reduced motion, metadata and sitemap.

Live demos should reuse the shipped web examples and their CSS/helpers. Isolate
style-specific global CSS in demo documents/iframes so styles cannot contaminate
one another. Demo selection/loading should be deliberate rather than running six
animated previews simultaneously. Showcase real reference implementations;
generated evaluation screens are evidence, not approved product demos.

## Proposed technology — not approved

| Area | Proposal | Reason |
|---|---|---|
| Language | TypeScript, HTML and CSS | Typed catalogue/build metadata with direct control of visual presentation |
| Framework | Astro, static output | Content-led catalogue and detail pages with selective interactivity |
| Styling | Custom CSS, CSS variables and existing bundle tokens | Preserve each style's surface/motion grammar and reduce styling dependencies |
| Motion | CSS and native Web Animations API | Reuse bundle recipes, respect reduced motion; revisit a library only for a concrete need |
| Content | Local typed/JSON style manifest, Markdown guides | Six style records do not require a CMS for the first milestone |
| Package/build tools | Node.js, npm and committed package-lock.json | Straightforward repeatable tooling; pin versions when setup is approved |
| Hosting | Cloudflare static hosting, provider pending approval | Serve built HTML/assets; final provider/domain setup belongs to deployment |
| Verification | TypeScript/build checks and browser review, Playwright where available | Check catalogue links/downloads, phone/desktop layouts, focus and reduced motion |
| Backend/accounts/payments | Deferred to their later roadmap phase | Initial catalogue, demos and ZIP downloads can be static |

Astro can serve mostly static HTML with JavaScript added where interaction needs it:
https://docs.astro.build/en/concepts/islands/
TypeScript configuration:
https://docs.astro.build/en/guides/configuring-astro/
Static hosting reference:
https://developers.cloudflare.com/workers/static-assets/

React/Next.js is an alternative if the user wants to prioritize a future signed-in
web application over the initial content catalogue. Tailwind, a component kit, a
motion library and CMS are choices to discuss, not assumed dependencies. Supabase
and RevenueCat remain later options from the existing roadmap, not approved work
in this phase. The visual direction (neutral catalogue shell versus expressive
style-led home page) also needs user input before implementation.

## Bundle delivery boundary

Android `bundles/` remains the source of truth. Build ZIPs with the existing tooling
and copy/export versioned releases, references and demo assets into web public
assets. Record versions/checksums in a manifest. Avoid manual token duplication and
avoid a deployed build that requires the sibling Android checkout. Download links
must point to actual release files. No new Android bundle changes are needed merely
to display them on the website.

Current source versions: Glass 0.1.5; Bento 0.1.5; Clay 0.1.2; Kinetic 0.1.2;
Aurora 0.1.1; Neo-brutalism 0.1.1.

## Existing evidence and limitations

Iteration 009 is complete: 18 web cases, 16 browser passes, 14 visual acceptances;
53 offline Android tests and 13 harness tests pass. Failed generated samples remain
unchanged. Exact model IDs were unavailable; do not market these results as a
controlled model ranking. Fresh Bento 0.1.5 clears text clipping but misses the
prompt's completion message; fresh Glass 0.1.5 login passes its checks/review.

## Next action

Obtain the user's choice of language/framework, styling/motion approach and initial
scope. Then establish the independent website repository and development tooling,
build the first reviewable home/catalogue slice, and continue to the full milestone.
No dependency installation or publishing before the relevant user authorization.
