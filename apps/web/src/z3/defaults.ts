import type { ClientSettingsPatch } from "@t3tools/contracts/settings";

import { ensureClientSettingsHydrated, updateClientSettings } from "../hooks/useSettings";

const ADOPTED_KEY = "z3code:defaults-adopted";

/** Each entry is applied once, in order; the stored count says how many an install has. */
const DEFAULTS: ReadonlyArray<ClientSettingsPatch> = [
  { chatWidth: "wide", boringSidebarEnabled: true },
  { glassOpacity: 50 },
];

/** Selects the z3 settings once; Settings can change them afterwards. */
export function adoptZ3Defaults(): void {
  const adopted = Number(window.localStorage.getItem(ADOPTED_KEY) ?? 0);
  if (adopted >= DEFAULTS.length) return;
  void ensureClientSettingsHydrated()
    .then(() => updateClientSettings(Object.assign({}, ...DEFAULTS.slice(adopted))))
    .then(() => window.localStorage.setItem(ADOPTED_KEY, String(DEFAULTS.length)))
    .catch((error: unknown) => console.warn("[z3] defaults not applied; retry next launch", error));
}
