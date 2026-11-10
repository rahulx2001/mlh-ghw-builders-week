/**
 * Deterministic local responder (no LLM API keys).
 * It uses the authenticated user's first-party settings, then a third-party
 * weather API, to complete a single context-preserving turn.
 */

import { getSettings } from "./settingsStore.js";
import { fetchWeather } from "./weather.js";
import { exchangeToken } from "./tokenVault.js";

export async function handleUtterance({ user, message, accessToken, weatherFn = fetchWeather, vaultFn = exchangeToken }) {
  const settings = getSettings(user.sub);
  const text = String(message || "").trim();
  if (!text) {
    return {
      reply: `Hi ${settings.preferredName}. Ask me about the weather for your usual city and I'll use your saved settings, then call a third-party weather API.`,
      settings,
      tools: [],
    };
  }

  const wantsWeather = /weather|forecast|temperature|rain|umbrella|outside/i.test(text);
  const tools = [
    {
      name: "first_party_settings",
      description: "Retrieve the signed-in user's profile settings from the first-party API.",
      input: { sub: user.sub },
      output: settings,
    },
  ];

  // Token Vault is used when the user asks the assistant to act on a
  // connected third-party account (e.g. calendar). Weather itself is public.
  const wantsDelegated = /calendar|token vault|connected account|google/i.test(text);
  if (wantsDelegated) {
    const vault = await vaultFn(accessToken || "demo-token");
    tools.push({
      name: "token_vault_exchange",
      description: "Exchange the user's Auth0 access token for a federated connection token.",
      output: {
        source: vault.source,
        ok: vault.ok,
        reason: vault.reason,
        message: vault.message,
        connection: vault.connection,
        has_access_token: Boolean(vault.access_token),
      },
    });
    if (!wantsWeather) {
      const note = vault.ok
        ? `I redeemed a Token Vault token for the ${vault.connection} connection and can call that API with your delegated permissions.`
        : `Token Vault is not fully configured in the Auth0 dashboard yet (${vault.reason}). ${vault.message}`;
      return {
        reply: `${settings.preferredName}, I loaded your profile settings first (home city: ${settings.homeCity}, units: ${settings.units}). ${note}`,
        settings,
        tools,
      };
    }
  }

  if (wantsWeather) {
    const weather = await weatherFn(settings.homeCity, settings.units);
    tools.push({
      name: "third_party_weather",
      description: "Call the Open-Meteo third-party API using the home city from the first-party settings.",
      input: { city: settings.homeCity, units: settings.units },
      output: weather,
    });
    const place = weather.country ? `${weather.city}, ${weather.country}` : weather.city;
    const reply =
      `${settings.preferredName}, I looked up your first-party profile settings and your usual city is ${settings.homeCity} ` +
      `(units: ${settings.units}). I then called the Open-Meteo third-party API for that city: ` +
      `it's currently ${weather.temperature}${weather.temperatureUnit} and ${weather.condition} in ${place}, ` +
      `with humidity ${weather.humidity}% and wind ${weather.windSpeed} ${weather.windUnit}.`;
    return { reply, settings, weather, tools };
  }

  return {
    reply:
      `${settings.preferredName}, you're signed in and I can see your first-party settings ` +
      `(usual city: ${settings.homeCity}, units: ${settings.units}, tone: ${settings.briefingTone}). ` +
      `Try “What's the weather like for my usual city?” and I'll call a third-party weather API with those settings.`,
    settings,
    tools,
  };
}
