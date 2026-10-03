import { afterEach, describe, expect, it, vi } from "vitest";
import { getWeather, getWeatherForecast, weatherMessage } from "@/features/dashboard/weather-service";

describe("weather service", () => {
  afterEach(() => vi.restoreAllMocks());

  it("retries geocoding without the state suffix", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ latitude: -29.76, longitude: -50.03, timezone: "America/Sao_Paulo" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        current: { temperature_2m: 23.6, apparent_temperature: 24.1, weather_code: 2, wind_speed_10m: 14.4 },
        daily: { temperature_2m_max: [26.2], temperature_2m_min: [18.1], precipitation_probability_max: [20] }
      }), { status: 200 }));

    const weather = await getWeather("Capão da Canoa, RS");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain("Cap%C3%A3o%20da%20Canoa");
    expect(weather).toMatchObject({ temperature: 24, condition: "Parcialmente nublado", source: "open-meteo" });
  });

  it("does not invent weather when the provider is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const weather = await getWeather("Capão da Canoa");
    expect(weather.temperature).toBeNull();
    expect(weatherMessage(weather)).toContain("indisponível");
  });

  it("returns dated forecast with sunrise and sunset", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ latitude: -29.76, longitude: -50.03, timezone: "America/Sao_Paulo" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ daily: {
        time: ["2026-10-03"], weather_code: [0], temperature_2m_max: [24.4], temperature_2m_min: [16.2],
        precipitation_probability_max: [10], sunrise: ["2026-10-03T05:51"], sunset: ["2026-10-03T18:21"]
      } }), { status: 200 }));

    const forecast = await getWeatherForecast("Capão da Canoa", "2026-10-03", "2026-10-03");
    expect(forecast[0]).toEqual({ date: "2026-10-03", max: 24, min: 16, rainChance: 10, condition: "Ensolarado", sunrise: "05:51", sunset: "18:21" });
  });
});
