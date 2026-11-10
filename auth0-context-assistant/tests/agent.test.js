import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { handleUtterance } from "../server/agent.js";
import { _resetStore, updateSettings } from "../server/settingsStore.js";

beforeEach(() => _resetStore());

const user = { sub: "auth0|demo-rahul", name: "Rahul Singh", email: "r@example.com", demo: true };

test("a weather question uses first-party settings then the third-party weather API", async () => {
  const weatherFn = async (city, units) => {
    assert.equal(city, "Bengaluru");
    assert.equal(units, "metric");
    return {
      provider: "Open-Meteo",
      city: "Bengaluru",
      country: "India",
      temperature: 27.4,
      temperatureUnit: "°C",
      humidity: 62,
      windSpeed: 8.1,
      windUnit: "km/h",
      condition: "partly cloudy",
    };
  };
  const result = await handleUtterance({
    user,
    message: "What's the weather like for my usual city?",
    accessToken: "demo-token",
    weatherFn,
  });
  assert.match(result.reply, /Bengaluru/);
  assert.match(result.reply, /27.4°C/);
  assert.match(result.reply, /partly cloudy/);
  assert.match(result.reply, /first-party profile settings/);
  assert.match(result.reply, /Open-Meteo third-party API/);
  const names = result.tools.map((t) => t.name);
  assert.deepEqual(names, ["first_party_settings", "third_party_weather"]);
  assert.equal(result.settings.homeCity, "Bengaluru");
});

test("changing the usual city is reflected in the next weather call", async () => {
  updateSettings(user.sub, { homeCity: "Pune", preferredName: "Rahul" });
  let calledWith;
  const result = await handleUtterance({
    user,
    message: "Tell me the temperature outside",
    weatherFn: async (city, units) => {
      calledWith = { city, units };
      return {
        city,
        country: "India",
        temperature: 30,
        temperatureUnit: "°C",
        humidity: 50,
        windSpeed: 5,
        windUnit: "km/h",
        condition: "clear sky",
      };
    },
  });
  assert.deepEqual(calledWith, { city: "Pune", units: "metric" });
  assert.match(result.reply, /Pune/);
});

test("a calendar request triggers the Token Vault exchange path", async () => {
  const vaultFn = async () => ({
    ok: false,
    source: "local_mock_fallback",
    reason: "TOKEN_VAULT_NOT_CONFIGURED",
    message: "Complete SETUP_NEEDED.md",
    connection: "google-oauth2",
    access_token: "mock-federated-connection-token",
  });
  const result = await handleUtterance({
    user,
    message: "Check my Google calendar using Token Vault",
    vaultFn,
  });
  assert.equal(result.tools.some((t) => t.name === "token_vault_exchange"), true);
  assert.match(result.reply, /Token Vault is not fully configured/);
  assert.match(result.reply, /home city: Bengaluru/);
});
