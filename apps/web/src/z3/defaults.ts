import { ensureClientSettingsHydrated, updateClientSettings } from "../hooks/useSettings";

const ADOPTED_KEY = "z3code:defaults-adopted";

/** Selects the dense stock settings once; Settings can change them afterwards. */
export function adoptZ3Defaults(): void {
  if (window.localStorage.getItem(ADOPTED_KEY) !== null) return;
  void ensureClientSettingsHydrated()
    .then(() => updateClientSettings({ chatWidth: "wide", boringSidebarEnabled: true }))
    .then(() => window.localStorage.setItem(ADOPTED_KEY, "1"))
    .catch((error: unknown) =>
      console.warn("[z3] dense defaults not applied; retry next launch", error),
    );
}
