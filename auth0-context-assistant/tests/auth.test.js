import { test } from "node:test";
import assert from "node:assert/strict";
import { authenticate, isDemoMode } from "../server/auth.js";

test("demo mode is detected from AUTH_DEMO=1", () => {
  assert.equal(isDemoMode({ AUTH_DEMO: "1" }), true);
  assert.equal(isDemoMode({ AUTH_DEMO: "0" }), false);
});

test("demo mode returns the local mock user without a real JWT", async () => {
  const user = await authenticate({ headers: {} }, { AUTH_DEMO: "1" });
  assert.equal(user.sub, "auth0|demo-rahul");
  assert.equal(user.demo, true);
  assert.equal(user.email, "rahulsinghx2001@gmail.com");
});

test("non-demo mode rejects a missing bearer token", async () => {
  await assert.rejects(
    () => authenticate({ headers: {} }, { AUTH_DEMO: "0", AUTH0_DOMAIN: "x", AUTH0_AUDIENCE: "y" }),
    /Missing Bearer token/
  );
});
