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

// Red on bone and soot: the red pair is the only color.
const FIGURE8: PaletteTheme = {
  id: "figure8",
  label: "figure8",
  dark: {
    bg: "#0a0707",
    fg: "#efe9e4",
    neutral: "#c9c0b8",
    neutralHover: "#e2dbd4",
    onNeutral: "#120d0c",
    selection: "#2b201e",
    hues: ["#d1483d", "#a8594d", "#bdb3a8", "#8f8a86"],
    shade: "#000000",
  },
  light: {
    bg: "#f5f1ec",
    fg: "#1a1413",
    neutral: "#4a4340",
    neutralHover: "#342e2c",
    onNeutral: "#faf7f3",
    selection: "#e4dbd3",
    hues: ["#a82a22", "#7d3a31", "#6b6259", "#4f4b48"],
    shade: "rgb(26 20 19 / 0.3)",
  },
};

// Open water: two sea tones, a haze blue, and sand as the one warm note.
const VANISHER: PaletteTheme = {
  id: "vanisher",
  label: "vanisher",
  dark: {
    bg: "#04080a",
    fg: "#e3ecee",
    neutral: "#a9bcc2",
    neutralHover: "#cbd9dd",
    onNeutral: "#081013",
    selection: "#16272d",
    hues: ["#4f8fa8", "#6fb0a6", "#8fa3b8", "#c2a878"],
    shade: "#000000",
  },
  light: {
    bg: "#eef4f5",
    fg: "#0f1c20",
    neutral: "#3a4f57",
    neutralHover: "#28393f",
    onNeutral: "#f5fafb",
    selection: "#d3e1e4",
    hues: ["#1f5f78", "#2a6e64", "#465c75", "#7a6230"],
    shade: "rgb(15 28 32 / 0.3)",
  },
};

// One green at three strengths, and a grey.
const BRAT: PaletteTheme = {
  id: "brat",
  label: "brat",
  dark: {
    bg: "#060804",
    fg: "#eef3e4",
    neutral: "#b9c4a6",
    neutralHover: "#d6dfc6",
    onNeutral: "#0d1207",
    selection: "#222b12",
    hues: ["#8ace00", "#6f9a1c", "#c5dd7a", "#9a9f90"],
    shade: "#000000",
  },
  light: {
    bg: "#f4f8ea",
    fg: "#141a08",
    neutral: "#44502c",
    neutralHover: "#303a1d",
    onNeutral: "#f9fcf1",
    selection: "#dce6c4",
    hues: ["#4f7a00", "#3f5f0f", "#6b7a2a", "#565b4b"],
    shade: "rgb(20 26 8 / 0.3)",
  },
};

// Greyscale; the orange is the one color.
const MDVLN: PaletteTheme = {
  id: "mdvln",
  label: "mdvln",
  dark: {
    bg: "#070707",
    fg: "#ebebea",
    neutral: "#bdbcb9",
    neutralHover: "#dad9d6",
    onNeutral: "#0f0f0f",
    selection: "#262524",
    hues: ["#e0762a", "#9c9a96", "#c4bcae", "#7f8791"],
    shade: "#000000",
  },
  light: {
    bg: "#f3f2f0",
    fg: "#161616",
    neutral: "#474644",
    neutralHover: "#323130",
    onNeutral: "#f9f8f7",
    selection: "#dedcd8",
    hues: ["#b0500f", "#5c5a57", "#6e6657", "#4b535d"],
    shade: "rgb(22 22 22 / 0.3)",
  },
};

// Embers in smoke: red, rose and amber over ash.
const PHOENIX: PaletteTheme = {
  id: "phoenix",
  label: "phoenix",
  dark: {
    bg: "#090605",
    fg: "#efe6e1",
    neutral: "#c4b3aa",
    neutralHover: "#dfd1c9",
    onNeutral: "#130c0a",
    selection: "#2c1e1a",
    hues: ["#c0564a", "#b87a8a", "#c98a4b", "#8f7f7a"],
    shade: "#000000",
  },
  light: {
    bg: "#f6f0ec",
    fg: "#1c1412",
    neutral: "#52423c",
    neutralHover: "#3b2e29",
    onNeutral: "#fbf7f4",
    selection: "#e6d9d1",
    hues: ["#96332a", "#7f4557", "#8a5519", "#5c4f4a"],
    shade: "rgb(28 20 18 / 0.3)",
  },
};

// Night lights: magenta through violet to blue, with one red.
const VEGAS: PaletteTheme = {
  id: "vegas",
  label: "vegas",
  dark: {
    bg: "#07050a",
    fg: "#ede7f2",
    neutral: "#bfb4cc",
    neutralHover: "#dad1e4",
    onNeutral: "#100b16",
    selection: "#261c33",
    hues: ["#d0508f", "#9a6fd0", "#5b82d8", "#cf5068"],
    shade: "#000000",
  },
  light: {
    bg: "#f5f1f8",
    fg: "#17111f",
    neutral: "#4b4159",
    neutralHover: "#352d40",
    onNeutral: "#faf7fc",
    selection: "#e2d9ec",
    hues: ["#a02465", "#6a3fa8", "#2f55ad", "#a52a40"],
    shade: "rgb(23 17 31 / 0.3)",
  },
};

// A warm run of red, orange and yellow; the blue is the one cool note.
const RAINBOWS: PaletteTheme = {
  id: "rainbows",
  label: "rainbows",
  dark: {
    bg: "#070605",
    fg: "#f0ece6",
    neutral: "#c2bbb2",
    neutralHover: "#ddd7cf",
    onNeutral: "#100e0c",
    selection: "#28231e",
    hues: ["#d9503a", "#e08a2e", "#d6b83a", "#4f9fc0"],
    shade: "#000000",
  },
  light: {
    bg: "#f6f3ee",
    fg: "#181513",
    neutral: "#4a4540",
    neutralHover: "#34302c",
    onNeutral: "#fbf9f6",
    selection: "#e5dfd6",
    hues: ["#a8301f", "#93520c", "#75600a", "#1f6485"],
    shade: "rgb(24 21 19 / 0.3)",
  },
};

// Chrome and sky: two blues and a silver, with pink as the one warm note.
const IMAGINAL: PaletteTheme = {
  id: "imaginal",
  label: "imaginal",
  dark: {
    bg: "#05070b",
    fg: "#e8eef5",
    neutral: "#b6c2d0",
    neutralHover: "#d4dde7",
    onNeutral: "#0a0f17",
    selection: "#1b2636",
    hues: ["#6fb2e0", "#5f86d6", "#b4bcc6", "#e08ab4"],
    shade: "#000000",
  },
  light: {
    bg: "#f1f5fa",
    fg: "#111924",
    neutral: "#3f4c5d",
    neutralHover: "#2c3643",
    onNeutral: "#f7fafd",
    selection: "#d6dfea",
    hues: ["#1f6396", "#2f4fa3", "#56606c", "#a63770"],
    shade: "rgb(17 25 36 / 0.3)",
  },
};

export const PALETTE_THEMES: ReadonlyArray<PaletteTheme> = [
  KIDA,
  FIGURE8,
  VANISHER,
  BRAT,
  MDVLN,
  PHOENIX,
  VEGAS,
  RAINBOWS,
  IMAGINAL,
];

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
