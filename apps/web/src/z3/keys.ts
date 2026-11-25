import { flushSync } from "react-dom";

import { isHostActive, runAction } from "./actions";
import { setFirstKeyHandler } from "./firstKeyListener";
import { resolveKey, type Resolution } from "./keymap";
import { setMode, useZ3Store } from "./store";

// Dialogs, menus, lists and the terminal keep their keys (Home, End, Escape, mode keys).
const OWN_KEYS = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], .xterm';

// A held key must not repeat these.
const ONCE = new Set(["newPane", "newTab", "closePane", "closeTab", "breakPane"]);

const GLOBE_TAB: Readonly<Record<string, 1 | -1>> = { BracketLeft: -1, BracketRight: 1 };

function onKeyDown(event: KeyboardEvent): void {
  if (event.isComposing || !isHostActive()) return;
  if (event.target instanceof Element && event.target.closest(OWN_KEYS)) return;
  const mode = useZ3Store.getState().mode;
  // Globe+[ ]: Globe is no chord modifier, so the keymap cannot name it.
  const globeStep = event.getModifierState("Fn") ? GLOBE_TAB[event.code] : undefined;
  const resolution: Resolution =
    globeStep !== undefined && mode === "normal"
      ? {
          kind: "bind",
          bind: { keys: [], action: { do: "stepTab", step: globeStep } },
          swallow: true,
        }
      : resolveKey(mode, event, navigator.platform);
  if (resolution.kind === "pass") return;
  // A search field keeps Home, End and Ctrl+arrows; the composer is not an input.
  const inField = event.target instanceof Element && event.target.matches("input, textarea");
  const plain = !event.altKey && !event.metaKey;
  if (mode === "normal" && inField && plain && resolution.kind === "bind" && resolution.bind.action)
    return;
  if (resolution.kind === "bind") {
    const { action, next } = resolution.bind;
    if (action !== undefined && event.repeat && ONCE.has(action.do)) {
      // Swallowed below.
    } else if (action !== undefined) {
      // Rendered in the key's own task, so the focus cue makes the next frame.
      let acted = false;
      flushSync(() => {
        acted = runAction(action);
      });
      if (next !== undefined) setMode(next);
      // A plain normal-mode key with nothing to act on keeps its stock meaning.
      if (!acted && !resolution.swallow) return;
    } else if (next !== undefined && !event.repeat) {
      setMode(next);
    }
  }
  event.preventDefault();
  event.stopImmediatePropagation();
}

setFirstKeyHandler(onKeyDown);
