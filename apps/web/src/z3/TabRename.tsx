import { useComposerHandleContext } from "../composerHandleContext";
import { renameActiveTab } from "./actions";
import type { Mode } from "./keymap";
import type { Layout } from "./layout";
import { setMode, useZ3Store } from "./store";

/** The input of Zellij's RenameTab mode, in the corner under the composer while it lasts. */
export function TabRename({ layout }: { layout: Layout }) {
  const mode = useZ3Store((state) => state.mode);
  const composer = useComposerHandleContext();
  if (mode !== "renameTab") return null;
  const index = layout.tabs.findIndex((tab) => tab.id === layout.activeTabId);
  const finish = (next: Mode) => {
    setMode(next);
    composer?.current?.focusAtEnd();
  };
  return (
    <input
      aria-label="Tab name"
      autoFocus
      defaultValue={layout.tabs[index]?.name ?? ""}
      placeholder={`Tab ${index + 1}`}
      className="absolute right-3 bottom-0.5 z-50 h-4 w-28 border-b border-ring bg-transparent text-2xs text-foreground outline-none"
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          renameActiveTab(event.currentTarget.value);
          finish("normal");
        } else if (event.key === "Escape") {
          finish("tab");
        }
      }}
      onBlur={() => {
        if (useZ3Store.getState().mode === "renameTab") setMode("normal");
      }}
    />
  );
}
