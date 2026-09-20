export type PaletteId = "mv-gold" | "broker-orange" | "premium-amber" | "custom";

export type Palette = {
  id: PaletteId;
  name: string;
  description: string;
  light: string;
  dark: string;
  preview: string;
};

export const palettes: Palette[] = [
  {
    id: "mv-gold",
    name: "MV Gold",
    description: "Preto, dourado e branco da marca.",
    light: "42 78% 56%",
    dark: "42 78% 60%",
    preview: "#daa539"
  },
  {
    id: "broker-orange",
    name: "Broker Orange",
    description: "Laranja mais vibrante para ações rápidas.",
    light: "28 92% 54%",
    dark: "30 95% 60%",
    preview: "#f47c20"
  },
  {
    id: "premium-amber",
    name: "Premium Amber",
    description: "Âmbar sofisticado com contraste suave.",
    light: "37 86% 50%",
    dark: "38 90% 58%",
    preview: "#d99112"
  },
  {
    id: "custom",
    name: "Personalizada",
    description: "Use a cor principal da sua operação.",
    light: "28 92% 54%",
    dark: "30 95% 60%",
    preview: "#f47c20"
  }
];

export function hexToHsl(hex: string) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;
  const red = parseInt(value.slice(0, 2), 16) / 255;
  const green = parseInt(value.slice(2, 4), 16) / 255;
  const blue = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
    if (max === green) hue = (blue - red) / delta + 2;
    if (max === blue) hue = (red - green) / delta + 4;
    hue /= 6;
  }

  return `${Math.round(hue * 360)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

export function primaryForegroundFor(hsl: string) {
  const lightness = Number(hsl.match(/(\d+)%$/)?.[1] ?? 50);
  return lightness > 58 ? "24 20% 7%" : "0 0% 100%";
}

export function getPalette(id: PaletteId) {
  return palettes.find((palette) => palette.id === id) ?? palettes[0];
}
