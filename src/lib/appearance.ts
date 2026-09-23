export type PaletteId = "black-signature" | "tech-graphite" | "coast-pastel" | "minimal-ink" | "custom";

export type ThemeTokens = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  ring: string;
  sidebar: string;
};

export type Palette = {
  id: Exclude<PaletteId, "custom">;
  name: string;
  description: string;
  preview: string;
  swatches: [string, string, string];
  gradient: string;
  light: ThemeTokens;
  dark: ThemeTokens;
};

export const palettes: Palette[] = [
  {
    id: "black-signature",
    name: "Black Signature",
    description: "Preto profundo, dourado e luz suave para uma presença premium.",
    preview: "#C9A34E",
    swatches: ["#07090D", "#C9A34E", "#F7F5F0"],
    gradient: "linear-gradient(135deg, #050609 0%, #17191F 58%, #7A5A20 140%)",
    light: theme("40 24% 97%", "220 22% 8%", "0 0% 100%", "220 22% 8%", "42 58% 50%", "220 25% 7%", "220 18% 10%", "0 0% 100%", "40 14% 92%", "220 8% 42%", "42 58% 50%", "220 25% 7%", "40 14% 84%", "40 14% 84%", "42 58% 50%", "220 28% 5%"),
    dark: theme("220 28% 4%", "40 20% 96%", "220 22% 8%", "40 20% 96%", "42 65% 58%", "220 25% 7%", "220 17% 14%", "40 20% 96%", "220 15% 14%", "40 8% 67%", "42 65% 58%", "220 25% 7%", "220 14% 19%", "220 14% 19%", "42 65% 58%", "220 34% 3%")
  },
  {
    id: "tech-graphite",
    name: "Tech Graphite",
    description: "Grafite frio e ciano preciso, com linguagem digital e profissional.",
    preview: "#12B8C8",
    swatches: ["#101827", "#12B8C8", "#E8F7FA"],
    gradient: "linear-gradient(135deg, #0A101C 0%, #142337 58%, #087D89 145%)",
    light: theme("205 38% 97%", "220 34% 10%", "0 0% 100%", "220 34% 10%", "186 82% 38%", "0 0% 100%", "220 27% 15%", "0 0% 100%", "205 25% 92%", "214 12% 43%", "186 82% 38%", "0 0% 100%", "207 24% 85%", "207 24% 85%", "186 82% 38%", "220 35% 8%"),
    dark: theme("222 36% 6%", "205 28% 96%", "221 30% 10%", "205 28% 96%", "185 82% 50%", "222 36% 7%", "218 24% 16%", "205 28% 96%", "218 22% 15%", "207 14% 68%", "185 82% 50%", "222 36% 7%", "216 20% 21%", "216 20% 21%", "185 82% 50%", "223 42% 4%")
  },
  {
    id: "coast-pastel",
    name: "Costa Pastel",
    description: "Verde sereno e amarelo solar, inspirado no mercado do litoral.",
    preview: "#4F9D78",
    swatches: ["#24634A", "#F2CD5C", "#EFF8F1"],
    gradient: "linear-gradient(135deg, #173E31 0%, #2D7456 64%, #C9A934 150%)",
    light: theme("140 30% 97%", "157 28% 12%", "0 0% 100%", "157 28% 12%", "151 38% 43%", "0 0% 100%", "49 86% 62%", "157 32% 13%", "142 26% 91%", "155 11% 40%", "49 86% 62%", "157 32% 13%", "143 21% 83%", "143 21% 83%", "151 38% 43%", "157 42% 13%"),
    dark: theme("158 30% 6%", "135 25% 95%", "157 25% 10%", "135 25% 95%", "148 48% 56%", "158 35% 7%", "48 77% 58%", "157 32% 13%", "156 20% 15%", "143 13% 69%", "48 77% 58%", "157 32% 13%", "154 18% 21%", "154 18% 21%", "148 48% 56%", "159 38% 4%")
  },
  {
    id: "minimal-ink",
    name: "Minimal Ink",
    description: "Branco, cinza e tinta escura para máxima clareza e foco nos dados.",
    preview: "#20242C",
    swatches: ["#171A21", "#98A2B3", "#F7F8FA"],
    gradient: "linear-gradient(135deg, #101217 0%, #2B303A 100%)",
    light: theme("220 14% 97%", "222 25% 10%", "0 0% 100%", "222 25% 10%", "222 20% 18%", "0 0% 100%", "220 13% 92%", "222 25% 10%", "220 13% 93%", "220 8% 43%", "220 13% 88%", "222 25% 10%", "220 13% 86%", "220 13% 86%", "222 20% 18%", "222 26% 8%"),
    dark: theme("222 22% 6%", "220 18% 96%", "222 18% 10%", "220 18% 96%", "220 16% 88%", "222 24% 8%", "220 13% 16%", "220 18% 96%", "220 13% 15%", "220 9% 68%", "220 13% 20%", "220 18% 96%", "220 12% 21%", "220 12% 21%", "220 16% 72%", "222 28% 4%")
  }
];

function theme(background: string, foreground: string, card: string, cardForeground: string, primary: string, primaryForeground: string, secondary: string, secondaryForeground: string, muted: string, mutedForeground: string, accent: string, accentForeground: string, border: string, input: string, ring: string, sidebar: string): ThemeTokens {
  return { background, foreground, card, cardForeground, primary, primaryForeground, secondary, secondaryForeground, muted, mutedForeground, accent, accentForeground, border, input, ring, sidebar };
}

export function hexToHsl(hex: string) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized;
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
  return lightness > 58 ? "222 25% 8%" : "0 0% 100%";
}

export function getPalette(id: PaletteId) {
  return palettes.find((palette) => palette.id === id) ?? palettes[3];
}
