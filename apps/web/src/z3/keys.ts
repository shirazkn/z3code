import { isHostActive, runAction } from "./actions";
import { setFirstKeyHandler } from "./firstKeyListener";
import { resolveKey } from "./keymap";
import { setMode, useZ3Store } from "./store";

// Dialogs, menus, lists and the terminal keep their keys (Home, End, Escape, mode keys).
const OWN_KEYS = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], .xterm';

function onKeyDown(event: KeyboardEvent): void {
  if (event.isComposing || !isHostActive()) return;
  if (event.target instanceof Element && event.target.closest(OWN_KEYS)) return;
  const resolution = resolveKey(useZ3Store.getState().mode, event, navigator.platform);
  if (resolution.kind === "pass") return;
  if (resolution.kind === "bind") {
    const { action, next } = resolution.bind;
    if (action !== undefined) {
      const acted = runAction(action);
      if (next !== undefined) setMode(next);
      // A normal-mode key with nothing to act on keeps its stock meaning.
      if (!acted && !resolution.swallow) return;
    } else if (next !== undefined && !event.repeat) {
      setMode(next);
    }
  }
  event.preventDefault();
  event.stopImmediatePropagation();
}

setFirstKeyHandler(onKeyDown);
