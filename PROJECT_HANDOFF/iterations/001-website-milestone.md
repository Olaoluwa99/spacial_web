# 001 · First website milestone

- **Date:** 2026-10-01
- **Branch:** main
- **Status:** done
- **Commits:** website implementation and accompanying handoff commits on main

## Goal

Implement the approved recommended stack in special_web. The user requested the best
option for a catching website, with a polished visual identity rather than a simple page.

## What was done

- Established an independent Git repository and pinned Astro/TypeScript/npm tooling.
- Built a bespoke off-white/ink/lime editorial identity: expressive serif/sans typography,
  layered hero, six distinct style illustrations, responsive catalogue and detail pages.
- Added original live showcase iframes, six verified versioned ZIP downloads, usage guide,
  native keyboard-aware preview dialog, filters, mobile navigation and spring playground.
- Implemented analytical spring responses (under/critical/overdamped), presets, sliders,
  sampled CSS linear() export and reduced-motion handling without a motion library.
- Exported current source releases and metadata from Special; deployed builds are standalone.
- Added conditional canonical URLs/sitemap, robots, favicon, 404 and locally licensed fonts.
- Documented architecture, commands, bundle sync, conventions and next phase.

## Decisions

TypeScript/Astro static output, custom CSS, native animation, local typed/JSON content,
independent repository, exact dependency pins, upstream bundle ownership. Hosting/domain
and backend remain future work. See the parent handoff's decision list.

## Problems and fixes

- A rotated decorative orbit overflowed the phone viewport; inset/rotation corrected.
- Preview assertion raced the native asynchronous close event; wait for cleanup before
  asserting focus. Runtime close/unload behavior was correct.
- Small secondary labels were too light; strengthened their text colours.

## Verification

- Astro check: 22 files, zero errors/warnings/hints. Production static build passes.
- Four spring tests pass, including closed-form critical response, convergence, bounce,
  monotonic overdamping and settlement over the full control range.
- Headless Chrome: ten content routes at 1440 and 390 pixels (20 route checks), no
  horizontal overflow, one h1/main and named buttons. Seven grouped interaction checks
  pass: filters, six previews at each width, motion and reduced-motion handling.
- All six archive SHA-256/size checks pass. No captured page errors or HTTP errors.
- Reviewed desktop/mobile home, catalogue, playground/detail captures and all six original
  preview screenshots. Original demos retain their own scrolling viewport.
- Targeted solid-background text contrast audit on home/guide/playground/Glass detail;
  corrected weak secondary text. This is not a full WCAG conformance audit.
- Evidence: ../verification/browser-report.json and screenshot derivatives. Full captures
  are local ignored artifacts. Playwright/Chrome supplied by the existing environment.
- Android application and bundles were unchanged; their existing offline tests remain
  the prior source checkpoint. No emulator, push or deployment performed.

## Left open / next

Review the design with the user, then domain/hosting and production SITE_URL configuration.
No production app download link exists yet. Backend/accounts/payments are later phases.
The website has no Git remote; preserve both repositories before switching machines.
