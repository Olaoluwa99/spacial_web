# Special web

Read PROJECT_HANDOFF/README.md and the latest iteration before starting. This is the
independent website repository; Android/bundle source lives in ../Special.

- Use TypeScript, Astro, custom CSS and native browser motion. Keep the visual quality
  of the editorial layout. Ask before introducing a new dependency or changing stack.
- Keep original demos isolated in iframes. Change bundles upstream, then export them
  with scripts/sync-bundles.py; never patch the copied release or generated eval screen.
- Respect keyboard access and prefers-reduced-motion. Check desktop and phone layouts.
- Run npm run check, npm test and npm run build after code changes; run browser checks
  for interaction/layout work and review screenshots.
- Keep secrets, node_modules, dist, .astro and artifacts out of Git.
- Commits: type(scope): Sentence-case summary, blank line, short explanatory body.
  Never add Co-Authored-By or mention AI tools in commit messages or PR descriptions.
- Do not push, publish, delete branches or set up paid services without the user asking.
- Update the handoff and commit it at meaningful milestones, including open work and
  verification limits. Cross-reference Android handoff when the shared project advances.
