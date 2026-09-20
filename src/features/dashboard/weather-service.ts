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

export async function getWeather(city?: string | null): Promise<WeatherData> {
  const url = import.meta.env.VITE_WEATHER_API_URL as string | undefined;
  if (!city) return unavailableWeather();

  try {
    if (url) {
      const response = await fetch(`${url}?city=${encodeURIComponent(city)}`);
      if (!response.ok) throw new Error("Não foi possível carregar o clima.");
      return response.json();
    }

    const locationResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`);
    if (!locationResponse.ok) return unavailableWeather();
    const locationPayload = await locationResponse.json() as { results?: Array<{ latitude: number; longitude: number; timezone?: string }> };
    const location = locationPayload.results?.[0];
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
  if (weather.source === "unavailable") return "Clima pronto para integração. Configure a API para exibir dados reais.";
  if (weather.rainChance !== null && weather.rainChance >= 50) return "Há possibilidade de chuva. Vale confirmar visitas externas.";
  if (weather.wind !== null && weather.wind > 35) return "Vento forte. Cuidado com gravações externas.";
  if (weather.temperature !== null) return "Boa condição para organizar visitas e compromissos externos.";
  return "Dados de clima disponíveis parcialmente.";
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
