import { scopedThreadKey } from "@t3tools/client-runtime/environment";
import {
  Columns2Icon,
  Columns3Icon,
  LayoutGridIcon,
  LayoutPanelLeftIcon,
  PlusIcon,
  Rows2Icon,
  Rows3Icon,
  SquareIcon,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { PanelTabCloseButton } from "../components/ui/panel-tab-close-button";
import { useComposerHandleContext } from "../composerHandleContext";
import { isElectron } from "../env";
import { cn } from "../lib/utils";
import { useQuietThreadShell } from "../state/entities";
import { COLLAPSED_SIDEBAR_TITLEBAR_INSET_CLASS } from "../workspaceTitlebar";
import { activateTabById, closeTabById, renameActiveTab, runAction } from "./actions";
import type { Mode } from "./keymap";
import { isSplit, leaves, shapeOf, tabFocusedLeaf, type Layout, type Tab } from "./layout";
import { setMode, useZ3Store } from "./store";

/** Tabs show with two or more, and in tab mode so a lone tab can be seen and renamed. */
export function tabStripVisible(layout: Layout, mode: Mode): boolean {
  return layout.tabs.length > 1 || mode === "tab" || mode === "renameTab";
}

/** An unnamed tab takes the title of its focused pane's thread, as a terminal tab does. */
function useTabLabel(tab: Tab): string {
  const target = tabFocusedLeaf(tab)?.target;
  const shell = useQuietThreadShell(target?.kind === "server" ? target.threadRef : null);
  if (tab.name) return tab.name;
  if (shell) return shell.title;
  return target?.kind === "server" ? "Thread" : "New thread";
}

/** A glyph of the tab's tiling. */
function LayoutGlyph({ tab }: { tab: Tab }) {
  const count = leaves(tab.root).length;
  const flat = (axis: string) =>
    shapeOf(tab.root) === `${axis}(${Array(count).fill("•").join(",")})`;
  const Icon =
    count === 1
      ? SquareIcon
      : flat("row")
        ? count === 2
          ? Columns2Icon
          : Columns3Icon
        : flat("column")
          ? count === 2
            ? Rows2Icon
            : Rows3Icon
          : isSplit(tab.root) && tab.root.axis === "row" && !isSplit(tab.root.children[0]!)
            ? LayoutPanelLeftIcon
            : LayoutGridIcon;
  return <Icon className="size-3" />;
}

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

function TabItem({ tab, active }: { tab: Tab; active: boolean }) {
  const renaming = useZ3Store((state) => active && state.mode === "renameTab");
  const label = useTabLabel(tab);
  return (
    <div
      data-active-tab={active}
      className={cn(
        "group/tab flex h-6 min-w-16 max-w-44 shrink items-center gap-1 rounded-md pr-2 pl-1.5 text-xs",
        isElectron && "[-webkit-app-region:no-drag]",
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <PanelTabCloseButton label={`Close ${label}`} onClick={() => closeTabById(tab.id)}>
        <LayoutGlyph tab={tab} />
      </PanelTabCloseButton>
      {renaming ? (
        <TabRenameInput tab={tab} placeholder={label} />
      ) : (
        <button
          type="button"
          className="flex min-w-0 cursor-pointer items-center"
          onClick={() => activateTabById(tab.id)}
          onDoubleClick={() => {
            activateTabById(tab.id);
            setMode("renameTab");
          }}
        >
          <span className="truncate">{label}</span>
        </button>
      )}
    </div>
  );
}

/** The tabs, in the title bar row above the panes, styled as T3's panel tabs. */
export function TabStrip({ layout }: { layout: Layout }) {
  const mode = useZ3Store((state) => state.mode);
  if (!tabStripVisible(layout, mode)) return null;
  return (
    <div
      data-z3-tabs
      className={cn(
        "flex h-[var(--workspace-topbar-height)] min-h-[var(--workspace-topbar-height)] shrink-0 items-center gap-1 border-b pr-3 pl-2",
        isElectron && "drag-region",
        COLLAPSED_SIDEBAR_TITLEBAR_INSET_CLASS,
      )}
    >
      <div className="flex min-w-0 items-center gap-1">
        {layout.tabs.map((tab) => (
          <TabItem key={tab.id} tab={tab} active={tab.id === layout.activeTabId} />
        ))}
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="New tab"
        onClick={() => runAction({ do: "newTab" })}
      >
        <PlusIcon />
      </Button>
    </div>
  );
}

/** A dot on each sidebar thread that is open in a pane, as the Dock marks open apps. */
export function OpenThreadMarks({ layout }: { layout: Layout }) {
  const rows = layout.tabs.flatMap((tab) =>
    leaves(tab.root).flatMap((leaf) =>
      leaf.target?.kind === "server"
        ? [`[data-sidebar-row="${CSS.escape(scopedThreadKey(leaf.target.threadRef))}"]`]
        : [],
    ),
  );
  if (rows.length === 0) return null;
  return <style>{`:is(${rows.join(",")})::after { ${OPEN_DOT} }`}</style>;
}

const OPEN_DOT =
  'content: ""; position: absolute; top: 50%; left: 3px; width: 4px; height: 4px; margin-top: -2px; border-radius: 9999px; background: currentColor; opacity: 0.5;';
