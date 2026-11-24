import { scopedThreadKey, scopeProjectRef } from "@t3tools/client-runtime/environment";
import type { ScopedProjectRef } from "@t3tools/contracts";
import type { AnyRouter } from "@tanstack/react-router";

import { openThreadFind } from "../components/chat/threadFindStore";
import { dispatchCommandPalette } from "../commandPaletteStore";
import { composerDraftHasUserContent, useComposerDraftStore } from "../composerDraftStore";
import { createNewThreadHandler } from "../hooks/useHandleNewThread";
import { readProjects, readThreadShell } from "../state/entities";
import { buildThreadRouteParams, type ThreadRouteTarget } from "../threadRoutes";
import type { Action } from "./keymap";
import {
  activeTab,
  addTab,
  breakPane,
  closePane,
  closeTab,
  createLeaf,
  createTab,
  cyclePane,
  edgePane,
  focusedLeaf,
  focusPane,
  isSplit,
  leaves,
  mapLeaves,
  type Layout,
  type Leaf,
  moveTab,
  movePane,
  neighbor,
  placeNewPane,
  placeTarget,
  removeTarget,
  nudgeBorder,
  resizePaneAll,
  splitPane,
  stepTab,
  swapLayout,
  targetKey,
  updateTab,
  activateTab,
} from "./layout";
import { setMode, useZ3Store } from "./store";

let host: { readonly router: AnyRouter } | null = null;

/** The pane host registers while it shows the thread view; keys act only then. */
export function registerHost(router: AnyRouter | null): void {
  host = router === null ? null : { router };
  document.documentElement.toggleAttribute("data-z3-panes", router !== null);
  if (router === null && useZ3Store.getState().mode !== "locked") setMode("normal");
}

export function isHostActive(): boolean {
  return host !== null;
}

export function locationOf(target: ThreadRouteTarget) {
  return target.kind === "server"
    ? { to: "/$environmentId/$threadId", params: buildThreadRouteParams(target.threadRef) }
    : { to: "/draft/$draftId", params: { draftId: target.draftId } };
}

function projectOf(leaf: Leaf | null): ScopedProjectRef | null {
  const target = leaf?.target;
  if (!target) return null;
  if (target.kind === "server") {
    const shell = readThreadShell(target.threadRef);
    return shell ? scopeProjectRef(shell.environmentId, shell.projectId) : null;
  }
  const session = useComposerDraftStore.getState().getDraftSession(target.draftId);
  return session ? scopeProjectRef(session.environmentId, session.projectId) : null;
}

function anyProject(layout: Layout): ScopedProjectRef | null {
  for (const tab of [activeTab(layout), ...layout.tabs]) {
    for (const leaf of leaves(tab.root)) {
      const project = projectOf(leaf);
      if (project) return project;
    }
  }
  const project = readProjects().find((candidate) => candidate.archivedAt == null);
  return project ? scopeProjectRef(project.environmentId, project.id) : null;
}

/** Commits a layout, and moves the route to the focused pane's thread. */
function commit(next: Layout): void {
  const { routeKey, layout: previous } = useZ3Store.getState();
  const leaf = focusedLeaf(next);
  useZ3Store.setState({ layout: next, focusRequest: leaf?.id ?? null });
  if (host === null || leaf === null) return;
  if (leaf.target === null) {
    startThread(next, focusedLeaf(previous));
  } else if (targetKey(leaf.target) !== routeKey) {
    followFocus();
  }
}

let following = false;

/**
 * Moves the route to the focused pane's thread after the frame that shows the focus. A route
 * change renders the sidebar and the thread views, which would hold that frame back.
 */
function followFocus(): void {
  if (following) return;
  following = true;
  requestAnimationFrame(() =>
    setTimeout(() => {
      following = false;
      const { layout, routeKey } = useZ3Store.getState();
      const target = focusedLeaf(layout)?.target;
      if (host === null || target == null || targetKey(target) === routeKey) return;
      void host.router.navigate({ ...locationOf(target), replace: true } as never);
    }),
  );
}

// While the stock flow creates a new pane's draft, focus stays on that pane, so the draft's route
// lands in it (followRoute fills the focused pane).
let creating = false;

/** The stock new-thread flow opens a draft; the route then places it in the focused empty pane. */
function startThread(layout: Layout, source: Leaf | null): void {
  const project = projectOf(source) ?? anyProject(layout);
  if (host === null) return;
  if (project === null) {
    console.info("[z3] new pane stays empty: no project to start a thread in");
    return;
  }
  creating = true;
  void createNewThreadHandler(host.router)(project).finally(() => {
    creating = false;
  });
}

function gridSize() {
  const grid = document.querySelector("[data-z3-grid]")?.getBoundingClientRect();
  return { width: grid?.width ?? 1, height: grid?.height ?? 1 };
}

function scroller(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    "[data-z3-cell][data-focused] .messages-timeline-scroll",
  );
}

const LINE_PX = 48;

function scrollBy(by: "line" | "half" | "page", step: 1 | -1): boolean {
  const el = scroller();
  if (el === null) return false;
  const amount =
    by === "line" ? LINE_PX : by === "half" ? el.clientHeight / 2 : el.clientHeight * 0.9;
  el.scrollBy({ top: amount * step });
  return true;
}

function clickInFocused(selector: string, pick: "first" | "last" = "first"): boolean {
  const all = document.querySelectorAll<HTMLButtonElement>(
    `[data-z3-cell][data-focused] ${selector}`,
  );
  const button = pick === "first" ? all[0] : all[all.length - 1];
  if (!button || button.disabled) return false;
  button.click();
  return true;
}

/** Runs one keymap action. Returns false when it had nothing to act on. */
export function runAction(action: Action): boolean {
  if (creating) {
    console.info("[z3] key ignored: a new pane's thread is being created", action);
    return false;
  }
  const { layout } = useZ3Store.getState();
  const tab = activeTab(layout);
  const focused = tab.focusedPaneId;
  const withTab = (fn: (t: typeof tab) => typeof tab) => commit(updateTab(layout, tab.id, fn));
  switch (action.do) {
    case "focus": {
      const target = neighbor(tab, focused, action.dir);
      if (target !== null) {
        withTab((t) => ({ ...focusPane(t, target), fullscreen: false }));
        return true;
      }
      if (!action.orTab || layout.tabs.length < 2) return returnFocusToPane();
      // The move goes on into the next tab: it enters at the edge it crosses.
      const stepped = stepTab(layout, action.dir === "left" ? -1 : 1);
      const entered = action.dir === "left" ? "right" : "left";
      commit(
        updateTab(stepped, stepped.activeTabId, (t) => ({
          ...focusPane(t, edgePane(t, entered)),
          fullscreen: false,
        })),
      );
      return true;
    }
    case "cyclePane":
      if (!isSplit(tab.root)) return false;
      withTab((t) => ({ ...focusPane(t, cyclePane(t, 1)), fullscreen: false }));
      return true;
    case "lastPane":
      if (tab.lastPaneId === null) return false;
      withTab((t) => ({ ...focusPane(t, t.lastPaneId!), fullscreen: false }));
      return true;
    case "newPane": {
      const place = action.dir
        ? { leafId: focused, direction: action.dir }
        : placeNewPane(tab, gridSize());
      withTab((t) => splitPane(t, place.leafId, place.direction, createLeaf(null)));
      return true;
    }
    case "closePane": {
      const remaining = closePane(tab, focused);
      if (remaining !== null) {
        withTab(() => remaining);
        return true;
      }
      return runAction({ do: "closeTab" });
    }
    case "fullscreen":
      if (!isSplit(tab.root)) return false;
      withTab((t) => ({ ...t, fullscreen: !t.fullscreen }));
      return true;
    case "renamePane":
      return startRenamePane();
    case "newTab":
      commit(addTab(layout, createTab(createLeaf(null))));
      return true;
    case "closeTab": {
      const next = closeTab(layout, tab.id);
      if (next === null) return false;
      commit(next);
      return true;
    }
    case "stepTab":
      if (layout.tabs.length < 2) return false;
      commit(stepTab(layout, action.step));
      return true;
    case "goToTab": {
      const target = layout.tabs[action.index];
      if (target === undefined) return false;
      commit(activateTab(layout, target.id));
      return true;
    }
    case "lastTab":
      if (layout.lastTabId === null) return false;
      commit(activateTab(layout, layout.lastTabId));
      return true;
    case "moveTab":
      if (layout.tabs.length < 2) return false;
      useZ3Store.setState({ layout: moveTab(layout, action.step) });
      return true;
    case "breakPane": {
      const next = breakPane(layout, action.to);
      if (next === layout) return false;
      commit(next);
      return true;
    }
    case "swapLayout": {
      const next = swapLayout(tab, action.step);
      if (next === tab) return false;
      useZ3Store.setState({ layout: updateTab(layout, tab.id, () => next) });
      return true;
    }
    case "nudge":
    case "resize": {
      const next =
        action.do === "nudge"
          ? nudgeBorder(tab, focused, action.dir)
          : resizePaneAll(tab, focused, action.grow);
      if (next === tab) return false;
      useZ3Store.setState({ layout: updateTab(layout, tab.id, () => next) });
      return true;
    }
    case "move": {
      const next = movePane(tab, focused, action.to);
      if (next === tab) return false;
      useZ3Store.setState({ layout: updateTab(layout, tab.id, () => next) });
      return true;
    }
    case "scroll":
      return scrollBy(action.by, action.step);
    case "scrollToBottom": {
      if (clickInFocused('[data-scroll-to-end="true"]')) return true;
      const el = scroller();
      el?.scrollTo({ top: el.scrollHeight });
      return el !== null;
    }
    case "jumpTurn":
      return clickInFocused(
        '[data-testid="timeline-minimap"] button',
        action.step < 0 ? "first" : "last",
      );
    case "find": {
      const target = focusedLeaf(layout)?.target;
      if (target?.kind !== "server") return false;
      openThreadFind(scopedThreadKey(target.threadRef));
      return true;
    }
    case "palette":
      dispatchCommandPalette({ _tag: "SetOpen", open: true });
      return true;
    case "settings":
      void host?.router.navigate({ to: "/settings" } as never);
      return true;
  }
}

/** The stock title of the pane header renames on a double click. */
function startRenamePane(): boolean {
  const title = document.querySelector(
    "[data-z3-cell][data-focused] [data-chat-header] button:has(> [data-thread-title-chevron])",
  );
  if (title === null) return false;
  title.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  return true;
}

export function renameActiveTab(name: string): void {
  const { layout } = useZ3Store.getState();
  const trimmed = name.trim();
  useZ3Store.setState({
    layout: updateTab(layout, activeTab(layout).id, (t) => ({
      ...t,
      name: trimmed === "" ? null : trimmed,
    })),
  });
}

export function activateTabById(tabId: string): void {
  commit(activateTab(useZ3Store.getState().layout, tabId));
}

export function closeTabById(tabId: string): void {
  const next = closeTab(useZ3Store.getState().layout, tabId);
  if (next !== null) commit(next);
}

/** A pane with no thread, or with a draft that holds nothing, gives its place to a thread. */
function isBlankLeaf(leaf: Leaf): boolean {
  if (leaf.target === null) return true;
  if (leaf.target.kind !== "draft") return false;
  const drafts = useComposerDraftStore.getState();
  return !composerDraftHasUserContent(drafts.getComposerDraft(leaf.target.draftId));
}

/** Shows the threads in tab `dest` (`"new"` opens one tab for them) and goes there. */
export function openInTab(targets: ReadonlyArray<ThreadRouteTarget>, dest: string): void {
  if (creating) {
    console.info("[z3] move ignored: a new pane's thread is being created", dest);
    return;
  }
  let next = useZ3Store.getState().layout;
  let tabId = dest;
  for (const target of targets) {
    next = placeTarget(next, target, tabId, gridSize(), isBlankLeaf);
    tabId = next.activeTabId;
  }
  commit(next);
}

/** Closes the panes that show the threads; the threads stay in the sidebar. */
export function removeFromTabs(targets: ReadonlyArray<ThreadRouteTarget>): void {
  if (creating) {
    console.info("[z3] remove ignored: a new pane's thread is being created");
    return;
  }
  const { layout } = useZ3Store.getState();
  const next = targets.reduce((result, target) => removeTarget(result, targetKey(target)), layout);
  if (next !== layout) commit(next);
}

export function focusPaneInTab(tabId: string, leafId: string): void {
  const { layout } = useZ3Store.getState();
  commit(
    updateTab(activateTab(layout, tabId), tabId, (tab) => ({
      ...focusPane(tab, leafId),
      fullscreen: false,
    })),
  );
}

/** With no pane to move to, a pane key still brings DOM focus back into the focused pane. */
function returnFocusToPane(): boolean {
  const cell = document.querySelector("[data-z3-cell][data-focused]");
  if (cell === null || cell.contains(document.activeElement)) return false;
  useZ3Store.setState({ focusRequest: activeTab(useZ3Store.getState().layout).focusedPaneId });
  return true;
}

/** A pane whose thread cannot show (deleted, archived, hidden) closes, or empties if it is alone. */
export function dropPaneTarget(leafId: string): void {
  const { layout } = useZ3Store.getState();
  const tab = layout.tabs.find((candidate) =>
    leaves(candidate.root).some((leaf) => leaf.id === leafId),
  );
  if (tab === undefined) return;
  console.info("[z3] pane target unavailable; dropping it", leafId);
  const remaining = closePane(tab, leafId);
  commit(
    remaining === null
      ? mapLeaves(layout, (leaf) => (leaf.id === leafId ? { ...leaf, target: null } : leaf))
      : updateTab(layout, tab.id, () => remaining),
  );
}

/** A pointer press or focus inside a passive pane makes it the focused pane. */
export function focusPaneById(leafId: string): void {
  const { layout } = useZ3Store.getState();
  const tab = activeTab(layout);
  if (tab.focusedPaneId === leafId) return;
  if (creating) {
    console.info("[z3] focus stays: a new pane's thread is being created", leafId);
    return;
  }
  commit(updateTab(layout, tab.id, (t) => focusPane(t, leafId)));
  useZ3Store.setState({ focusRequest: null });
}
