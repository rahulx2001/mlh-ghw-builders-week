import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getSettings, updateSettings, _resetStore, DEFAULT_SETTINGS } from "../server/settingsStore.js";

beforeEach(() => _resetStore());

test("new users receive default first-party settings", () => {
  const s = getSettings("auth0|demo-rahul");
  assert.deepEqual(s, DEFAULT_SETTINGS);
  assert.equal(s.homeCity, "Bengaluru");
});

test("updateSettings only accepts known fields and valid units", () => {
  updateSettings("u1", { homeCity: "Mumbai", units: "imperial", junk: "nope" });
  const s = getSettings("u1");
  assert.equal(s.homeCity, "Mumbai");
  assert.equal(s.units, "imperial");
  assert.equal(s.junk, undefined);
  updateSettings("u1", { units: "kelvin" });
  assert.equal(getSettings("u1").units, "imperial");
});
