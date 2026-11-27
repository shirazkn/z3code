import type { ThemeColors, ThemeDefinition } from "@t3tools/shared/themePalettes";

import { refreshTheme, setAppearanceMode, setTheme } from "../hooks/useTheme";
import {
  createVividThemeColors,
  getCustomThemes,
  installCustomTheme,
  updateCustomTheme,
} from "../themePalette";
import { PALETTE_THEMES, paletteCss, type PaletteTheme } from "./palettes";

export const Z3_THEME_ID = "z3";
/** Raise with every palette change, so stored copies update. */
const THEME_VERSION = 16;
const ADOPTED_KEY = "z3code:theme-adopted";
const SELECTED_KEY = "z3code:theme-selected";
/** Raise to select the z3 theme again on every install. */
const SELECT_VERSION = "1";

interface Palette {
  readonly bg: string;
  readonly fg: string;
  /** Tints every surface and border. */
  readonly tint: string;
  /** Buttons, the active tab and the mode label. */
  readonly accent: string;
  readonly onAccent: string;
  readonly accentHover: string;
  /** The focus ring and highlights; with `accent` it colors the theme's preview in Settings. */
  readonly second: string;
  readonly onSecond: string;
  readonly cursor: string;
  readonly selection: string;
}

// The app icon's colors (assets/z3/app-icon.svg): teal ground, cream ink, one amber accent.
function fromIcon(appearance: "light" | "dark", palette: Palette): ThemeColors {
  return {
    ...createVividThemeColors(appearance, palette.bg, palette.tint),
    text: palette.fg,
    accent: palette.second,
    accentForeground: palette.onSecond,
    focus: palette.second,
    update: palette.second,
    messageAction: palette.accent,
    messageActionForeground: palette.onAccent,
    messageActionHover: palette.accentHover,
    terminalBackground: palette.bg,
    terminalForeground: palette.fg,
    terminalCursor: palette.cursor,
    terminalSelection: palette.selection,
  };
}

const DARK = fromIcon("dark", {
  bg: "#020706",
  fg: "#f3e9d2",
  tint: "#3f9c86",
  accent: "#e3a94f",
  onAccent: "#1b1305",
  accentHover: "#f0bb62",
  second: "#5fc7ae",
  onSecond: "#04130f",
  cursor: "#e3a94f",
  selection: "#17382f",
});
const LIGHT = fromIcon("light", {
  bg: "#fbf4e2",
  fg: "#16302a",
  tint: "#2fa58a",
  accent: "#d85a14",
  onAccent: "#fffaf0",
  accentHover: "#bf4c0c",
  second: "#128a73",
  onSecond: "#fffaf0",
  cursor: "#d85a14",
  selection: "#f6d9bd",
});

const fontCss = (id: string) =>
  `html[data-theme-id="${id}"] { --font-mono: "IosevkaTermSlab NFM", "Iosevka Term Slab", "Iosevka Term", ui-monospace, monospace; }`;

const Z3_THEME: ThemeDefinition = {
  id: Z3_THEME_ID,
  label: "z3",
  appearance: "dark",
  colors: DARK,
  variants: { light: LIGHT, dark: DARK },
  css: fontCss(Z3_THEME_ID),
};

/** Fixed surfaces take the palette's neutral; the theme's CSS colors each pane. */
function fromPalette(theme: PaletteTheme): ThemeDefinition {
  const colors = (appearance: "light" | "dark") => {
    const variant = theme[appearance];
    return fromIcon(appearance, {
      bg: variant.bg,
      fg: variant.fg,
      tint: variant.neutral,
      accent: variant.neutral,
      onAccent: variant.onNeutral,
      accentHover: variant.neutralHover,
      second: variant.neutral,
      onSecond: variant.onNeutral,
      cursor: variant.neutral,
      selection: variant.selection,
    });
  };
  const dark = colors("dark");
  return {
    id: theme.id,
    label: theme.label,
    appearance: "dark",
    colors: dark,
    variants: { light: colors("light"), dark },
    css: `${fontCss(theme.id)} ${paletteCss(theme)}`,
  };
}

/** In Settings order. */
const THEMES: ReadonlyArray<ThemeDefinition> = [Z3_THEME, ...PALETTE_THEMES.map(fromPalette)];

/** Installs the fork's themes and selects the z3 theme once per `SELECT_VERSION`; later choices stay. */
export function adoptZ3Theme(): void {
  try {
    installThemes();
    selectZ3Theme();
  } catch (error) {
    console.warn("[z3] theme not installed; stock theme stays", error);
  }
}

function installThemes(): void {
  if (Number(window.localStorage.getItem(ADOPTED_KEY) ?? 0) === THEME_VERSION) return;
  const installed = new Set(getCustomThemes().map((theme) => theme.id));
  for (const theme of THEMES) {
    if (installed.has(theme.id)) updateCustomTheme(theme);
    else installCustomTheme(theme);
  }
  refreshTheme();
  window.localStorage.setItem(ADOPTED_KEY, String(THEME_VERSION));
}

function selectZ3Theme(): void {
  const selected = window.localStorage.getItem(SELECTED_KEY);
  if (selected === SELECT_VERSION) return;
  // The first launch follows the system appearance, as Ghostty does; later ones keep the mode.
  if (!(setTheme(Z3_THEME_ID) && (selected !== null || setAppearanceMode("system")))) {
    console.warn("[z3] theme installed but not selected; it retries next launch");
    return;
  }
  window.localStorage.setItem(SELECTED_KEY, SELECT_VERSION);
}
