import type { ThemeColors, ThemeDefinition } from "@t3tools/shared/themePalettes";

import { refreshTheme, setAppearanceMode, setTheme } from "../hooks/useTheme";
import {
  createVividThemeColors,
  getCustomThemes,
  installCustomTheme,
  updateCustomTheme,
} from "../themePalette";

const THEME_ID = "z3";
/** Raise with every palette change, so stored copies update. */
const THEME_VERSION = 1;
const ADOPTED_KEY = "z3code:theme-adopted";

// The dotfiles' Ghostty work profile: A24 Nocturne (dark) and A24 Daylight (light).
function a24(
  appearance: "light" | "dark",
  palette: { bg: string; fg: string; green: string; cursor: string; selection: string },
): ThemeColors {
  return {
    ...createVividThemeColors(appearance, palette.bg, palette.green),
    text: palette.fg,
    terminalBackground: palette.bg,
    terminalForeground: palette.fg,
    terminalCursor: palette.cursor,
    terminalSelection: palette.selection,
  };
}

const DARK = a24("dark", {
  bg: "#150f0a",
  fg: "#f4e7cc",
  green: "#7e9c6a",
  cursor: "#d9a95c",
  selection: "#3c3026",
});
const LIGHT = a24("light", {
  bg: "#f7efdb",
  fg: "#382d1e",
  green: "#5e7144",
  cursor: "#a64e38",
  selection: "#ecdebd",
});

const Z3_THEME: ThemeDefinition = {
  id: THEME_ID,
  label: "z3 (A24)",
  appearance: "dark",
  colors: DARK,
  variants: { light: LIGHT, dark: DARK },
  css: `html[data-theme-id="${THEME_ID}"] { --font-mono: "IosevkaTermSlab NFM", "Iosevka Term Slab", "Iosevka Term", ui-monospace, monospace; }`,
};

/** Installs the z3 theme, and selects it once with the system appearance, as Ghostty does. */
export function adoptZ3Theme(): void {
  try {
    installZ3Theme();
  } catch (error) {
    console.warn("[z3] theme not installed; stock theme stays", error);
  }
}

function installZ3Theme(): void {
  const adopted = Number(window.localStorage.getItem(ADOPTED_KEY) ?? 0);
  if (adopted === THEME_VERSION) return;
  if (getCustomThemes().some((theme) => theme.id === THEME_ID)) {
    updateCustomTheme(Z3_THEME);
    refreshTheme();
  } else {
    installCustomTheme(Z3_THEME);
  }
  if (adopted === 0 && !(setTheme(THEME_ID) && setAppearanceMode("system"))) {
    console.warn("[z3] theme installed but not selected; it retries next launch");
    return;
  }
  window.localStorage.setItem(ADOPTED_KEY, String(THEME_VERSION));
}
