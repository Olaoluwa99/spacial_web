import { test } from "node:test";
import assert from "node:assert/strict";
import {
  safeNextPath,
  publicClientConfig,
  validDisplayName,
  authErrorMessage,
  metadataDisplayName,
} from "../src/lib/account-utils.ts";

test("account destinations reject external origins, path tricks and auth loops", () => {
  for (const path of [
    "https://outside.test/",
    "//outside.test/",
    "/\\outside.test/",
    "/%2f%2foutside.test/",
    "/account/sign-in/",
    "/account/callback/?code=secret",
    "/styles/../../account/callback/",
    "/styles/\n",
    "javascript:alert(1)",
    "/guide/",
    null,
  ])
    assert.equal(safeNextPath(path), "/account/");
  assert.equal(
    safeNextPath("/styles/glassmorphism/?from=library#download"),
    "/styles/glassmorphism/?from=library#download",
  );
  assert.equal(safeNextPath("/styles/"), "/styles/");
});
test("client configuration accepts public keys and rejects privileged or malformed inputs", () => {
  assert.deepEqual(
    publicClientConfig("https://example.supabase.co", "sb_publishable_test"),
    { url: "https://example.supabase.co", key: "sb_publishable_test" },
  );
  assert.ok(
    publicClientConfig("http://127.0.0.1:54321/", "sb_publishable_local"),
  );
  for (const [url, key] of [
    [undefined, undefined],
    ["https://example.supabase.co", "sb_secret_test"],
    ["https://example.supabase.co", "eyJhbGciOiJIUzI1NiJ9.test.signature"],
    ["http://example.supabase.co", "sb_publishable_test"],
    ["https://user:pass@example.supabase.co", "sb_publishable_test"],
    ["https://example.supabase.co/auth/v1", "sb_publishable_test"],
  ])
    assert.equal(publicClientConfig(url, key), null);
});
test("display-name limits count Unicode characters, retain text and trim whitespace", () => {
  assert.equal(validDisplayName("  Ola  "), "Ola");
  assert.equal(validDisplayName("🪷".repeat(80)), "🪷".repeat(80));
  assert.equal(validDisplayName("🪷".repeat(81)), null);
  assert.equal(validDisplayName(""), null);
  assert.equal(validDisplayName("  "), null);
});
test("profile metadata is accepted only as bounded presentation text", () => {
  for (const value of [
    null,
    undefined,
    false,
    4,
    {},
    ["Name"],
    " ",
    "x".repeat(81),
  ])
    assert.equal(metadataDisplayName(value), null);
  assert.equal(metadataDisplayName("  Ola  "), "Ola");
});
test("auth failures use actionable copy and never expose service messages", () => {
  assert.match(
    authErrorMessage({ code: "bad_code_verifier" }),
    /different browser/,
  );
  assert.match(
    authErrorMessage({ code: "email_not_confirmed" }),
    /Confirm your email/,
  );
  assert.match(
    authErrorMessage({ code: "invalid_credentials" }),
    /not recognised/,
  );
  assert.equal(authErrorMessage({ code: "unknown" }), authErrorMessage(null));
});
