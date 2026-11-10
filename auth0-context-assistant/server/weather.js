/** Third-party weather client (Open-Meteo). No API key required. */

const GEOCODE = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";

export async function fetchWeather(city, units = "metric") {
  const geoUrl = `${GEOCODE}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const geo = await getJson(geoUrl);
  const place = geo?.results?.[0];
  if (!place) {
    const error = new Error(`No geocoding result for "${city}"`);
    error.code = "CITY_NOT_FOUND";
    throw error;
  }

  const tempUnit = units === "imperial" ? "fahrenheit" : "celsius";
  const windUnit = units === "imperial" ? "mph" : "kmh";
  const forecastUrl =
    `${FORECAST}?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
    `&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}&timezone=auto`;
  const forecast = await getJson(forecastUrl);
  const current = forecast?.current;
  if (!current) {
    throw new Error("Weather API returned no current conditions");
  }
  return {
    provider: "Open-Meteo",
    city: place.name,
    country: place.country || "",
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: forecast.timezone,
    temperature: current.temperature_2m,
    temperatureUnit: units === "imperial" ? "°F" : "°C",
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    windUnit: units === "imperial" ? "mph" : "km/h",
    weatherCode: current.weather_code,
    condition: weatherCodeToText(current.weather_code),
    observedAt: current.time,
  };
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`);
  }
  return res.json();
}

export function weatherCodeToText(code) {
  const map = {
    0: "clear sky",
    1: "mainly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "fog",
    48: "depositing rime fog",
    51: "light drizzle",
    53: "moderate drizzle",
    55: "dense drizzle",
    61: "slight rain",
    63: "moderate rain",
    65: "heavy rain",
    71: "slight snow",
    73: "moderate snow",
    75: "heavy snow",
    80: "slight rain showers",
    81: "moderate rain showers",
    82: "violent rain showers",
    95: "thunderstorm",
    96: "thunderstorm with slight hail",
    99: "thunderstorm with heavy hail",
  };
  return map[code] || `weather code ${code}`;
}
