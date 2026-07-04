/* ==========================================================================
   Tableau de Bord Météo Dynamique — app.js
   Étape 1 : géocodage (nom de ville -> coordonnées)
   Étape 2 : prévisions météo (coordonnées -> conditions actuelles)
   ========================================================================== */

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// Éléments du DOM
const form = document.getElementById("search-form");
const input = document.getElementById("city-input");
const errorMsg = document.getElementById("city-error");

const loader = document.getElementById("loader");
const emptyState = document.getElementById("empty-state");
const messageBox = document.getElementById("message-box");
const card = document.getElementById("weather-card");

const cityNameEl = document.getElementById("city-name");
const tempEl = document.getElementById("weather-temp");
const statusEl = document.getElementById("weather-status");
const windEl = document.getElementById("weather-wind");
const updatedEl = document.getElementById("weather-updated");
const iconEl = document.getElementById("weather-icon");

/**
 * Décode un code météo WMO (weathercode) en texte clair et en pictogramme.
 * Référence : https://open-meteo.com/en/docs (WMO Weather interpretation codes)
 */
function decodeWeatherCode(code) {
  const table = {
    0: { label: "Ensoleillé", emoji: "☀️" },
    1: { label: "Plutôt ensoleillé", emoji: "🌤️" },
    2: { label: "Partiellement nuageux", emoji: "⛅" },
    3: { label: "Nuageux", emoji: "☁️" },
    45: { label: "Brumeux", emoji: "🌫️" },
    48: { label: "Brumeux", emoji: "🌫️" },
    51: { label: "Pluvieux", emoji: "🌦️" },
    53: { label: "Pluvieux", emoji: "🌦️" },
    55: { label: "Pluvieux", emoji: "🌦️" },
    56: { label: "Pluvieux", emoji: "🌧️" },
    57: { label: "Pluvieux", emoji: "🌧️" },
    61: { label: "Pluvieux", emoji: "🌧️" },
    63: { label: "Pluvieux", emoji: "🌧️" },
    65: { label: "Pluvieux", emoji: "🌧️" },
    66: { label: "Pluvieux", emoji: "🌧️" },
    67: { label: "Pluvieux", emoji: "🌧️" },
    71: { label: "Neigeux", emoji: "🌨️" },
    73: { label: "Neigeux", emoji: "🌨️" },
    75: { label: "Neigeux", emoji: "🌨️" },
    77: { label: "Neigeux", emoji: "🌨️" },
    80: { label: "Pluvieux", emoji: "🌧️" },
    81: { label: "Pluvieux", emoji: "🌧️" },
    82: { label: "Pluvieux", emoji: "🌧️" },
    85: { label: "Neigeux", emoji: "🌨️" },
    86: { label: "Neigeux", emoji: "🌨️" },
    95: { label: "Orageux", emoji: "⛈️" },
    96: { label: "Orageux", emoji: "⛈️" },
    99: { label: "Orageux", emoji: "⛈️" },
  };

  return table[code] || { label: "Conditions inconnues", emoji: "❔" };
}

/**
 * Affiche un message d'erreur de validation sur le champ de recherche.
 */
function showFieldError(message) {
  input.setAttribute("aria-invalid", "true");
  errorMsg.textContent = message;
  errorMsg.hidden = false;
}

/**
 * Réinitialise l'état d'erreur du champ de recherche.
 */
function clearFieldError() {
  input.removeAttribute("aria-invalid");
  errorMsg.textContent = "";
  errorMsg.hidden = true;
}

input.addEventListener("input", () => {
  if (input.value.trim().length > 0) {
    clearFieldError();
  }
});

/**
 * Bascule l'affichage entre les différents états de la zone de résultat :
 * "idle", "loading", "error", "success"
 */
function setResultState(state) {
  loader.hidden = state !== "loading";
  emptyState.hidden = state !== "idle";
  messageBox.hidden = state !== "error";
  card.hidden = state !== "success";
}

function showResultError(message) {
  messageBox.textContent = message;
  setResultState("error");
}

/**
 * Injecte les données météo dans la carte, en n'utilisant que textContent
 * pour toute donnée issue de l'API (aucun innerHTML, pas de faille XSS).
 */
function renderWeather(place, weather) {
  const cityLabel = place.country ? `${place.name}, ${place.country}` : place.name;
  cityNameEl.textContent = cityLabel;

  tempEl.textContent = `${weather.temperature}°C`;
  windEl.textContent = `${weather.windspeed} km/h`;

  const { label, emoji } = decodeWeatherCode(weather.weathercode);
  statusEl.textContent = label;
  iconEl.textContent = emoji; // emoji fixe issu de notre table, pas de donnée brute API

  const now = new Date();
  updatedEl.textContent = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  setResultState("success");
}

/**
 * Étape 1 : résout le nom de ville en coordonnées géographiques.
 */
async function geocodeCity(cityName) {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(cityName)}&count=1&language=fr&format=json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("geocoding-failed");
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    return null;
  }

  return data.results[0];
}

/**
 * Étape 2 : récupère les conditions météo actuelles pour des coordonnées.
 */
async function fetchWeather(latitude, longitude) {
  const url = `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("forecast-failed");
  }

  const data = await response.json();
  return data.current_weather;
}

async function searchCity(cityName) {
  setResultState("loading");

  try {
    const place = await geocodeCity(cityName);

    if (!place) {
      showResultError(
        "Aucun résultat trouvé pour cette recherche. Veuillez vérifier l'orthographe."
      );
      return;
    }

    const weather = await fetchWeather(place.latitude, place.longitude);

    if (!weather) {
      showResultError(
        "Aucun résultat trouvé pour cette recherche. Veuillez vérifier l'orthographe."
      );
      return;
    }

    renderWeather(place, weather);
  } catch (error) {
    showResultError(
      "Connexion impossible. Veuillez vérifier votre accès à internet."
    );
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const value = input.value.trim();

  if (value.length === 0) {
    showFieldError("Veuillez entrer le nom d'une ville avant de lancer la recherche.");
    return;
  }

  clearFieldError();
  searchCity(value);
});
