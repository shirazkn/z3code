import { parseKeybindingShortcut } from "@t3tools/shared/keybindings";
import { Fragment } from "react";

import { SettingsRow, SettingsSection } from "../components/settings/settingsLayout";
import { Kbd } from "../components/ui/kbd";
import { formatShortcutLabel } from "../keybindings";
import { HintKeys } from "./ArrowKeys";
import { MODE_HINTS, MODE_KEYS } from "./keymap";

const MODE_TITLE: Record<keyof typeof MODE_HINTS, string> = {
  normal: "Normal mode",
  pane: "Pane mode",
  tab: "Tab mode",
  resize: "Resize mode",
  move: "Move mode",
  scroll: "Scroll mode",
  session: "Session mode",
};

/** The Zellij modes and their keys, read-only; `keymap.ts` is their one source. */
export function Z3KeymapSection() {
  const entry = new Map(MODE_KEYS);
  return (
    <SettingsSection title="Zellij modes" id="keybindings-z3">
      {(Object.keys(MODE_TITLE) as Array<keyof typeof MODE_HINTS>).map((mode) => {
        const key = entry.get(mode);
        return (
          <SettingsRow
            key={mode}
            title={MODE_TITLE[mode]}
            description={
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {MODE_HINTS[mode].map(([keys, label]) => (
                  <Fragment key={keys}>
                    <Kbd>
                      <HintKeys keys={keys} />
                    </Kbd>
                    <span className="me-1">{label}</span>
                  </Fragment>
                ))}
              </span>
            }
            control={
              key === undefined ? null : (
                <Kbd>{formatShortcutLabel(parseKeybindingShortcut(key)!)}</Kbd>
              )
            }
          />
        );
      })}
    </SettingsSection>
  );
}
