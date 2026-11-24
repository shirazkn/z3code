import { DraftId } from "../composerDraftStore";
import { describe, expect, it } from "vite-plus/test";

import {
  breakPane,
  closePane,
  createLayout,
  createLeaf,
  createTab,
  followRoute,
  isLayout,
  leaves,
  movePane,
  neighbor,
  placeNewPane,
  rects,
  resizePane,
  splitPane,
  type Layout,
  type Tab,
} from "./layout";

const draft = (id: string) => ({ kind: "draft" as const, draftId: DraftId.make(id) });

/** L | (T over B): returns the tab and the three pane ids. */
function threePanes() {
  const left = createLeaf(draft("l"));
  const top = createLeaf(draft("t"));
  const bottom = createLeaf(draft("b"));
  let tab = createTab(left);
  tab = splitPane(tab, left.id, "right", top);
  tab = splitPane(tab, top.id, "down", bottom);
  return { tab, left: left.id, top: top.id, bottom: bottom.id };
}

describe("splitPane", () => {
  it("nests the cross axis and flattens the same axis", () => {
    const { tab, left, top, bottom } = threePanes();
    const r = rects(tab.root);
    expect(r.get(left)).toEqual({ left: 0, top: 0, width: 0.5, height: 1 });
    expect(r.get(top)).toEqual({ left: 0.5, top: 0, width: 0.5, height: 0.5 });
    expect(r.get(bottom)).toEqual({ left: 0.5, top: 0.5, width: 0.5, height: 0.5 });
    const third = createLeaf(null);
    const flat = splitPane(tab, left, "right", third).root;
    expect("children" in flat && flat.children.length).toBe(3);
    expect(tab.focusedPaneId).toBe(bottom);
  });
});

describe("placeNewPane", () => {
  it("splits the largest pane, down when it is taller than wide", () => {
    const { tab, left } = threePanes();
    expect(placeNewPane(tab, { width: 1600, height: 900 })).toEqual({
      leafId: left,
      direction: "down",
    });
    const single = createTab(createLeaf(null));
    expect(placeNewPane(single, { width: 1600, height: 900 }).direction).toBe("right");
  });
});

describe("closePane", () => {
  it("collapses the split and returns focus to the last focused pane", () => {
    const { tab, left, top, bottom } = threePanes();
    const focusedTop: Tab = { ...tab, focusedPaneId: bottom, lastPaneId: top };
    const closed = closePane(focusedTop, bottom)!;
    expect(leaves(closed.root).map((l) => l.id)).toEqual([left, top]);
    expect(rects(closed.root).get(top)).toEqual({ left: 0.5, top: 0, width: 0.5, height: 1 });
    expect(closed.focusedPaneId).toBe(top);
    expect(closePane(createTab(createLeaf(null)), "missing")).not.toBeNull();
  });
});

describe("neighbor", () => {
  it("finds adjacent panes and prefers the last focused one on a shared edge", () => {
    const { tab, left, top, bottom } = threePanes();
    expect(neighbor(tab, bottom, "left")).toBe(left);
    expect(neighbor(tab, bottom, "up")).toBe(top);
    expect(neighbor(tab, top, "up")).toBeNull();
    expect(neighbor({ ...tab, lastPaneId: bottom }, left, "right")).toBe(bottom);
    expect(neighbor({ ...tab, lastPaneId: top }, left, "right")).toBe(top);
  });
});

describe("resizePane", () => {
  it("moves the edge on the named side, and stops at the edge and the minimum", () => {
    const { tab, top } = threePanes();
    const grown = resizePane(tab, top, "left", true);
    expect(rects(grown.root).get(top)!.width).toBeCloseTo(0.55);
    expect(resizePane(tab, top, "right", true)).toBe(tab);
    let shrunk = tab;
    for (let i = 0; i < 20; i += 1) shrunk = resizePane(shrunk, top, "left", false);
    expect(rects(shrunk.root).get(top)!.width).toBeCloseTo(0.1);
  });
});

describe("movePane", () => {
  it("swaps the pane with its neighbor and keeps its id", () => {
    const { tab, left, bottom } = threePanes();
    const moved = movePane(tab, bottom, "left");
    expect(rects(moved.root).get(bottom)).toEqual({ left: 0, top: 0, width: 0.5, height: 1 });
    expect(rects(moved.root).get(left)!.left).toBe(0.5);
  });
});

describe("breakPane", () => {
  it("moves the focused pane to a new tab, or into the tab beside it", () => {
    const { tab, bottom } = threePanes();
    const layout: Layout = { tabs: [tab], activeTabId: tab.id, lastTabId: null };
    const broken = breakPane(layout, "new");
    expect(broken.tabs).toHaveLength(2);
    expect(leaves(broken.tabs[1]!.root).map((l) => l.id)).toEqual([bottom]);
    expect(broken.activeTabId).toBe(broken.tabs[1]!.id);
    const back = breakPane(broken, "left");
    expect(back.tabs).toHaveLength(1);
    expect(leaves(back.tabs[0]!.root)).toHaveLength(3);
    const single = createLayout(null);
    expect(breakPane(single, "new")).toBe(single);
  });
});

describe("followRoute", () => {
  it("focuses the pane that shows the route's thread, or puts the thread in the focused pane", () => {
    const { tab, left } = threePanes();
    const other = createTab(createLeaf(draft("o")));
    const layout: Layout = { tabs: [tab, other], activeTabId: other.id, lastTabId: null };
    const shown = followRoute(layout, draft("l"));
    expect(shown.activeTabId).toBe(tab.id);
    expect(shown.tabs[0]!.focusedPaneId).toBe(left);
    const replaced = followRoute(layout, draft("new"));
    expect(leaves(replaced.tabs[1]!.root)[0]!.target).toEqual(draft("new"));
  });
});

describe("isLayout", () => {
  it("rejects a stored layout whose focus or splits are broken", () => {
    const layout = createLayout(null);
    expect(isLayout(layout)).toBe(true);
    expect(isLayout({ ...layout, activeTabId: "gone" })).toBe(false);
    expect(isLayout({ ...layout, tabs: [{ ...layout.tabs[0]!, focusedPaneId: "gone" }] })).toBe(
      false,
    );
    expect(isLayout(null)).toBe(false);
  });
});
