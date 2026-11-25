interface PaletteVariant {
  readonly bg: string;
  readonly fg: string;
  /** The neutral: it tints the sidebar and every fixed surface. */
  readonly neutral: string;
  readonly neutralHover: string;
  readonly onNeutral: string;
  readonly selection: string;
  /** One per pane slot: `HUES` in layout.ts and the slot rules in z3.css. */
  readonly hues: readonly [string, string, string, string];
  /** The color of the hard, unblurred shadows. */
  readonly shade: string;
}

export interface PaletteTheme {
  readonly id: string;
  readonly label: string;
  readonly light: PaletteVariant;
  readonly dark: PaletteVariant;
}

// One lightness band; the cold pair and the ochre stay muted, so the red is the one loud note.
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
    hues: ["#7ca6b4", "#5782bb", "#c74b43", "#af7940"],
    shade: "#000000",
  },
  light: {
    bg: "#f2f5f7",
    fg: "#111a23",
    neutral: "#3d4c5c",
    neutralHover: "#2a3642",
    onNeutral: "#f6f9fb",
    selection: "#d5dee6",
    hues: ["#306273", "#28528e", "#9a2925", "#7d4f1a"],
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
      ...variant.hues.map((hue, slot) => `--z3-hue-${slot}: ${hue};`),
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
