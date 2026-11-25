// @effect-diagnostics nodeBuiltinImport:off - one existence probe; FileSystem would add a service to the lifecycle types the fork shares with upstream.
import * as NodeFS from "node:fs";

import * as Effect from "effect/Effect";

import * as DesktopEnvironment from "../app/DesktopEnvironment.ts";
import * as ElectronApp from "../electron/ElectronApp.ts";
import * as ElectronTheme from "../electron/ElectronTheme.ts";

/** Sets the macOS Dock icon to the light or dark z3 icon, as the app's appearance asks. */
export const syncDockIcon = Effect.gen(function* () {
  const environment = yield* DesktopEnvironment.DesktopEnvironment;
  // A development run keeps its own icon.
  if (environment.platform !== "darwin" || !environment.isPackaged) return;
  const dark = yield* (yield* ElectronTheme.ElectronTheme).shouldUseDarkColors;
  const fileName = dark ? "z3-dock-dark.png" : "z3-dock-light.png";
  const candidates = environment.resolveResourcePathCandidates(fileName);
  const iconPath = candidates.find((candidate) => NodeFS.existsSync(candidate));
  if (iconPath === undefined) {
    yield* Effect.logWarning("[z3] Dock icon not found; the bundle icon stays", { candidates });
    return;
  }
  yield* (yield* ElectronApp.ElectronApp).setDockIcon(iconPath);
}).pipe(Effect.withSpan("desktop.z3.syncDockIcon"));
