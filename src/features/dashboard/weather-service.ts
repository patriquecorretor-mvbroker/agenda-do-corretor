export type WeatherData = {
  temperature: number | null;
  feelsLike: number | null;
  max: number | null;
  min: number | null;
  rainChance: number | null;
  condition: string | null;
  wind: number | null;
  source: "api" | "unavailable";
};

export async function getWeather(city?: string | null): Promise<WeatherData> {
  const url = import.meta.env.VITE_WEATHER_API_URL as string | undefined;
  if (!url || !city) {
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

  const response = await fetch(`${url}?city=${encodeURIComponent(city)}`);
  if (!response.ok) throw new Error("Não foi possível carregar o clima.");
  return response.json();
}

export function weatherMessage(weather: WeatherData) {
  if (weather.source === "unavailable") return "Clima pronto para integração. Configure a API para exibir dados reais.";
  if (weather.rainChance !== null && weather.rainChance >= 50) return "Há possibilidade de chuva. Vale confirmar visitas externas.";
  if (weather.wind !== null && weather.wind > 35) return "Vento forte. Cuidado com gravações externas.";
  if (weather.temperature !== null) return "Boa condição para organizar visitas e compromissos externos.";
  return "Dados de clima disponíveis parcialmente.";
}
