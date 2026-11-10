/** First-party user profile settings, keyed by the Auth0 `sub` claim. */

const store = new Map();

export const DEFAULT_SETTINGS = {
  preferredName: "Rahul",
  homeCity: "Bengaluru",
  units: "metric",
  briefingTone: "concise",
};

export function getSettings(sub) {
  if (!store.has(sub)) {
    store.set(sub, { ...DEFAULT_SETTINGS });
  }
  return { ...store.get(sub) };
}

export function updateSettings(sub, patch) {
  const current = getSettings(sub);
  const next = { ...current };
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (patch[key] !== undefined && patch[key] !== null && String(patch[key]).trim()) {
      next[key] = String(patch[key]).trim();
    }
  }
  if (!["metric", "imperial"].includes(next.units)) {
    next.units = current.units;
  }
  store.set(sub, next);
  return { ...next };
}

export function _resetStore() {
  store.clear();
}
