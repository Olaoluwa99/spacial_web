const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const fs = require("node:fs");
const origin = process.env.ACCOUNT_TEST_URL || "http://127.0.0.1:4331";
const api = "http://127.0.0.1:54321";
const user = {
  id: "a1b23456-1111-4111-8111-111111111111",
  aud: "authenticated",
  role: "authenticated",
  email: "owner@example.invalid",
  app_metadata: { provider: "email" },
  user_metadata: { display_name: "Studio owner" },
  created_at: "2026-10-01T00:00:00Z",
};
const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const access_token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: now + 3600, iat: now, aud: "authenticated", role: "authenticated" })}.local-fixture`;
const session = {
  access_token,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: now + 3600,
  refresh_token: "local-fixture-refresh",
  user,
};
const report = {
  source:
    "isolated fixture build; mocked local auth/data responses; no Supabase requests",
  checks: [],
  errors: [],
};
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  let name = "Studio owner",
    saved = ["glassmorphism"],
    requests = [],
    exchanges = 0;
  await context.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.origin === origin || /^(data:|blob:)/.test(request.url()))
      return route.continue();
    if (url.origin !== api) {
      report.errors.push("Unexpected outbound request: " + url.origin);
      return route.abort();
    }
    if (request.method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "*",
        },
      });
    const body = request.postDataJSON();
    requests.push({ path: url.pathname, method: request.method(), body });
    const reply = (json, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": origin },
        body: json === null ? "" : JSON.stringify(json),
      });
    if (url.pathname === "/auth/v1/token") {
      if (url.searchParams.get("grant_type") === "pkce") {
        exchanges++;
        assert.equal(body.code_verifier, "fixture-verifier");
      }
      if (body?.password === "wrong-password")
        return reply(
          {
            code: "invalid_credentials",
            error_code: "invalid_credentials",
            msg: "Invalid credentials",
          },
          400,
        );
      return reply(session);
    }
    if (url.pathname === "/auth/v1/user") return reply(user);
    if (url.pathname === "/auth/v1/signup")
      return reply({ user, session: null });
    if (url.pathname === "/auth/v1/recover") return reply({});
    if (url.pathname === "/auth/v1/logout") return reply(null, 204);
    if (url.pathname === "/rest/v1/profiles") {
      if (request.method() === "GET") return reply([{ display_name: name }]);
      assert.equal(body.user_id, user.id);
      name = body.display_name;
      return reply(null, 201);
    }
    if (url.pathname === "/rest/v1/saved_styles") {
      if (request.method() === "GET") {
        assert.equal(url.searchParams.get("user_id"), "eq." + user.id);
        return reply(saved.map((style_id) => ({ style_id })));
      }
      if (request.method() === "DELETE") {
        assert.equal(url.searchParams.get("user_id"), "eq." + user.id);
        saved = saved.filter(
          (id) => "eq." + id !== url.searchParams.get("style_id"),
        );
        return reply(null, 204);
      }
      assert.equal(body.user_id, user.id);
      if (!saved.includes(body.style_id)) saved.push(body.style_id);
      return reply(null, 201);
    }
    report.errors.push("Unexpected API route: " + url.pathname);
    return reply({}, 404);
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => report.errors.push(error.message));
  try {
    await page.goto(origin + "/account/sign-up/");
    await page.locator('[name="display_name"]').fill("Studio owner");
    await page.locator('[name="email"]').fill(user.email);
    await page.locator('[name="password"]').fill("a-long-fixture-password");
    await page.locator('form button[type="submit"]').click();
    await page.getByText(/Check your email for the confirmation/).waitFor();
    assert.ok(
      requests.some(
        (r) =>
          r.path === "/auth/v1/signup" &&
          r.body.data.display_name === "Studio owner",
      ),
    );
    report.checks.push("Signup confirmation, no invented signed-in state");
    await page.goto(origin + "/account/forgot-password/");
    await page.locator('[name="email"]').fill(user.email);
    await page.locator('form button[type="submit"]').click();
    await page.getByText(/If an account exists/).waitFor();
    report.checks.push("Password recovery request and neutral confirmation");
    await page.goto(origin + "/account/sign-in/?next=https://outside.invalid");
    await page.locator('[name="email"]').fill(user.email);
    await page.locator('[name="password"]').fill("wrong-password");
    await page.locator('form button[type="submit"]').click();
    await page.getByText(/email or password was not recognised/).waitFor();
    await page.locator('[name="password"]').fill("a-long-fixture-password");
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(origin + "/account/");
    await page
      .locator("[data-account-dashboard]")
      .waitFor({ state: "visible" });
    await page.waitForFunction(
      () =>
        document.querySelector("[data-profile-name]")?.value === "Studio owner",
    );
    await page.locator(".saved-style-card").waitFor();
    assert.equal(
      await page.locator("[data-account-email]").innerText(),
      user.email,
    );
    await page.screenshot({
      path: "artifacts/account-fixture-dashboard.png",
      fullPage: true,
    });
    report.checks.push(
      "Invalid credentials, successful signin, verified profile/library, safe next",
    );
    await page.locator("[data-profile-name]").fill("New studio name");
    await page
      .locator('[data-auth-form="profile"] button[type="submit"]')
      .click();
    await page
      .locator("#profile")
      .getByText("Your profile has been saved.")
      .waitFor();
    assert.equal(name, "New studio name");
    await page.locator(".saved-style-card button").click();
    await page.locator(".saved-style-card").waitFor({ state: "detached" });
    await page.locator("[data-library-empty]").waitFor({ state: "visible" });
    report.checks.push("Owned profile upsert and saved-style removal");
    await page.goto(origin + "/styles/claymorphism/");
    await page.waitForFunction(() =>
      document
        .querySelector("[data-save-status]")
        ?.textContent.includes("first style"),
    );
    await page.locator("[data-save-style]").click();
    await page.waitForFunction(
      () =>
        document
          .querySelector("[data-save-style]")
          ?.getAttribute("aria-pressed") === "true",
    );
    assert.deepEqual(saved, ["claymorphism"]);
    report.checks.push("Save from detail page to verified user library");
    await page.goto(origin + "/account/reset-password/");
    await page.getByText("Choose your new password.").waitFor();
    await page.locator('[name="password"]').fill("an-updated-fixture-password");
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(origin + "/account/");
    assert.ok(
      requests.some(
        (r) =>
          r.path === "/auth/v1/user" &&
          r.method === "PUT" &&
          r.body.password === "an-updated-fixture-password",
      ),
    );
    report.checks.push("Password update only after verified session");
    await page.locator("[data-signout]").click();
    await page.waitForURL(origin + "/account/sign-in/");
    await page.goto(origin + "/account/");
    await page.locator("[data-account-guest]").waitFor({ state: "visible" });
    assert.equal(await page.locator(".saved-style-card").count(), 0);
    assert.equal(await page.locator("[data-profile-name]").inputValue(), "");
    report.checks.push("Signout clears private state and persisted session");
    await page.evaluate(() => {
      localStorage.setItem(
        "sb-127-auth-token-code-verifier",
        JSON.stringify("wrong-latest-verifier"),
      );
      localStorage.setItem(
        "sb-127-auth-token-flow-" + "a".repeat(32) + "-code-verifier",
        JSON.stringify("fixture-verifier"),
      );
    });
    await page.goto(
      origin +
        "/account/callback/?code=fixture-code&next=https://outside.invalid&sb_flow_id=" +
        "a".repeat(32),
    );
    await page.waitForURL(origin + "/account/");
    assert.equal(exchanges, 1);
    assert.ok(!page.url().includes("code="));
    report.checks.push(
      "Single PKCE exchange, specific concurrent flow verifier, URL scrub, safe callback",
    );
    assert.deepEqual(report.errors, []);
    fs.writeFileSync(
      "artifacts/account-fixture-report.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      `${report.checks.length} mocked account-flow groups passed; no Supabase requests.`,
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  fs.writeFileSync(
    "artifacts/account-fixture-failure.json",
    JSON.stringify({ report, error: String(error) }, null, 2),
  );
  process.exitCode = 1;
});
