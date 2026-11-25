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
  | { readonly do: "settlePane" }
  | { readonly do: "fullscreen" }
  | { readonly do: "renamePane" }
  | { readonly do: "newTab" }
  | { readonly do: "closeTab" }
  | { readonly do: "stepTab"; readonly step: 1 | -1 }
  | { readonly do: "goToTab"; readonly index: number }
  | { readonly do: "lastTab" }
  | { readonly do: "moveTab"; readonly step: 1 | -1 }
  | { readonly do: "breakPane"; readonly to: "new" | "left" | "right" }
  | { readonly do: "swapLayout"; readonly step: 1 | -1 }
  | { readonly do: "nudge"; readonly dir: Direction }
  | { readonly do: "resize"; readonly grow: boolean }
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
  /** Never falls through to the page, even with nothing to act on. */
  readonly always?: true;
  /** Off where Ctrl is the stock modifier, and the chord a stock command. */
  readonly macOnly?: true;
}

const bind = (keys: string | ReadonlyArray<string>, action?: Action, next?: Mode): Bind => ({
  keys: typeof keys === "string" ? [keys] : keys,
  ...(action ? { action } : {}),
  ...(next ? { next } : {}),
});

export const MODE_KEYS: ReadonlyArray<readonly [Mode, string]> = [
  ["pane", "mod+p"],
  ["tab", "mod+t"],
  ["resize", "mod+n"],
  ["move", "mod+h"],
  ["scroll", "mod+s"],
  ["session", "mod+o"],
];

const GLOBE_ARROW = { left: "home", right: "end", up: "pageup", down: "pagedown" } as const;

const focusBinds = (): Bind[] => [
  bind(["h", "arrowleft"], { do: "focus", dir: "left" }),
  bind(["l", "arrowright"], { do: "focus", dir: "right" }),
  bind(["j", "arrowdown"], { do: "focus", dir: "down" }),
  bind(["k", "arrowup"], { do: "focus", dir: "up" }),
];

/** The Zellij default keymap with the deltas of the dotfiles `config.kdl`. */
const KEYMAP: Readonly<Record<Exclude<Mode, "renameTab">, ReadonlyArray<Bind>>> = {
  normal: [
    // dotfiles: Globe+arrow (Home End PageUp PageDown) and Ctrl+arrow focus a pane; left and
    // right go to the next tab at the edge (Zellij's MoveFocusOrTab).
    ...(["left", "right", "up", "down"] as const).map((dir): Bind => ({
      keys: [GLOBE_ARROW[dir], `ctrl+arrow${dir}`],
      action:
        dir === "left" || dir === "right"
          ? { do: "focus", dir, orTab: true }
          : { do: "focus", dir },
      always: true,
    })),
    bind(["shift+pageup", "ctrl+shift+arrowup"], { do: "scroll", by: "page", step: -1 }),
    bind(["shift+pagedown", "ctrl+shift+arrowdown"], { do: "scroll", by: "page", step: 1 }),
    // dotfiles (Ghostty): Cmd+Shift+[ ] for tabs. Ctrl+[ ] pairs with Ctrl+arrows.
    bind("mod+shift+[", { do: "stepTab", step: -1 }),
    bind("mod+shift+]", { do: "stepTab", step: 1 }),
    { keys: ["ctrl+["], action: { do: "stepTab", step: -1 }, always: true, macOnly: true },
    { keys: ["ctrl+]"], action: { do: "stepTab", step: 1 }, always: true, macOnly: true },
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n): Bind => ({
      keys: [`mod+${n}`],
      action: { do: "goToTab", index: n - 1 },
      always: true,
    })),
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
    // x settles the thread, then closes its pane; s only closes the pane (the thread stays open).
    bind("x", { do: "settlePane" }, "normal"),
    bind("s", { do: "closePane" }, "normal"),
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
    // Not Zellij's grow-only Increase/Decrease: the border follows the key, so opposites undo.
    bind(["h", "arrowleft", "shift+h"], { do: "nudge", dir: "left" }),
    bind(["j", "arrowdown", "shift+j"], { do: "nudge", dir: "down" }),
    bind(["k", "arrowup", "shift+k"], { do: "nudge", dir: "up" }),
    bind(["l", "arrowright", "shift+l"], { do: "nudge", dir: "right" }),
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

/** Zellij's `shared_except "locked"` binds, live in every unlocked mode. Alt+letter would type a symbol. */
const UNLOCKED: ReadonlyArray<Bind> = [
  bind("alt+n", { do: "newPane" }),
  bind(["alt+=", "alt+shift+="], { do: "resize", grow: true }),
  bind("alt+-", { do: "resize", grow: false }),
  bind("alt+[", { do: "swapLayout", step: -1 }),
  bind("alt+]", { do: "swapLayout", step: 1 }),
  bind("alt+i", { do: "moveTab", step: -1 }),
  bind("alt+o", { do: "moveTab", step: 1 }),
].map((b): Bind => ({ ...b, always: true }));

// dotfiles: Caps Lock is F18 (hidutil), and it toggles the lock.
const LOCK_KEY = "f18";

/** Each stock command whose chord a mode key takes, and where it moves. */
const MOVED_STOCK_KEYS: ReadonlyArray<readonly [string, string, string]> = [
  ["filePicker.toggle", "mod+p", "mod+alt+p"],
  ["chat.new", "mod+n", "mod+shift+o"],
  ["composer.stash", "mod+s", "mod+alt+s"],
  ["editor.openFavorite", "mod+o", "mod+alt+o"],
  ["rightPanel.new", "mod+t", "mod+alt+t"],
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(
    (n) => [`thread.jump.${n}`, `mod+${n}`, `mod+alt+${n}`] as const,
  ),
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
  const mac = /mac/i.test(platform);
  return (
    binds.find(
      (b) => (mac || b.macOnly !== true) && b.keys.some((key) => matches(event, key, platform)),
    ) ?? null
  );
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
  if (found !== null) {
    return { kind: "bind", bind: found, swallow: modal || found.always === true };
  }
  return modal ? { kind: "swallow" } : { kind: "pass" };
}

/** Each mode's keys for Settings, as [keys, what they do]. `HintKeys` draws a run of arrows. */
export const MODE_HINTS: Readonly<
  Record<Exclude<Mode, "locked" | "renameTab">, ReadonlyArray<readonly [string, string]>>
> = {
  normal: [
    ["⌥N", "new pane"],
    ["fn←↓↑→  ⌃←↓↑→", "focus"],
    ["⌘⇧[ ⌘⇧]  ⌃[ ⌃]  fn[ fn]", "previous / next tab"],
    ["⌘1–9", "go to tab"],
    ["⌥= ⌥−", "grow / shrink"],
    ["⌥[ ⌥]", "change layout"],
    ["⌥I ⌥O", "move tab"],
    ["⇧fn↓↑  ⌃⇧↓↑", "page scroll"],
    ["⇪", "lock / unlock"],
  ],
  pane: [
    ["←↓↑→", "focus"],
    ["n", "new pane"],
    ["d", "split down"],
    ["c", "split right"],
    ["x", "settle"],
    ["s", "stash"],
    ["f", "fullscreen"],
    ["r", "rename"],
    ["p ;", "next / last"],
  ],
  tab: [
    ["←→", "switch"],
    ["n", "new tab"],
    ["x", "close"],
    ["r", "rename"],
    ["1–9", "go to"],
    ["⇥", "last"],
    ["b [ ]", "break pane out"],
  ],
  resize: [
    ["←↓↑→", "move border"],
    ["= −", "grow / shrink"],
  ],
  move: [
    ["←↓↑→", "swap"],
    ["n p", "next / previous"],
  ],
  scroll: [
    ["↓↑", "line"],
    ["d u", "half page"],
    ["←→", "page"],
    ["[ ]", "turn"],
    ["s", "find"],
    ["⌃C", "bottom"],
  ],
  session: [
    ["w", "threads"],
    ["c", "settings"],
  ],
};

/** The few keys the tab bar shows while a mode is on; Settings lists them all. */
export const MODE_BAR: Readonly<
  Record<Exclude<Mode, "normal" | "locked" | "renameTab">, ReadonlyArray<readonly [string, string]>>
> = {
  pane: [
    ["n", "new"],
    ["d", "down"],
    ["x", "settle"],
    ["s", "stash"],
    ["f", "full"],
    ["r", "rename"],
  ],
  tab: [
    ["n", "new"],
    ["x", "close"],
    ["r", "rename"],
    ["1–9", "go"],
    ["b", "break"],
  ],
  resize: [
    ["←↓↑→", "border"],
    ["= −", "size"],
  ],
  move: [["←↓↑→", "swap"]],
  scroll: [
    ["↓↑", "line"],
    ["d u", "half"],
    ["s", "find"],
  ],
  session: [
    ["w", "threads"],
    ["c", "settings"],
  ],
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
