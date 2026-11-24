import { scopedThreadKey } from "@t3tools/client-runtime/environment";
import type { ContextMenuItem, ScopedThreadRef } from "@t3tools/contracts";
import { XIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  THREAD_CONTEXT_DROP_EVENT,
  threadContextDropTargetProps,
} from "../components/chat/threadContextDrag";
import type { ThreadContextDropRef } from "../components/chat/threadContextDrop.logic";
import { cn } from "../lib/utils";
import { readLocalApi } from "../localApi";
import { useQuietThreadShell } from "../state/entities";
import type { ThreadRouteTarget } from "../threadRoutes";
import {
  activateTabById,
  closeTabById,
  focusPaneInTab,
  openInTab,
  removeFromTabs,
} from "./actions";
import { tabGroups, type TabGroup } from "./layout";
import { useZ3Store } from "./store";

export interface SidebarTab extends TabGroup {
  readonly index: number;
  readonly label: string;
}

const serverTarget = (threadRef: ScopedThreadRef): ThreadRouteTarget => ({
  kind: "server",
  threadRef: { environmentId: threadRef.environmentId, threadId: threadRef.threadId },
});

/** Zellij's default tab name. */
export const tabLabel = (name: string | null, index: number) => name ?? `Tab ${index + 1}`;

/** The sidebar thread key of the thread a pane shows; null for a draft or an empty pane. */
export function paneThreadKey(target: ThreadRouteTarget | null): string | null {
  return target?.kind === "server" ? scopedThreadKey(target.threadRef) : null;
}

/** The tabs as sidebar groups, and the tab of each thread a pane shows. */
export function useSidebarTabs(): {
  readonly tabs: ReadonlyArray<SidebarTab>;
  readonly tabOf: ReadonlyMap<string, string>;
} {
  // A string, so a resize or a mode change does not render the sidebar.
  const json = useZ3Store((state) => JSON.stringify(tabGroups(state.layout)));
  const tabs = (JSON.parse(json) as TabGroup[]).map((group, index) => ({
    ...group,
    index,
    label: tabLabel(group.name, index),
  }));
  const tabOf = new Map<string, string>();
  for (const tab of tabs) {
    for (const pane of tab.panes) {
      const key = paneThreadKey(pane.target);
      if (key !== null) tabOf.set(key, tab.id);
    }
  }
  return { tabs, tabOf };
}

/** Threads outside tabs are one flat list; stock groups the grouped sidebar's into project folders. */
export const FLAT_THREAD_LIST: boolean = true;
/** Stands in for a folder's row id, so a flat row is a one-line row with its project mark. */
export const FLAT_THREAD_ROW = "z3-flat";

/** The tree row of a tab's header; its thread rows name it as their parent. */
export const sidebarTabRowId = (tabId: string) => `z3-tab:${tabId}`;

const DROP_ZONE = "[data-z3-tab-group], [data-z3-untab]";

/** True over a tab group or the no-tab strip, under a row the pointer drags. */
export function isOverSidebarTabDrop(point: { x: number; y: number }): boolean {
  return document.elementsFromPoint(point.x, point.y).some((element) => element.matches(DROP_ZONE));
}

/** Runs `onDrop` with the threads a sidebar drag releases on the element. */
function onThreadDrop(onDrop: (targets: ReadonlyArray<ThreadRouteTarget>) => void) {
  return (element: HTMLElement | null) => {
    if (element === null) return;
    const listener = (event: Event) =>
      onDrop((event as CustomEvent<ReadonlyArray<ThreadContextDropRef>>).detail.map(serverTarget));
    element.addEventListener(THREAD_CONTEXT_DROP_EVENT, listener);
    return () => element.removeEventListener(THREAD_CONTEXT_DROP_EVENT, listener);
  };
}

/** Props of an element that takes dragged sidebar threads into tab `dest`. */
export function tabDropProps(dest: string) {
  return {
    ...threadContextDropTargetProps(),
    ref: onThreadDrop((targets) => openInTab(targets, dest)),
  };
}

/** A tab in the sidebar: its header, then one row per pane. Dropped threads move into the tab. */
export function SidebarTabGroup({ tab, children }: { tab: SidebarTab; children: ReactNode }) {
  return (
    <li
      data-z3-tab-group={tab.id}
      data-active-tab={tab.active || undefined}
      className="group/z3-tab list-none rounded-md"
      {...tabDropProps(tab.id)}
    >
      <div className="flex h-6 items-center pe-1">
        <button
          type="button"
          data-sidebar-row={sidebarTabRowId(tab.id)}
          aria-current={tab.active ? "true" : undefined}
          className={cn(
            "flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md px-(--sidebar-row-content-inset) text-left text-2xs outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            tab.active
              ? "text-sidebar-foreground"
              : "text-sidebar-muted-foreground hover:text-sidebar-foreground",
          )}
          onClick={() => activateTabById(tab.id)}
        >
          <span
            className={cn(
              "flex size-3.5 shrink-0 items-center justify-center rounded-sm text-3xs tabular-nums",
              tab.active ? "bg-primary text-primary-foreground" : "bg-foreground/10",
            )}
          >
            {tab.index + 1}
          </span>
          <span className="truncate font-medium">{tab.label}</span>
        </button>
        <button
          type="button"
          aria-label={`Close ${tab.label}`}
          className="hidden size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm text-sidebar-muted-foreground hover:bg-foreground/10 hover:text-sidebar-foreground focus-visible:flex group-hover/z3-tab:flex"
          onClick={() => closeTabById(tab.id)}
        >
          <XIcon className="size-3" />
        </button>
      </div>
      <ul role="presentation" className="flex flex-col gap-px">
        {children}
      </ul>
    </li>
  );
}

/** A pane with no sidebar thread row: a draft, an empty pane, or a thread the list leaves out. */
export function SidebarTabPaneRow({
  tab,
  pane,
}: {
  tab: SidebarTab;
  pane: SidebarTab["panes"][number];
}) {
  const shell = useQuietThreadShell(pane.target?.kind === "server" ? pane.target.threadRef : null);
  const title = shell?.title.trim() || "New thread";
  return (
    <li className="list-none">
      <button
        type="button"
        // Not the bare title: "New thread" is the header button's name.
        aria-label={`${title}, pane of ${tab.label}`}
        data-sidebar-row={`z3-pane:${pane.id}`}
        data-sidebar-parent={sidebarTabRowId(tab.id)}
        aria-current={pane.focused ? "true" : undefined}
        className={cn(
          "flex h-7 w-full cursor-pointer items-center rounded-md ps-9 pe-(--sidebar-row-content-inset) text-left text-sm outline-none hover:bg-sidebar-row-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          pane.focused
            ? "bg-sidebar-row-active text-sidebar-foreground"
            : "text-sidebar-muted-foreground",
        )}
        onClick={() => focusPaneInTab(tab.id, pane.id)}
      >
        <span className={cn("truncate", shell === null && "italic")}>{title}</span>
      </button>
    </li>
  );
}

/** Shown while a tab's thread is dragged: a release here closes its pane. */
export function SidebarUntabDrop({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <li
      data-z3-untab
      className="flex h-7 list-none items-center rounded-md border border-dashed px-(--sidebar-row-content-inset) text-2xs text-sidebar-muted-foreground"
      {...threadContextDropTargetProps()}
      ref={onThreadDrop(removeFromTabs)}
    >
      No tab
    </li>
  );
}

type TabMenuId = "z3:tab" | `z3:tab:${string}` | "z3:untab";

/** The thread menu's tab entries: the tab to show the thread in, and the way out of its tab. */
export function tabMenuItems(
  threadRef: ScopedThreadRef,
  { tabs, tabOf }: ReturnType<typeof useSidebarTabs>,
): ReadonlyArray<ContextMenuItem<TabMenuId>> {
  const current = tabOf.get(scopedThreadKey(threadRef));
  return [
    {
      id: "z3:tab",
      label: current === undefined ? "Open in tab" : "Move to tab",
      children: [
        ...tabs.map((tab) => ({
          id: `z3:tab:${tab.id}` as const,
          label: tab.name === null ? tab.label : `${tab.index + 1} · ${tab.label}`,
          disabled: tab.id === current,
        })),
        { id: "z3:tab:new", label: "New tab", separatorBefore: true },
      ],
    },
    ...(current === undefined ? [] : [{ id: "z3:untab" as const, label: "Remove from tab" }]),
  ];
}

export function isTabMenuId(id: string): id is TabMenuId {
  return id === "z3:untab" || id.startsWith("z3:tab");
}

export function runTabMenu(id: TabMenuId, threadRef: ScopedThreadRef): void {
  if (id === "z3:untab") removeFromTabs([serverTarget(threadRef)]);
  else if (id !== "z3:tab") openInTab([serverTarget(threadRef)], id.slice("z3:tab:".length));
}

/** The click menu of a thread no pane shows: every tab, then a new tab. */
export async function pickTab(
  threadRef: ScopedThreadRef,
  position: { x: number; y: number },
  tabs: ReadonlyArray<SidebarTab>,
): Promise<void> {
  const api = readLocalApi();
  if (!api) {
    console.info("[z3] no menu api; the thread opens in the focused pane's tab");
    return openInTab([serverTarget(threadRef)], useZ3Store.getState().layout.activeTabId);
  }
  const picked = await api.contextMenu.show<TabMenuId>(
    [
      ...tabs.map((tab) => ({ id: `z3:tab:${tab.id}` as const, label: tab.label })),
      { id: "z3:tab:new", label: "New tab", icon: "plus", separatorBefore: true },
    ],
    position,
  );
  if (picked !== null) runTabMenu(picked, threadRef);
}
