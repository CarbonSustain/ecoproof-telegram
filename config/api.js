export const API_BASE_URLS = Object.freeze({
  OPEN_WEATHER: "https://api.openweathermap.org/data/2.5",
  ICP_AGENT: "http://127.0.0.1:4943",
  TELEGRAM: "https://api.telegram.org",
});

export const ENDPOINTS = Object.freeze({
  OW_WEATHER: `${API_BASE_URLS.OPEN_WEATHER}/weather`,
  OW_FORECAST: `${API_BASE_URLS.OPEN_WEATHER}/forecast`,
});

export function getOWWeatherUrl(params) {
  return `${ENDPOINTS.WEATHER}?${params.toString()}`;
}

export function getTelegramFileUrl(filePath) {
  const botToken = process.env.BOT_TOKEN;
  return `${API_BASE_URLS.TELEGRAM}/file/bot${botToken}/${filePath}`;
}

export function getCanisterCallUrl(canisterId) {
  return `${API_BASE_URLS.ICP_AGENT}/api/v2/canister/${canisterId}/call`;
}
