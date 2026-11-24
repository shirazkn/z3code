import { useComposerHandleContext } from "../composerHandleContext";
import { activateTabById, renameActiveTab } from "./actions";
import { MODE_HINTS, type Mode } from "./keymap";
import type { Layout } from "./layout";
import { setMode, useZ3Store } from "./store";

const MODE_LABEL: Record<Mode, string> = {
  normal: "NORMAL",
  locked: "LOCKED",
  pane: "PANE",
  tab: "TAB",
  resize: "RESIZE",
  move: "MOVE",
  scroll: "SCROLL",
  session: "SESSION",
  renameTab: "RENAME",
};

/** Zellij's compact bar: the mode, the tabs as ribbons, and the keys of the mode. */
export function ZellijBar({ layout }: { layout: Layout }) {
  const mode = useZ3Store((state) => state.mode);
  const composer = useComposerHandleContext();
  const finishRename = (next: Mode) => {
    setMode(next);
    composer?.current?.focusAtEnd();
  };
  return (
    <div data-z3-bar data-mode={mode} role="toolbar" aria-label="Tabs">
      <span data-z3-mode-label>{MODE_LABEL[mode]}</span>
      {layout.tabs.map((tab, index) => {
        const active = tab.id === layout.activeTabId;
        const label = tab.name ?? `Tab #${index + 1}`;
        if (active && mode === "renameTab") {
          return (
            <input
              key={tab.id}
              data-z3-ribbon
              data-active
              aria-label="Tab name"
              autoFocus
              defaultValue={tab.name ?? ""}
              placeholder={label}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  renameActiveTab(event.currentTarget.value);
                  finishRename("normal");
                } else if (event.key === "Escape") {
                  finishRename("tab");
                }
              }}
              onBlur={() => setMode("normal")}
            />
          );
        }
        return (
          <button
            key={tab.id}
            type="button"
            data-z3-ribbon
            data-active={active || undefined}
            onClick={() => activateTabById(tab.id)}
          >
            {label}
            {tab.fullscreen ? " (FULLSCREEN)" : ""}
          </button>
        );
      })}
      <span data-z3-hints>{MODE_HINTS[mode]}</span>
    </div>
  );
}
