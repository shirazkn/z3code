import { HUES } from "./layout";

interface PaletteVariant {
  readonly bg: string;
  readonly fg: string;
  /** The neutral: it tints the sidebar and every fixed surface. */
  readonly neutral: string;
  readonly neutralHover: string;
  readonly onNeutral: string;
  readonly selection: string;
  /** Pane slot `k` takes `hues[k % hues.length]`. */
  readonly hues: ReadonlyArray<string>;
  /** Text on a hue. */
  readonly onHue: string;
  /** The color of the hard, unblurred shadows. */
  readonly shade: string;
}

export interface PaletteTheme {
  readonly id: string;
  readonly label: string;
  readonly light: PaletteVariant;
  readonly dark: PaletteVariant;
}

// Ice, glacier, blood, flame, dusk and bone, on a blue-black night or a snow field.
const KIDA: PaletteTheme = {
  id: "kida",
  label: "kida",
  dark: {
    bg: "#05070a",
    fg: "#e4ebf1",
    neutral: "#b4c1cf",
    neutralHover: "#d3dce5",
    onNeutral: "#0a0f16",
    selection: "#1c2733",
    hues: ["#8cc4d8", "#4d8fd6", "#e0483b", "#e27d2f", "#8474cf", "#cdbb8c"],
    onHue: "#05070a",
    shade: "#000000",
  },
  light: {
    bg: "#f2f5f7",
    fg: "#111a23",
    neutral: "#3d4c5c",
    neutralHover: "#2a3642",
    onNeutral: "#f6f9fb",
    selection: "#d5dee6",
    hues: ["#276f87", "#2b62a8", "#b8322a", "#a84f0e", "#5d4fa3", "#806a2a"],
    onHue: "#ffffff",
    shade: "rgb(17 26 35 / 0.3)",
  },
};

export const PALETTE_THEMES: ReadonlyArray<PaletteTheme> = [KIDA];

export function paletteOf(themeId: string, mode: "light" | "dark"): ReadonlyArray<string> | null {
  return PALETTE_THEMES.find((theme) => theme.id === themeId)?.[mode].hues ?? null;
}

/** The variables z3.css reads to color each pane; a theme without them colors no pane. */
export function paletteCss(theme: PaletteTheme): string {
  const vars = (variant: PaletteVariant) =>
    [
      ...Array.from({ length: HUES }, (_, slot) => {
        return `--z3-hue-${slot}: ${variant.hues[slot % variant.hues.length]};`;
      }),
      `--z3-on-hue: ${variant.onHue};`,
      `--z3-shade: ${variant.shade};`,
    ].join(" ");
  const root = `html[data-theme-id="${theme.id}"]`;
  // Flat and crisp: shadows have no blur, and only the tab bar fades, to black at its top.
  const shadows = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"].map(
    (size, index) => `--shadow-${size}: 0 ${Math.ceil((index + 1) / 2)}px 0 0 var(--z3-shade);`,
  );
  return [
    `${root} { ${vars(theme.light)} ${shadows.join(" ")} }`,
    `${root}.dark { ${vars(theme.dark)} }`,
    `${root} [class*="shadow-composer"] { --tw-shadow: 0 2px 0 0 var(--z3-shade); }`,
    `${root}.dark [data-z3-host] { background-image: linear-gradient(to bottom, var(--z3-edge)); background-size: auto; }`,
  ].join(" ");
}
