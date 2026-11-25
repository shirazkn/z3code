interface PaletteVariant {
  readonly bg: string;
  readonly fg: string;
  /** The neutral: it tints the sidebar and every fixed surface. */
  readonly neutral: string;
  readonly neutralHover: string;
  readonly onNeutral: string;
  readonly selection: string;
  /** One per pane slot: `HUES` in layout.ts. */
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

// A pane's own accent and flat ground. Scoped to the theme: a `var()` of a missing hue would
// blank these variables in every other theme.
const PANE_RULES = `
  --primary: var(--z3-hue);
  --z3-on-hue: oklch(from var(--z3-hue) clamp(0, (0.6 - l) * 999, 1) 0 0);
  --primary-foreground: var(--z3-on-hue);
  --message-action: var(--z3-hue);
  --message-action-foreground: var(--z3-on-hue);
  --message-action-hover: color-mix(in oklab, var(--z3-hue) 85%, var(--foreground));
  --ring: var(--z3-hue);
  --terminal-cursor: var(--z3-hue);
  --z3-hue-line: inset 0 1px 0 var(--z3-hue);
  --z3-pane: color-mix(in oklab, var(--z3-hue) 15%, var(--app-theme-canvas));
  --background: var(--z3-pane);
  --app-chrome-background: var(--z3-pane);
  --toolbar-background: var(--z3-pane);
  --message-surface: color-mix(in oklab, var(--z3-hue) 16%, var(--z3-pane));
  background-color: var(--z3-pane);`;

/** The theme's CSS: its hues, each pane's colors (`data-z3-hue`, PaneHost.tsx) and its flat look. */
export function paletteCss(theme: PaletteTheme): string {
  const vars = (variant: PaletteVariant) =>
    [
      ...variant.hues.map((hue, slot) => `--z3-hue-${slot}: ${hue};`),
      `--z3-shade: ${variant.shade};`,
    ].join(" ");
  const root = `html[data-theme-id="${theme.id}"]`;
  // Flat and crisp: shadows have no blur. Only the tab bar fades: a dark sidebar shade, black at its top.
  const shadows = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"].map(
    (size, index) => `--shadow-${size}: 0 ${Math.ceil((index + 1) / 2)}px 0 0 var(--z3-shade);`,
  );
  return [
    `${root} { ${vars(theme.light)} ${shadows.join(" ")} }`,
    `${root}.dark { ${vars(theme.dark)} }`,
    ...theme.dark.hues.map(
      (_, slot) => `${root} [data-z3-hue="${slot}"] { --z3-hue: var(--z3-hue-${slot}); }`,
    ),
    `${root} [data-z3-cell][data-z3-hue] {${PANE_RULES} }`,
    `${root} [class*="shadow-composer"] { --tw-shadow: 0 2px 0 0 var(--z3-shade); }`,
    `${root}.dark [data-z3-host] { background-color: oklch(from var(--sidebar) calc(l * 0.8) c h); background-image: linear-gradient(to bottom, black, transparent var(--z3-bar)); background-size: auto; }`,
  ].join(" ");
}
