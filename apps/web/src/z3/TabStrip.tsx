import { PlusIcon, XIcon } from "lucide-react";

import { useComposerHandleContext } from "../composerHandleContext";
import { isElectron } from "../env";
import { cn } from "../lib/utils";
import { COLLAPSED_SIDEBAR_TITLEBAR_INSET_CLASS } from "../workspaceTitlebar";
import { activateTabById, closeTabById, renameActiveTab, runAction } from "./actions";
import { MODE_HINTS, type Mode } from "./keymap";
import type { Layout, Tab } from "./layout";
import { tabDropProps, tabLabel } from "./SidebarTabs";
import { setMode, useZ3Store } from "./store";

const MODE_NAME: Partial<Record<Mode, string>> = {
  locked: "Locked",
  pane: "Pane",
  tab: "Tab",
  resize: "Resize",
  move: "Move",
  scroll: "Scroll",
  session: "Session",
};

function TabRenameInput({ tab, placeholder }: { tab: Tab; placeholder: string }) {
  const composer = useComposerHandleContext();
  return (
    <input
      aria-label="Tab name"
      autoFocus
      defaultValue={tab.name ?? ""}
      placeholder={placeholder}
      className="w-28 min-w-0 rounded-sm bg-background px-1 outline-none ring-1 ring-ring ring-inset"
      onKeyDown={(event) => {
        if (event.key === "Enter") renameActiveTab(event.currentTarget.value);
        if (event.key !== "Enter" && event.key !== "Escape") return;
        setMode("normal");
        composer?.current?.focusAtEnd();
      }}
      onBlur={() => {
        if (useZ3Store.getState().mode === "renameTab") setMode("normal");
      }}
    />
  );
}

// All-caps text sits on its cap height, so it centers optically; it would clip descenders.
const CAPS_TRIM = "[text-box:trim-both_cap_alphabetic]";

function TabItem({ tab, index, active }: { tab: Tab; index: number; active: boolean }) {
  const renaming = useZ3Store((state) => active && state.mode === "renameTab");
  const label = tabLabel(tab.name, index);
  return (
    <div
      data-active-tab={active}
      {...tabDropProps(tab.id)}
      className={cn(
        "group/tab relative flex h-5 min-w-14 max-w-40 shrink items-center rounded-md px-4",
        isElectron && "[-webkit-app-region:no-drag]",
        active
          ? "bg-foreground/10 text-foreground"
          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      <button
        type="button"
        aria-label={`Close ${label}`}
        className="absolute start-0.5 hidden size-4 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:flex group-hover/tab:flex"
        onClick={() => closeTabById(tab.id)}
      >
        <XIcon className="size-3" />
      </button>
      {renaming ? (
        <TabRenameInput tab={tab} placeholder={label} />
      ) : (
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer justify-center"
          onClick={() => activateTabById(tab.id)}
          onDoubleClick={() => {
            activateTabById(tab.id);
            setMode("renameTab");
          }}
        >
          <span className="truncate leading-none">{label}</span>
        </button>
      )}
    </div>
  );
}

/** The mode's name and keys, shown while a mode is on; Zellij's status bar, in one line. */
function ModeLabel() {
  const mode = useZ3Store((state) => state.mode);
  const name = MODE_NAME[mode];
  if (name === undefined) return null;
  const hints = mode === "locked" ? [] : MODE_HINTS[mode as keyof typeof MODE_HINTS];
  return (
    <div data-z3-mode-label className="flex min-w-0 shrink items-center gap-2">
      <span
        className={cn(
          "shrink-0 rounded-sm bg-primary px-1.5 py-1 font-semibold text-3xs text-primary-foreground uppercase tracking-wider",
          CAPS_TRIM,
        )}
      >
        {name}
      </span>
      <span className="truncate text-muted-foreground leading-none">
        {hints.map(([keys, action]) => `${keys} ${action}`).join(" · ")}
      </span>
    </div>
  );
}

/** The window's top row: the tabs, and the mode while one is on. */
export function TabStrip({ layout }: { layout: Layout }) {
  return (
    <div
      data-z3-tabs
      className={cn(
        "relative flex shrink-0 items-center gap-1 pe-3 ps-2 text-2xs",
        isElectron && "drag-region",
        COLLAPSED_SIDEBAR_TITLEBAR_INSET_CLASS,
      )}
    >
      <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
        {layout.tabs.map((tab, index) => (
          <TabItem key={tab.id} tab={tab} index={index} active={tab.id === layout.activeTabId} />
        ))}
      </div>
      <button
        type="button"
        aria-label="New tab"
        {...tabDropProps("new")}
        className={cn(
          "flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
          isElectron && "[-webkit-app-region:no-drag]",
        )}
        onClick={() => runAction({ do: "newTab" })}
      >
        <PlusIcon className="size-3.5" />
      </button>
      <div className="ms-auto flex min-w-0 justify-end ps-4">
        <ModeLabel />
      </div>
    </div>
  );
}
