export type WeatherData = {
  temperature: number | null;
  feelsLike: number | null;
  max: number | null;
  min: number | null;
  rainChance: number | null;
  condition: string | null;
  wind: number | null;
  source: "api" | "open-meteo" | "unavailable";
};

export type DailyWeather = {
  date: string;
  max: number | null;
  min: number | null;
  rainChance: number | null;
  condition: string | null;
  sunrise: string | null;
  sunset: string | null;
};

export async function getWeather(city?: string | null): Promise<WeatherData> {
  const url = import.meta.env.VITE_WEATHER_API_URL as string | undefined;
  if (!city) return unavailableWeather();

  try {
    if (url) {
      const response = await fetch(`${url}?city=${encodeURIComponent(city)}`);
      if (!response.ok) throw new Error("Não foi possível carregar o clima.");
      return response.json();
    }

    const location = await findLocation(city);
    if (!location) return unavailableWeather();

    const params = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: location.timezone ?? "auto",
      forecast_days: "1"
    });
    const forecastResponse = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!forecastResponse.ok) return unavailableWeather();
    const forecast = await forecastResponse.json() as {
      current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
      daily?: {
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_probability_max?: number[];
      };
    };

    return {
      temperature: round(forecast.current?.temperature_2m),
      feelsLike: round(forecast.current?.apparent_temperature),
      max: round(forecast.daily?.temperature_2m_max?.[0]),
      min: round(forecast.daily?.temperature_2m_min?.[0]),
      rainChance: round(forecast.daily?.precipitation_probability_max?.[0]),
      condition: weatherCodeLabel(forecast.current?.weather_code),
      wind: round(forecast.current?.wind_speed_10m),
      source: "open-meteo"
    };
  } catch {
    return unavailableWeather();
  }
}

export function weatherMessage(weather: WeatherData) {
  if (weather.source === "unavailable") return "Clima indisponível no momento. Tente novamente em alguns minutos.";
  if (weather.rainChance !== null && weather.rainChance >= 50) return "Há possibilidade de chuva. Vale confirmar visitas externas.";
  if (weather.wind !== null && weather.wind > 35) return "Vento forte. Cuidado com gravações externas.";
  if (weather.temperature !== null) return "Boa condição para organizar visitas e compromissos externos.";
  return "Dados de clima disponíveis parcialmente.";
}

export async function getWeatherForecast(city: string | null | undefined, from: string, to: string): Promise<DailyWeather[]> {
  if (!city) return [];

  try {
    const location = await findLocation(city);
    if (!location) return [];

    const params = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
      timezone: location.timezone ?? "auto",
      start_date: from,
      end_date: to
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!response.ok) return [];
    const payload = await response.json() as {
      daily?: {
        time?: string[];
        weather_code?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_probability_max?: number[];
        sunrise?: string[];
        sunset?: string[];
      };
    };

    return (payload.daily?.time ?? []).map((date, index) => ({
      date,
      max: round(payload.daily?.temperature_2m_max?.[index]),
      min: round(payload.daily?.temperature_2m_min?.[index]),
      rainChance: round(payload.daily?.precipitation_probability_max?.[index]),
      condition: weatherCodeLabel(payload.daily?.weather_code?.[index]),
      sunrise: timeOnly(payload.daily?.sunrise?.[index]),
      sunset: timeOnly(payload.daily?.sunset?.[index])
    }));
  } catch {
    return [];
  }
}

async function findLocation(city: string) {
  const candidates = Array.from(new Set([city.trim(), city.split(",")[0]?.trim()].filter(Boolean)));
  for (const candidate of candidates) {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(candidate)}&count=1&language=pt&format=json`);
    if (!response.ok) continue;
    const payload = await response.json() as { results?: Array<{ latitude: number; longitude: number; timezone?: string }> };
    if (payload.results?.[0]) return payload.results[0];
  }
  return null;
}

function unavailableWeather(): WeatherData {
  return {
    temperature: null,
    feelsLike: null,
    max: null,
    min: null,
    rainChance: null,
    condition: null,
    wind: null,
    source: "unavailable"
  };
}

function round(value?: number) {
  return value === undefined || Number.isNaN(value) ? null : Math.round(value);
}

function timeOnly(value?: string) {
  if (!value) return null;
  const time = value.includes("T") ? value.split("T")[1] : value;
  return time?.slice(0, 5) || null;
}

function weatherCodeLabel(code?: number) {
  if (code === undefined) return null;
  if (code === 0) return "Ensolarado";
  if ([1, 2].includes(code)) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if ([45, 48].includes(code)) return "Neblina";
  if ([51, 53, 55, 56, 57].includes(code)) return "Garoa";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Chuva";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Neve";
  if ([95, 96, 99].includes(code)) return "Temporal";
  return "Condição atual";
}
