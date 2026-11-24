import type { KeybindingShortcut, ResolvedKeybindingsConfig } from "@t3tools/contracts";
import {
  matchesKeybindingShortcut,
  type ShortcutEventLike,
} from "@t3tools/shared/keybindingMatching";
import { parseKeybindingShortcut } from "@t3tools/shared/keybindings";

import type { Direction } from "./layout";

export type Mode =
  | "normal"
  | "locked"
  | "pane"
  | "tab"
  | "resize"
  | "move"
  | "scroll"
  | "session"
  | "renameTab";

export type Action =
  | { readonly do: "focus"; readonly dir: Direction; readonly orTab?: true }
  | { readonly do: "cyclePane" }
  | { readonly do: "lastPane" }
  | { readonly do: "newPane"; readonly dir?: "right" | "down" }
  | { readonly do: "closePane" }
  | { readonly do: "fullscreen" }
  | { readonly do: "renamePane" }
  | { readonly do: "newTab" }
  | { readonly do: "closeTab" }
  | { readonly do: "stepTab"; readonly step: 1 | -1 }
  | { readonly do: "goToTab"; readonly index: number }
  | { readonly do: "lastTab" }
  | { readonly do: "moveTab"; readonly step: 1 | -1 }
  | { readonly do: "breakPane"; readonly to: "new" | "left" | "right" }
  | { readonly do: "resize"; readonly grow: boolean; readonly dir?: Direction }
  | { readonly do: "move"; readonly to: Direction | 1 | -1 }
  | { readonly do: "scroll"; readonly by: "line" | "half" | "page"; readonly step: 1 | -1 }
  | { readonly do: "scrollToBottom" }
  | { readonly do: "jumpTurn"; readonly step: 1 | -1 }
  | { readonly do: "find" }
  | { readonly do: "palette" }
  | { readonly do: "settings" };

/** One `bind` line of a Zellij config: keys, an action, and an optional `SwitchToMode`. */
export interface Bind {
  readonly keys: ReadonlyArray<string>;
  readonly action?: Action;
  readonly next?: Mode;
}

const bind = (keys: string | ReadonlyArray<string>, action?: Action, next?: Mode): Bind => ({
  keys: typeof keys === "string" ? [keys] : keys,
  ...(action ? { action } : {}),
  ...(next ? { next } : {}),
});

const MODE_KEYS: ReadonlyArray<readonly [Mode, string]> = [
  ["pane", "mod+p"],
  ["tab", "mod+t"],
  ["resize", "mod+n"],
  ["move", "mod+h"],
  ["scroll", "mod+s"],
  ["session", "mod+o"],
];

const focusBinds = (): Bind[] => [
  bind(["h", "arrowleft"], { do: "focus", dir: "left" }),
  bind(["l", "arrowright"], { do: "focus", dir: "right" }),
  bind(["j", "arrowdown"], { do: "focus", dir: "down" }),
  bind(["k", "arrowup"], { do: "focus", dir: "up" }),
];

/** The Zellij default keymap with the deltas of the dotfiles `config.kdl`. */
const KEYMAP: Readonly<Record<Exclude<Mode, "renameTab">, ReadonlyArray<Bind>>> = {
  normal: [
    // dotfiles: Globe+arrow, Ctrl+arrow, Cmd+arrow (Ghostty) and Cmd+Shift+[ ] (Ghostty).
    bind(["home", "ctrl+arrowleft"], { do: "focus", dir: "left", orTab: true }),
    bind(["end", "ctrl+arrowright"], { do: "focus", dir: "right", orTab: true }),
    bind(["pageup", "ctrl+arrowup", "mod+arrowup"], { do: "focus", dir: "up" }),
    bind(["pagedown", "ctrl+arrowdown", "mod+arrowdown"], { do: "focus", dir: "down" }),
    bind(["shift+pageup", "ctrl+shift+arrowup"], { do: "scroll", by: "page", step: -1 }),
    bind(["shift+pagedown", "ctrl+shift+arrowdown"], { do: "scroll", by: "page", step: 1 }),
    bind("mod+shift+[", { do: "stepTab", step: -1 }),
    bind("mod+shift+]", { do: "stepTab", step: 1 }),
  ],
  locked: [],
  pane: [
    ...focusBinds(),
    bind("p", { do: "cyclePane" }),
    bind(";", { do: "lastPane" }),
    bind("n", { do: "newPane" }, "normal"),
    bind("d", { do: "newPane", dir: "down" }, "normal"),
    // dotfiles: c and r swapped back to the older defaults.
    bind("c", { do: "newPane", dir: "right" }, "normal"),
    bind("r", { do: "renamePane" }, "normal"),
    bind("x", { do: "closePane" }, "normal"),
    bind("f", { do: "fullscreen" }, "normal"),
  ],
  tab: [
    bind(["h", "arrowleft", "arrowup", "k"], { do: "stepTab", step: -1 }),
    bind(["l", "arrowright", "arrowdown", "j"], { do: "stepTab", step: 1 }),
    bind("n", { do: "newTab" }, "normal"),
    bind("x", { do: "closeTab" }, "normal"),
    bind("r", undefined, "renameTab"),
    bind("b", { do: "breakPane", to: "new" }, "normal"),
    bind("[", { do: "breakPane", to: "left" }, "normal"),
    bind("]", { do: "breakPane", to: "right" }, "normal"),
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) =>
      bind(`${n}`, { do: "goToTab", index: n - 1 }, "normal"),
    ),
    bind("tab", { do: "lastTab" }),
  ],
  resize: [
    bind(["h", "arrowleft"], { do: "resize", grow: true, dir: "left" }),
    bind(["j", "arrowdown"], { do: "resize", grow: true, dir: "down" }),
    bind(["k", "arrowup"], { do: "resize", grow: true, dir: "up" }),
    bind(["l", "arrowright"], { do: "resize", grow: true, dir: "right" }),
    bind("shift+h", { do: "resize", grow: false, dir: "left" }),
    bind("shift+j", { do: "resize", grow: false, dir: "down" }),
    bind("shift+k", { do: "resize", grow: false, dir: "up" }),
    bind("shift+l", { do: "resize", grow: false, dir: "right" }),
    bind(["=", "shift+="], { do: "resize", grow: true }),
    bind("-", { do: "resize", grow: false }),
  ],
  move: [
    bind(["n", "tab"], { do: "move", to: 1 }),
    bind("p", { do: "move", to: -1 }),
    bind(["h", "arrowleft"], { do: "move", to: "left" }),
    bind(["j", "arrowdown"], { do: "move", to: "down" }),
    bind(["k", "arrowup"], { do: "move", to: "up" }),
    bind(["l", "arrowright"], { do: "move", to: "right" }),
  ],
  scroll: [
    bind("s", { do: "find" }, "normal"),
    bind("ctrl+c", { do: "scrollToBottom" }, "normal"),
    bind(["j", "arrowdown"], { do: "scroll", by: "line", step: 1 }),
    bind(["k", "arrowup"], { do: "scroll", by: "line", step: -1 }),
    bind(["ctrl+f", "pagedown", "arrowright", "l"], { do: "scroll", by: "page", step: 1 }),
    bind(["ctrl+b", "pageup", "arrowleft", "h"], { do: "scroll", by: "page", step: -1 }),
    bind("d", { do: "scroll", by: "half", step: 1 }),
    bind("u", { do: "scroll", by: "half", step: -1 }),
    bind("[", { do: "jumpTurn", step: -1 }),
    bind("]", { do: "jumpTurn", step: 1 }),
  ],
  session: [bind("w", { do: "palette" }, "normal"), bind("c", { do: "settings" }, "normal")],
};

/** Zellij's `shared_except "locked"` binds, live in every unlocked mode. */
const UNLOCKED: ReadonlyArray<Bind> = [
  bind("alt+n", { do: "newPane" }),
  bind(["alt+h", "alt+arrowleft"], { do: "focus", dir: "left", orTab: true }),
  bind(["alt+l", "alt+arrowright"], { do: "focus", dir: "right", orTab: true }),
  bind(["alt+j", "alt+arrowdown"], { do: "focus", dir: "down" }),
  bind(["alt+k", "alt+arrowup"], { do: "focus", dir: "up" }),
  bind(["alt+=", "alt+shift+="], { do: "resize", grow: true }),
  bind("alt+-", { do: "resize", grow: false }),
  bind("alt+i", { do: "moveTab", step: -1 }),
  bind("alt+o", { do: "moveTab", step: 1 }),
];

// dotfiles: Caps Lock is F18 (hidutil), and it toggles the lock.
const LOCK_KEY = "f18";

/** Each stock command whose chord a mode key takes, and where it moves. */
const MOVED_STOCK_KEYS: ReadonlyArray<readonly [string, string, string]> = [
  ["filePicker.toggle", "mod+p", "mod+alt+p"],
  ["chat.new", "mod+n", "mod+shift+o"],
  ["composer.stash", "mod+s", "mod+alt+s"],
  ["editor.openFavorite", "mod+o", "mod+alt+o"],
  ["rightPanel.new", "mod+t", "mod+alt+t"],
  ["thread.previous", "mod+shift+[", "mod+alt+["],
  ["thread.next", "mod+shift+]", "mod+alt+]"],
];

const parsed = new Map<string, KeybindingShortcut>();
function shortcut(key: string): KeybindingShortcut {
  let value = parsed.get(key);
  if (value === undefined) {
    value = parseKeybindingShortcut(key)!;
    parsed.set(key, value);
  }
  return value;
}

function matches(event: ShortcutEventLike, key: string, platform: string): boolean {
  return matchesKeybindingShortcut(event, shortcut(key), platform);
}

function findBind(
  binds: ReadonlyArray<Bind>,
  event: ShortcutEventLike,
  platform: string,
): Bind | null {
  return binds.find((b) => b.keys.some((key) => matches(event, key, platform))) ?? null;
}

export type Resolution =
  /** A bind matched. `swallow` holds when the key must not reach the page even if nothing ran. */
  | { readonly kind: "bind"; readonly bind: Bind; readonly swallow: boolean }
  /** Not ours: the page gets the key. */
  | { readonly kind: "pass" }
  /** A mode swallows every key it does not bind, as Zellij does. */
  | { readonly kind: "swallow" };

export function resolveKey(mode: Mode, event: ShortcutEventLike, platform: string): Resolution {
  if (matches(event, LOCK_KEY, platform)) {
    return {
      kind: "bind",
      bind: { keys: [], next: mode === "locked" ? "normal" : "locked" },
      swallow: true,
    };
  }
  if (mode === "locked" || mode === "renameTab") return { kind: "pass" };
  for (const [target, key] of MODE_KEYS) {
    if (matches(event, key, platform)) {
      return {
        kind: "bind",
        bind: { keys: [key], next: mode === target ? "normal" : target },
        swallow: true,
      };
    }
  }
  const modal = mode !== "normal";
  if (modal && (matches(event, "escape", platform) || matches(event, "enter", platform))) {
    return { kind: "bind", bind: { keys: [], next: "normal" }, swallow: true };
  }
  const found = findBind(KEYMAP[mode], event, platform) ?? findBind(UNLOCKED, event, platform);
  if (found !== null) return { kind: "bind", bind: found, swallow: modal };
  return modal ? { kind: "swallow" } : { kind: "pass" };
}

/** Short hints for the bar, one per mode. */
export const MODE_HINTS: Readonly<Partial<Record<Mode, string>>> = {
  normal: "⌘P pane · ⌘T tab · ⌘N resize · ⌘H move · ⌘S scroll · ⌘O session · ⇪ lock",
  locked: "⇪ unlock",
  pane: "hjkl focus · n new · d down · c right · x close · f full · r rename · p next · ; last",
  tab: "hl switch · n new · x close · r rename · 1-9 go · ⇥ last · b break · [ ] break left/right",
  resize: "hjkl grow · HJKL shrink · = + − all sides",
  move: "hjkl swap · n ⇥ next · p previous",
  scroll: "jk line · du half · hl page · [ ] turn · s find · ^C bottom",
  session: "w threads · c settings",
  renameTab: "type a name · ⏎ save · esc cancel",
};

function sameShortcut(a: KeybindingShortcut, b: KeybindingShortcut): boolean {
  return (
    a.key === b.key &&
    a.metaKey === b.metaKey &&
    a.ctrlKey === b.ctrlKey &&
    a.shiftKey === b.shiftKey &&
    a.altKey === b.altKey &&
    a.modKey === b.modKey
  );
}

/** Moves each stock command off a chord that a mode key takes (`MOVED_STOCK_KEYS`). */
export function remapStockKeys(config: ResolvedKeybindingsConfig): ResolvedKeybindingsConfig {
  return config.map((rule) => {
    const moved = MOVED_STOCK_KEYS.find(
      ([command, from]) => rule.command === command && sameShortcut(rule.shortcut, shortcut(from)),
    );
    return moved === undefined ? rule : { ...rule, shortcut: shortcut(moved[2]) };
  });
}
