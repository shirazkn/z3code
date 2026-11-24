import { randomUUID } from "../lib/utils";
import type { ThreadRouteTarget } from "../threadRoutes";

export type Direction = "left" | "right" | "up" | "down";
/** `row` lays children left to right, `column` top to bottom. */
export type Axis = "row" | "column";

export interface Leaf {
  readonly id: string;
  /** Null while a new pane waits for its draft thread. */
  readonly target: ThreadRouteTarget | null;
}

/** `sizes` are fractions that sum to 1. A child split never has its parent's axis. */
export interface Split {
  readonly id: string;
  readonly axis: Axis;
  readonly children: ReadonlyArray<PaneNode>;
  readonly sizes: ReadonlyArray<number>;
}

export type PaneNode = Leaf | Split;

export interface Tab {
  readonly id: string;
  readonly name: string | null;
  readonly root: PaneNode;
  readonly focusedPaneId: string;
  readonly lastPaneId: string | null;
  readonly fullscreen: boolean;
}

export interface Layout {
  readonly tabs: ReadonlyArray<Tab>;
  readonly activeTabId: string;
  readonly lastTabId: string | null;
}

/** Fractions of the tab's grid. */
export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

const UNIT: Rect = { left: 0, top: 0, width: 1, height: 1 };
const EPSILON = 1e-6;
const RESIZE_STEP = 0.05;
const MIN_FRACTION = 0.1;

function newId(prefix: "tab" | "pane" | "split"): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function isSplit(node: PaneNode): node is Split {
  return "children" in node;
}

export function targetKey(target: ThreadRouteTarget): string {
  return target.kind === "server"
    ? `server:${target.threadRef.environmentId}:${target.threadRef.threadId}`
    : `draft:${target.draftId}`;
}

export function createLeaf(target: ThreadRouteTarget | null): Leaf {
  return { id: newId("pane"), target };
}

export function createTab(leaf: Leaf): Tab {
  return {
    id: newId("tab"),
    name: null,
    root: leaf,
    focusedPaneId: leaf.id,
    lastPaneId: null,
    fullscreen: false,
  };
}

export function createLayout(target: ThreadRouteTarget | null): Layout {
  const tab = createTab(createLeaf(target));
  return { tabs: [tab], activeTabId: tab.id, lastTabId: null };
}

export function leaves(node: PaneNode): Leaf[] {
  return isSplit(node) ? node.children.flatMap(leaves) : [node];
}

function findLeaf(node: PaneNode, leafId: string): Leaf | null {
  return leaves(node).find((leaf) => leaf.id === leafId) ?? null;
}

export function activeTab(layout: Layout): Tab {
  return layout.tabs.find((tab) => tab.id === layout.activeTabId) ?? layout.tabs[0]!;
}

function tabFocusedLeaf(tab: Tab): Leaf | null {
  return findLeaf(tab.root, tab.focusedPaneId);
}

export function focusedLeaf(layout: Layout): Leaf | null {
  return tabFocusedLeaf(activeTab(layout));
}

export function isMulti(layout: Layout): boolean {
  return layout.tabs.length > 1 || isSplit(activeTab(layout).root);
}

export function rects(node: PaneNode, rect: Rect = UNIT): Map<string, Rect> {
  if (!isSplit(node)) return new Map([[node.id, rect]]);
  const out = new Map<string, Rect>();
  let offset = 0;
  node.children.forEach((child, index) => {
    const size = node.sizes[index]!;
    const childRect =
      node.axis === "row"
        ? { ...rect, left: rect.left + offset * rect.width, width: size * rect.width }
        : { ...rect, top: rect.top + offset * rect.height, height: size * rect.height };
    offset += size;
    for (const [id, r] of rects(child, childRect)) out.set(id, r);
  });
  return out;
}

function mapNode(node: PaneNode, fn: (node: PaneNode) => PaneNode): PaneNode {
  const mapped = isSplit(node)
    ? { ...node, children: node.children.map((c) => mapNode(c, fn)) }
    : node;
  return fn(mapped);
}

/** Rewrites every leaf of every tab; returns the same layout when no leaf changes. */
export function mapLeaves(layout: Layout, fn: (leaf: Leaf) => Leaf): Layout {
  let changed = false;
  const tabs = layout.tabs.map((tab) => ({
    ...tab,
    root: mapNode(tab.root, (node) => {
      if (isSplit(node)) return node;
      const next = fn(node);
      changed ||= next !== node;
      return next;
    }),
  }));
  return changed ? { ...layout, tabs } : layout;
}

/** Merges a child split into a parent of the same axis, so the tree stays canonical. */
function normalize(node: PaneNode): PaneNode {
  if (!isSplit(node)) return node;
  const children: PaneNode[] = [];
  const sizes: number[] = [];
  node.children.forEach((raw, index) => {
    const child = normalize(raw);
    const size = node.sizes[index]!;
    if (isSplit(child) && child.axis === node.axis) {
      child.children.forEach((grandchild, j) => {
        children.push(grandchild);
        sizes.push(size * child.sizes[j]!);
      });
    } else {
      children.push(child);
      sizes.push(size);
    }
  });
  if (children.length === 1) return children[0]!;
  const total = sizes.reduce((a, b) => a + b, 0);
  return { ...node, children, sizes: sizes.map((s) => s / total) };
}

function withFocus(tab: Tab, leafId: string): Tab {
  if (tab.focusedPaneId === leafId) return tab;
  return { ...tab, focusedPaneId: leafId, lastPaneId: tab.focusedPaneId };
}

export function focusPane(tab: Tab, leafId: string): Tab {
  return findLeaf(tab.root, leafId) === null ? tab : withFocus(tab, leafId);
}

export function splitPane(tab: Tab, leafId: string, direction: "right" | "down", added: Leaf): Tab {
  const axis: Axis = direction === "right" ? "row" : "column";
  const root = normalize(
    mapNode(tab.root, (node) =>
      !isSplit(node) && node.id === leafId
        ? { id: newId("split"), axis, children: [node, added], sizes: [0.5, 0.5] }
        : node,
    ),
  );
  return withFocus({ ...tab, root, fullscreen: false }, added.id);
}

/** Zellij's plain NewPane: split the largest pane, down when it is taller than wide. */
export function placeNewPane(
  tab: Tab,
  grid: Size,
): { leafId: string; direction: "right" | "down" } {
  let best: { leafId: string; area: number; rect: Rect } | null = null;
  for (const [leafId, rect] of rects(tab.root)) {
    const area = rect.width * grid.width * rect.height * grid.height;
    if (best === null || area > best.area + EPSILON) best = { leafId, area, rect };
  }
  const { leafId, rect } = best!;
  return {
    leafId,
    direction: rect.height * grid.height > rect.width * grid.width ? "down" : "right",
  };
}

export function closePane(tab: Tab, leafId: string): Tab | null {
  const remaining = leaves(tab.root).filter((leaf) => leaf.id !== leafId);
  if (remaining.length === leaves(tab.root).length) return tab;
  if (remaining.length === 0) return null;
  const prune = (node: PaneNode): PaneNode | null => {
    if (!isSplit(node)) return node.id === leafId ? null : node;
    const kept = node.children
      .map((child, index) => [prune(child), node.sizes[index]!] as const)
      .filter((entry): entry is readonly [PaneNode, number] => entry[0] !== null);
    return { ...node, children: kept.map(([c]) => c), sizes: kept.map(([, s]) => s) };
  };
  const root = normalize(prune(tab.root)!);
  const ids = new Set(remaining.map((leaf) => leaf.id));
  const focus =
    tab.focusedPaneId !== leafId
      ? tab.focusedPaneId
      : tab.lastPaneId !== null && ids.has(tab.lastPaneId)
        ? tab.lastPaneId
        : remaining[0]!.id;
  return { ...tab, root, focusedPaneId: focus, lastPaneId: null, fullscreen: false };
}

function overlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

/** The pane that shares the edge on `direction`; ties go to the last focused pane. */
export function neighbor(tab: Tab, leafId: string, direction: Direction): string | null {
  const all = rects(tab.root);
  const from = all.get(leafId);
  if (from === undefined) return null;
  let best: { id: string; score: number } | null = null;
  for (const [id, r] of all) {
    if (id === leafId) continue;
    const adjacent =
      direction === "left"
        ? Math.abs(r.left + r.width - from.left) < EPSILON
        : direction === "right"
          ? Math.abs(from.left + from.width - r.left) < EPSILON
          : direction === "up"
            ? Math.abs(r.top + r.height - from.top) < EPSILON
            : Math.abs(from.top + from.height - r.top) < EPSILON;
    if (!adjacent) continue;
    const shared =
      direction === "left" || direction === "right"
        ? overlap(from.top, from.top + from.height, r.top, r.top + r.height)
        : overlap(from.left, from.left + from.width, r.left, r.left + r.width);
    if (shared <= EPSILON) continue;
    const score = shared + (id === tab.lastPaneId ? 1 : 0);
    if (best === null || score > best.score) best = { id, score };
  }
  return best?.id ?? null;
}

export function cyclePane(tab: Tab, step: 1 | -1): string {
  const ids = leaves(tab.root).map((leaf) => leaf.id);
  const index = ids.indexOf(tab.focusedPaneId);
  return ids[(index + step + ids.length) % ids.length]!;
}

/** Path of [split, child index] pairs from the root down to the leaf. */
function pathTo(node: PaneNode, leafId: string): Array<[Split, number]> | null {
  if (!isSplit(node)) return node.id === leafId ? [] : null;
  for (const [index, child] of node.children.entries()) {
    const rest = pathTo(child, leafId);
    if (rest !== null) return [[node, index], ...rest];
  }
  return null;
}

function replaceSplit(root: PaneNode, next: Split): PaneNode {
  return mapNode(root, (node) => (isSplit(node) && node.id === next.id ? next : node));
}

/** Moves the boundary between child `index` and its neighbor `other` by `delta` of the split. */
function moveBoundary(split: Split, index: number, other: number, delta: number): Split | null {
  const sizes = [...split.sizes];
  const grown = sizes[index]! + delta;
  const shrunk = sizes[other]! - delta;
  if (grown < MIN_FRACTION - EPSILON || shrunk < MIN_FRACTION - EPSILON) return null;
  sizes[index] = grown;
  sizes[other] = shrunk;
  return { ...split, sizes };
}

/**
 * Moves the pane's border toward `direction`: its right (bottom) border when it has one, else its
 * left (top) border. Opposite directions undo each other, as a dragged divider does.
 */
export function nudgeBorder(tab: Tab, leafId: string, direction: Direction): Tab {
  const axis: Axis = direction === "left" || direction === "right" ? "row" : "column";
  const delta = direction === "right" || direction === "down" ? RESIZE_STEP : -RESIZE_STEP;
  const path = pathTo(tab.root, leafId) ?? [];
  for (const [split, index] of [...path].reverse()) {
    if (split.axis !== axis) continue;
    const next =
      index + 1 < split.children.length
        ? moveBoundary(split, index, index + 1, delta)
        : moveBoundary(split, index - 1, index, delta);
    return next === null ? tab : { ...tab, root: replaceSplit(tab.root, next) };
  }
  return tab;
}

/** Moves the pane's edge on `direction` outward (`grow`) or inward. */
function resizePane(tab: Tab, leafId: string, direction: Direction, grow: boolean): Tab {
  const axis: Axis = direction === "left" || direction === "right" ? "row" : "column";
  const before = direction === "left" || direction === "up";
  const path = pathTo(tab.root, leafId) ?? [];
  for (const [split, index] of [...path].reverse()) {
    if (split.axis !== axis) continue;
    const other = before ? index - 1 : index + 1;
    if (other < 0 || other >= split.children.length) continue;
    const next = moveBoundary(split, index, other, grow ? RESIZE_STEP : -RESIZE_STEP);
    return next === null ? tab : { ...tab, root: replaceSplit(tab.root, next) };
  }
  return tab;
}

/** Zellij's `Resize "Increase|Decrease"`: every edge that can move does. */
export function resizePaneAll(tab: Tab, leafId: string, grow: boolean): Tab {
  return (["right", "down", "left", "up"] as const).reduce(
    (next, direction) => resizePane(next, leafId, direction, grow),
    tab,
  );
}

function swapLeaves(root: PaneNode, a: string, b: string): PaneNode {
  const leafA = findLeaf(root, a)!;
  const leafB = findLeaf(root, b)!;
  return mapNode(root, (node) =>
    isSplit(node) ? node : node.id === a ? leafB : node.id === b ? leafA : node,
  );
}

/** Zellij's MovePane: swaps the focused pane with its neighbor, or with the next or last pane. */
export function movePane(tab: Tab, leafId: string, to: Direction | 1 | -1): Tab {
  const other =
    typeof to === "number"
      ? cyclePane({ ...tab, focusedPaneId: leafId }, to)
      : neighbor(tab, leafId, to);
  if (other === null || other === leafId) return tab;
  return { ...tab, root: swapLeaves(tab.root, leafId, other) };
}

/** A tiling's shape without ids or sizes, e.g. `row(•,column(•,•))`. */
export function shapeOf(node: PaneNode): string {
  return isSplit(node) ? `${node.axis}(${node.children.map(shapeOf).join(",")})` : "•";
}

function evenSplit(axis: Axis, children: ReadonlyArray<PaneNode>): PaneNode {
  if (children.length === 1) return children[0]!;
  return {
    id: newId("split"),
    axis,
    children,
    sizes: children.map(() => 1 / children.length),
  };
}

/** Zellij's swap layouts: side by side, stacked, one main pane with a stack, and a grid. */
function swapLayouts(panes: ReadonlyArray<Leaf>): PaneNode[] {
  const [main, ...rest] = panes;
  const columns = Math.ceil(Math.sqrt(panes.length));
  const gridRows: PaneNode[] = [];
  for (let index = 0; index < panes.length; index += columns) {
    gridRows.push(evenSplit("row", panes.slice(index, index + columns)));
  }
  const candidates = [
    evenSplit("row", panes),
    evenSplit("column", panes),
    evenSplit("row", [main!, evenSplit("column", rest)]),
    evenSplit("column", gridRows),
  ].map(normalize);
  return candidates.filter(
    (node, index) => candidates.findIndex((other) => shapeOf(other) === shapeOf(node)) === index,
  );
}

/** Zellij's NextSwapLayout and PreviousSwapLayout, keeping the panes in order. */
export function swapLayout(tab: Tab, step: 1 | -1): Tab {
  if (!isSplit(tab.root)) return tab;
  const layouts = swapLayouts(leaves(tab.root));
  if (layouts.length < 2) return tab;
  const current = layouts.findIndex((node) => shapeOf(node) === shapeOf(tab.root));
  const next = current === -1 ? (step === 1 ? 0 : layouts.length - 1) : current + step;
  return { ...tab, root: layouts[(next + layouts.length) % layouts.length]!, fullscreen: false };
}

export function updateTab(layout: Layout, tabId: string, fn: (tab: Tab) => Tab): Layout {
  return { ...layout, tabs: layout.tabs.map((tab) => (tab.id === tabId ? fn(tab) : tab)) };
}

export function activateTab(layout: Layout, tabId: string): Layout {
  if (layout.activeTabId === tabId || !layout.tabs.some((tab) => tab.id === tabId)) return layout;
  return { ...layout, activeTabId: tabId, lastTabId: layout.activeTabId };
}

export function addTab(layout: Layout, tab: Tab, index = layout.tabs.length): Layout {
  const tabs = [...layout.tabs];
  tabs.splice(index, 0, tab);
  return activateTab({ ...layout, tabs }, tab.id);
}

export function closeTab(layout: Layout, tabId: string): Layout | null {
  const index = layout.tabs.findIndex((tab) => tab.id === tabId);
  if (index === -1) return layout;
  const tabs = layout.tabs.filter((tab) => tab.id !== tabId);
  if (tabs.length === 0) return null;
  if (layout.activeTabId !== tabId) {
    return { ...layout, tabs, lastTabId: layout.lastTabId === tabId ? null : layout.lastTabId };
  }
  const fallback = tabs.find((tab) => tab.id === layout.lastTabId) ?? tabs[Math.max(0, index - 1)]!;
  return { tabs, activeTabId: fallback.id, lastTabId: null };
}

export function stepTab(layout: Layout, step: 1 | -1): Layout {
  const index = layout.tabs.findIndex((tab) => tab.id === layout.activeTabId);
  const next = layout.tabs[(index + step + layout.tabs.length) % layout.tabs.length]!;
  return activateTab(layout, next.id);
}

/** Zellij's MoveTab: swaps the active tab with its neighbor, wrapping at the ends. */
export function moveTab(layout: Layout, step: 1 | -1): Layout {
  const index = layout.tabs.findIndex((tab) => tab.id === layout.activeTabId);
  const other = (index + step + layout.tabs.length) % layout.tabs.length;
  const tabs = [...layout.tabs];
  [tabs[index], tabs[other]] = [tabs[other]!, tabs[index]!];
  return { ...layout, tabs };
}

/**
 * Zellij's BreakPane (`to` = "new"), BreakPaneLeft and BreakPaneRight: the focused pane leaves its
 * tab for a new tab, or for the tab beside it. A tab left with no pane closes.
 */
export function breakPane(layout: Layout, to: "new" | "left" | "right"): Layout {
  const source = activeTab(layout);
  const leaf = findLeaf(source.root, source.focusedPaneId)!;
  const index = layout.tabs.indexOf(source);
  const destIndex = to === "left" ? index - 1 : to === "right" ? index + 1 : -1;
  const dest = layout.tabs[destIndex];
  if (to === "new" && !isSplit(source.root)) return layout;
  const remaining = closePane(source, leaf.id);
  let next: Layout =
    remaining === null
      ? { ...layout, tabs: layout.tabs.filter((tab) => tab.id !== source.id) }
      : updateTab(layout, source.id, () => remaining);
  if (dest === undefined) {
    return {
      ...addTab(next, createTab(leaf), to === "left" ? 0 : next.tabs.length),
      lastTabId: null,
    };
  }
  next = updateTab(next, dest.id, (tab) => {
    const direction = placeNewPane(tab, { width: 1, height: 1 });
    return splitPane(tab, direction.leafId, direction.direction, leaf);
  });
  return { ...next, activeTabId: dest.id, lastTabId: remaining === null ? null : source.id };
}

/** The pane that shows `key`; the active tab's pane wins. */
export function findTarget(layout: Layout, key: string): { tabId: string; leafId: string } | null {
  const ordered = [activeTab(layout), ...layout.tabs.filter((t) => t.id !== layout.activeTabId)];
  for (const tab of ordered) {
    const match = leaves(tab.root).find(
      (leaf) => leaf.target !== null && targetKey(leaf.target) === key,
    );
    if (match) return { tabId: tab.id, leafId: match.id };
  }
  return null;
}

/**
 * The route names the focused pane's thread. A route that names a thread another pane shows
 * focuses that pane; any other thread replaces the focused pane's.
 */
export function followRoute(layout: Layout, target: ThreadRouteTarget): Layout {
  const key = targetKey(target);
  const focused = focusedLeaf(layout);
  if (focused?.target && targetKey(focused.target) === key) return layout;
  const shown = findTarget(layout, key);
  if (shown !== null) {
    return updateTab(activateTab(layout, shown.tabId), shown.tabId, (tab) =>
      focusPane(tab, shown.leafId),
    );
  }
  const tab = activeTab(layout);
  return updateTab(layout, tab.id, (t) => ({
    ...t,
    root: mapNode(t.root, (node) =>
      !isSplit(node) && node.id === t.focusedPaneId ? { ...node, target } : node,
    ),
  }));
}

export interface TabGroup {
  readonly id: string;
  readonly name: string | null;
  readonly active: boolean;
  /** The tab's panes in reading order; `focused` marks the pane the keyboard is in. */
  readonly panes: ReadonlyArray<Leaf & { readonly focused: boolean }>;
}

/** The sidebar's view of the layout: each tab and the threads its panes show. */
export function tabGroups(layout: Layout): TabGroup[] {
  const active = activeTab(layout);
  return layout.tabs.map((tab) => ({
    id: tab.id,
    name: tab.name,
    active: tab.id === active.id,
    panes: leaves(tab.root).map((leaf) => ({
      ...leaf,
      focused: tab.id === active.id && leaf.id === tab.focusedPaneId,
    })),
  }));
}

const KEPT_TABS = 4;

/** The tabs to keep mounted: `active`, then the tabs shown before it, `KEPT_TABS` at most. */
export function keepRecent(
  recent: ReadonlyArray<string>,
  active: string,
  tabs: ReadonlyArray<Tab>,
): ReadonlyArray<string> {
  const next = [active, ...recent.filter((id) => id !== active)]
    .filter((id) => tabs.some((tab) => tab.id === id))
    .slice(0, KEPT_TABS);
  return next.length === recent.length && next.every((id, index) => id === recent[index])
    ? recent
    : next;
}

const isEmptyLeaf = (leaf: Leaf) => leaf.target === null;

/**
 * Shows `target` in tab `dest` (`"new"` opens a tab) and goes there: its pane moves, and a blank
 * pane of `dest` takes it before a split. A tab left with no pane closes.
 */
export function placeTarget(
  layout: Layout,
  target: ThreadRouteTarget,
  dest: string,
  grid: Size,
  isBlank: (leaf: Leaf) => boolean = isEmptyLeaf,
): Layout {
  const shown = findTarget(layout, targetKey(target));
  const source = shown === null ? null : layout.tabs.find((tab) => tab.id === shown.tabId)!;
  const alone = source !== null && !isSplit(source.root);
  if (shown !== null && (shown.tabId === dest || (dest === "new" && alone))) {
    return updateTab(activateTab(layout, shown.tabId), shown.tabId, (tab) => ({
      ...focusPane(tab, shown.leafId),
      fullscreen: false,
    }));
  }
  if (dest !== "new" && !layout.tabs.some((tab) => tab.id === dest)) return layout;
  let tabs = layout.tabs;
  if (shown !== null && source !== null) {
    const remaining = closePane(source, shown.leafId);
    tabs =
      remaining === null
        ? tabs.filter((tab) => tab.id !== source.id)
        : tabs.map((tab) => (tab.id === source.id ? remaining : tab));
  }
  let destId = dest;
  if (dest === "new") {
    const tab = createTab(createLeaf(target));
    tabs = [...tabs, tab];
    destId = tab.id;
  } else {
    tabs = tabs.map((tab) => {
      if (tab.id !== dest) return tab;
      const blank = leaves(tab.root).find(isBlank);
      if (blank === undefined) {
        const place = placeNewPane(tab, grid);
        return splitPane(tab, place.leafId, place.direction, createLeaf(target));
      }
      const root = mapNode(tab.root, (node) =>
        node.id === blank.id ? { ...blank, target } : node,
      );
      return { ...withFocus({ ...tab, root }, blank.id), fullscreen: false };
    });
  }
  const kept = (tabId: string | null) => tabId !== null && tabs.some((tab) => tab.id === tabId);
  const previous = layout.activeTabId === destId ? layout.lastTabId : layout.activeTabId;
  return { tabs, activeTabId: destId, lastTabId: kept(previous) ? previous : null };
}

/** Closes the pane that shows `key`. Its tab closes with its last pane; the last tab keeps one empty pane. */
export function removeTarget(layout: Layout, key: string): Layout {
  const shown = findTarget(layout, key);
  if (shown === null) return layout;
  const tab = layout.tabs.find((candidate) => candidate.id === shown.tabId)!;
  const remaining = closePane(tab, shown.leafId);
  if (remaining !== null) return updateTab(layout, tab.id, () => remaining);
  return (
    (layout.tabs.length > 1 ? closeTab(layout, tab.id) : null) ??
    mapLeaves(layout, (leaf) => (leaf.id === shown.leafId ? { ...leaf, target: null } : leaf))
  );
}

/** A thread shows in one pane: the focused pane keeps a repeated target, then the first pane. */
export function dedupeTargets(layout: Layout): Layout {
  const focused = focusedLeaf(layout);
  const seen = new Set(focused?.target ? [targetKey(focused.target)] : []);
  return mapLeaves(layout, (leaf) => {
    if (leaf.target === null || leaf.id === focused?.id) return leaf;
    const key = targetKey(leaf.target);
    if (!seen.has(key)) {
      seen.add(key);
      return leaf;
    }
    return { ...leaf, target: null };
  });
}

function isTarget(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value !== "object") return false;
  const target = value as ThreadRouteTarget;
  if (target.kind === "draft") return typeof target.draftId === "string";
  const ref = target.kind === "server" ? target.threadRef : null;
  return typeof ref?.environmentId === "string" && typeof ref.threadId === "string";
}

/** Keeps a stored layout only when its shape is sound. */
export function isLayout(value: unknown): value is Layout {
  if (typeof value !== "object" || value === null) return false;
  const layout = value as Layout;
  if (!Array.isArray(layout.tabs) || layout.tabs.length === 0) return false;
  const ids = new Set<string>();
  const isNew = (id: unknown): id is string => {
    if (typeof id !== "string" || ids.has(id)) return false;
    ids.add(id);
    return true;
  };
  const isNode = (node: unknown): boolean => {
    if (typeof node !== "object" || node === null || !isNew((node as Leaf).id)) return false;
    if (!("children" in node)) return isTarget((node as Leaf).target);
    const split = node as Split;
    return (
      Array.isArray(split.children) &&
      split.children.length >= 2 &&
      Array.isArray(split.sizes) &&
      split.sizes.length === split.children.length &&
      split.sizes.every((size) => Number.isFinite(size) && size > 0) &&
      split.children.every(isNode)
    );
  };
  return (
    layout.tabs.every(
      (tab) =>
        typeof tab === "object" &&
        tab !== null &&
        isNew(tab.id) &&
        isNode(tab.root) &&
        findLeaf(tab.root, tab.focusedPaneId) !== null,
    ) && layout.tabs.some((tab) => tab.id === layout.activeTabId)
  );
}
