import { isHostActive, runAction } from "./actions";
import { setFirstKeyHandler } from "./firstKeyListener";
import { resolveKey } from "./keymap";
import { setMode, useZ3Store } from "./store";

function onKeyDown(event: KeyboardEvent): void {
  if (event.isComposing || !isHostActive()) return;
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
