import type { ThemeColors, ThemeDefinition } from "@t3tools/shared/themePalettes";

import { refreshTheme, setAppearanceMode, setTheme } from "../hooks/useTheme";
import {
  createVividThemeColors,
  getCustomThemes,
  installCustomTheme,
  updateCustomTheme,
} from "../themePalette";

export const Z3_THEME_ID = "z3";
/** Raise with every palette change, so stored copies update. */
const THEME_VERSION = 6;
const ADOPTED_KEY = "z3code:theme-adopted";
const SELECTED_KEY = "z3code:theme-selected";
/** Raise to select the z3 theme again on every install. */
const SELECT_VERSION = "1";

interface Palette {
  readonly bg: string;
  readonly fg: string;
  /** Tints every surface and border. */
  readonly tint: string;
  /** Buttons, the focus ring, the active tab and the mode label. */
  readonly accent: string;
  readonly onAccent: string;
  readonly accentHover: string;
  readonly cursor: string;
  readonly selection: string;
}

// The app icon's colors (assets/z3/app-icon.svg): teal ground, cream ink, one amber accent.
function fromIcon(appearance: "light" | "dark", palette: Palette): ThemeColors {
  return {
    ...createVividThemeColors(appearance, palette.bg, palette.tint),
    text: palette.fg,
    accent: palette.accent,
    accentForeground: palette.onAccent,
    focus: palette.accent,
    update: palette.accent,
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
  cursor: "#d85a14",
  selection: "#f6d9bd",
});

const Z3_THEME: ThemeDefinition = {
  id: Z3_THEME_ID,
  label: "z3",
  appearance: "dark",
  colors: DARK,
  variants: { light: LIGHT, dark: DARK },
  css: `html[data-theme-id="${Z3_THEME_ID}"] { --font-mono: "IosevkaTermSlab NFM", "Iosevka Term Slab", "Iosevka Term", ui-monospace, monospace; }`,
};

/** Installs the z3 theme and selects it once per `SELECT_VERSION`; later choices stay. */
export function adoptZ3Theme(): void {
  try {
    installZ3Theme();
    selectZ3Theme();
  } catch (error) {
    console.warn("[z3] theme not installed; stock theme stays", error);
  }
}

function installZ3Theme(): void {
  if (Number(window.localStorage.getItem(ADOPTED_KEY) ?? 0) === THEME_VERSION) return;
  if (getCustomThemes().some((theme) => theme.id === Z3_THEME_ID)) {
    updateCustomTheme(Z3_THEME);
    refreshTheme();
  } else {
    installCustomTheme(Z3_THEME);
  }
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
