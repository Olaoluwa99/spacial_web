"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { chromium } = require("playwright");
const origin = process.env.SITE_TEST_URL || "http://127.0.0.1:4321";
const releases = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/data/releases.json")),
);
const artifacts = path.join(__dirname, "../artifacts");
fs.mkdirSync(artifacts, { recursive: true });
const report = { pages: [], interactions: [], downloads: [], errors: [] };
(async () => {
  for (const [id, release] of Object.entries(releases)) {
    const archive = fs.readFileSync(
      path.join(__dirname, "../public", release.download),
    );
    assert.equal(
      crypto.createHash("sha256").update(archive).digest("hex"),
      release.sha256,
    );
    assert.equal(archive.length, release.bytes);
    report.downloads.push({ id, version: release.version, checksum: "passed" });
  }
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
  });
  try {
    const routes = [
      "/",
      "/styles/",
      "/guide/",
      "/playground/",
      ...Object.keys(releases).map((id) => `/styles/${id}/`),
    ];
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({
        viewport,
        reducedMotion: "reduce",
      });
      await context.route("**/*", (route) =>
        route.request().url().startsWith(origin) ||
        /^(data:|blob:)/.test(route.request().url())
          ? route.continue()
          : route.abort(),
      );
      const page = await context.newPage();
      page.on("pageerror", (error) => report.errors.push(error.message));
      page.on("response", (response) => {
        if (response.status() >= 400)
          report.errors.push(`${response.status()} ${response.url()}`);
      });
      for (const route of routes) {
        await page.goto(origin + route, { waitUntil: "networkidle" });
        assert.equal(await page.locator("h1").count(), 1, route);
        assert.equal(await page.locator("main").count(), 1, route);
        const overflow = await page.evaluate(() => ({
          viewport: innerWidth,
          width: document.documentElement.scrollWidth,
        }));
        assert.ok(
          overflow.width <= overflow.viewport + 1,
          `${route}: ${JSON.stringify(overflow)}`,
        );
        const unnamed = await page
          .locator("button")
          .evaluateAll(
            (buttons) =>
              buttons.filter(
                (b) => !b.textContent.trim() && !b.getAttribute("aria-label"),
              ).length,
          );
        assert.equal(unnamed, 0, `${route}: unnamed button`);
        if (
          route === "/" ||
          route === "/styles/" ||
          route === "/playground/" ||
          route === "/styles/glassmorphism/"
        ) {
          await page.screenshot({
            path: path.join(
              artifacts,
              `${viewport.width}-${route === "/" ? "home" : route.replaceAll("/", "-").slice(1, -1)}.png`,
            ),
            fullPage: true,
          });
        }
        report.pages.push({
          route,
          width: viewport.width,
          overflow: "passed",
          semantics: "passed",
        });
      }
      await page.goto(origin + "/styles/");
      await page.locator('[data-filter="Typography"]').click();
      assert.equal(await page.locator("[data-style-card]:visible").count(), 1);
      assert.match(
        await page.locator("[data-collection-count]").innerText(),
        /01 style/,
      );
      await page.locator('[data-filter="Surfaces"]').click();
      assert.equal(await page.locator("[data-style-card]:visible").count(), 4);
      await page.locator('[data-filter="All styles"]').click();
      assert.equal(await page.locator("[data-style-card]:visible").count(), 6);
      report.interactions.push({ width: viewport.width, filter: "passed" });
      for (const id of Object.keys(releases)) {
        await page.locator(`[data-preview="${id}"]`).click();
        assert.equal(
          await page.locator("#preview-dialog").evaluate((d) => d.open),
          true,
        );
        await page.frameLocator("#preview-frame").locator("body").waitFor();
        await page.keyboard.press("Escape");
        assert.equal(
          await page.locator("#preview-dialog").evaluate((d) => d.open),
          false,
        );
        await page.waitForFunction(
          () => !document.querySelector("#preview-frame").hasAttribute("src"),
        );
        assert.equal(
          await page.evaluate(() =>
            document.activeElement?.getAttribute("data-preview"),
          ),
          id,
        );
      }
      report.interactions.push({
        width: viewport.width,
        previews: "6 passed; Escape restores focus and unloads iframe",
      });
      await page.goto(origin + "/playground/");
      await page.locator('[data-spring-preset="playful"]').click();
      assert.equal(await page.locator("#stiffness").inputValue(), "220");
      assert.match(
        await page.locator("[data-spring-code]").innerText(),
        /linear\(/,
      );
      await page.locator("[data-spring-replay]").click();
      assert.match(
        await page.locator("[data-spring-status]").innerText(),
        /Reduced motion/,
      );
      assert.equal(
        await page
          .locator("[data-spring-object]")
          .evaluate(
            (el) =>
              el.getAnimations().filter((a) => a.playState === "running")
                .length,
          ),
        0,
      );
      report.interactions.push({
        width: viewport.width,
        spring: "passed; reduced motion snaps",
      });
      await page.goto(origin + "/styles/glassmorphism/");
      await page.locator('[data-demo-size="wide"]').click();
      assert.equal(
        await page
          .locator("[data-demo-device]")
          .evaluate((el) => el.hasAttribute("data-wide")),
        true,
      );
      await page.locator('[data-demo-size="phone"]').click();
      assert.equal(
        await page
          .locator("[data-demo-device]")
          .evaluate((el) => el.hasAttribute("data-wide")),
        false,
      );
      if (viewport.width === 390) {
        await page.locator(".menu-toggle").click();
        assert.equal(await page.locator("#mobile-nav").isVisible(), true);
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("#mobile-nav").isVisible(), false);
      }
      await context.close();
    }
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "no-preference",
    });
    await page.goto(origin);
    await page.locator('[data-motion-preset="playful"]').click();
    await page.waitForTimeout(100);
    assert.ok(
      await page
        .locator("[data-motion-cube]")
        .evaluate((el) =>
          el.getAnimations().some((a) => a.playState === "running"),
        ),
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(100);
    assert.equal(
      await page
        .locator("[data-motion-cube]")
        .evaluate(
          (el) =>
            el.getAnimations().filter((a) => a.playState === "running").length,
        ),
      0,
    );
    report.interactions.push({
      normalMotion: "spring animates; switching OS preference cancels movement",
    });
    assert.deepEqual(report.errors, []);
    fs.writeFileSync(
      path.join(artifacts, "browser-report.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      JSON.stringify({
        pages: report.pages.length,
        downloads: report.downloads.length,
        interactions: report.interactions.length,
        errors: report.errors.length,
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  fs.writeFileSync(
    path.join(artifacts, "browser-failure.json"),
    JSON.stringify({ report, error: String(error) }, null, 2),
  );
  process.exitCode = 1;
});
