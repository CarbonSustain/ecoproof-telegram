const API_BASE_URLS = Object.freeze({
  OPEN_WEATHER: "https://api.openweathermap.org/data/2.5",
  ICP_AGENT: "http://127.0.0.1:4943",
  TELEGRAM: "https://api.telegram.org",
});

const ENDPOINTS = Object.freeze({
  OW_WEATHER: `${API_BASE_URLS.OPEN_WEATHER}/weather`,
  OW_FORECAST: `${API_BASE_URLS.OPEN_WEATHER}/forecast`,
});

function getOWWeatherUrl(params) {
  return `${ENDPOINTS.OW_WEATHER}?${params.toString()}`;
}

function getTelegramFileUrl(filePath) {
  const botToken = process.env.BOT_TOKEN;
  return `${API_BASE_URLS.TELEGRAM}/file/bot${botToken}/${filePath}`;
}

function getCanisterCallUrl(canisterId) {
  return `${API_BASE_URLS.ICP_AGENT}/api/v2/canister/${canisterId}/call`;
}

module.exports = { API_BASE_URLS, ENDPOINTS, getOWWeatherUrl, getTelegramFileUrl, getCanisterCallUrl };
