import { DraftId } from "../composerDraftStore";
import { describe, expect, it } from "vite-plus/test";

import {
  activateTab,
  addTab,
  breakPane,
  closePane,
  closeTab,
  createLayout,
  createLeaf,
  createTab,
  dedupeTargets,
  findTarget,
  focusedLeaf,
  followRoute,
  isLayout,
  isSplit,
  keepRecent,
  leaves,
  moveTab,
  movePane,
  neighbor,
  placeNewPane,
  placeTarget,
  rects,
  removeTarget,
  nudgeBorder,
  splitPane,
  shapeOf,
  stepTab,
  swapLayout,
  tabGroups,
  targetKey,
  updateTab,
  type Layout,
  type PaneNode,
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

describe("closeTab", () => {
  it("forgets a closed background tab as the last tab", () => {
    const one = createLayout(draft("a"));
    const two = addTab(one, createTab(createLeaf(draft("b"))));
    const back = activateTab(two, one.tabs[0]!.id);
    expect(back.lastTabId).toBe(two.activeTabId);
    expect(closeTab(back, two.activeTabId)!.lastTabId).toBeNull();
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

describe("nudgeBorder", () => {
  it("moves the pane's border with the key, so opposite keys undo each other", () => {
    const { tab, left, top } = threePanes();
    const right = nudgeBorder(tab, left, "right");
    expect(rects(right.root).get(left)!.width).toBeCloseTo(0.55);
    expect(rects(nudgeBorder(right, left, "left").root).get(left)!.width).toBeCloseTo(0.5);
    // The rightmost pane has only a left border, so "right" shrinks it.
    expect(rects(nudgeBorder(tab, top, "right").root).get(top)!.width).toBeCloseTo(0.45);
    expect(nudgeBorder(createTab(createLeaf(null)), "missing", "up").root).toBeDefined();
    let squeezed = tab;
    for (let i = 0; i < 20; i += 1) squeezed = nudgeBorder(squeezed, top, "right");
    expect(rects(squeezed.root).get(top)!.width).toBeCloseTo(0.1);
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

describe("isLayout", () => {
  it("rejects repeated ids, bad sizes and targets that are not thread routes", () => {
    const { tab } = threePanes();
    const layout: Layout = { tabs: [tab], activeTabId: tab.id, lastTabId: null };
    const stored = JSON.parse(JSON.stringify(layout)) as Layout;
    expect(isLayout(stored)).toBe(true);
    const root = stored.tabs[0]!.root as Extract<PaneNode, { children: unknown }>;
    const withRoot = (next: unknown) => ({ ...stored, tabs: [{ ...stored.tabs[0]!, root: next }] });
    expect(isLayout(withRoot({ ...root, sizes: [0.5, Number.NaN] }))).toBe(false);
    expect(isLayout(withRoot({ ...root, sizes: [1, 0] }))).toBe(false);
    expect(isLayout(withRoot({ ...root, children: [root.children[0], root.children[0]] }))).toBe(
      false,
    );
    const first = root.children[0]!;
    for (const target of [{ kind: "server" }, { kind: "draft" }, "thread", undefined]) {
      expect(
        isLayout(withRoot({ ...root, children: [{ ...first, target }, root.children[1]] })),
      ).toBe(false);
    }
    expect(isLayout({ ...stored, tabs: [stored.tabs[0], stored.tabs[0]] })).toBe(false);
    expect(isLayout({ ...stored, tabs: [null] })).toBe(false);
  });
});

const GRID = { width: 1600, height: 900 };
const targets = (tab: Tab) => leaves(tab.root).map((leaf) => leaf.target);

describe("placeTarget", () => {
  it("moves a shown thread to the tab, and closes the tab it leaves empty", () => {
    const { tab, top } = threePanes();
    const solo = createTab(createLeaf(draft("solo")));
    const layout: Layout = { tabs: [tab, solo], activeTabId: tab.id, lastTabId: solo.id };

    const moved = placeTarget(layout, draft("t"), solo.id, GRID);
    expect(targets(moved.tabs[0]!)).toEqual([draft("l"), draft("b")]);
    expect(targets(moved.tabs[1]!)).toEqual([draft("solo"), draft("t")]);
    expect(moved.tabs[0]!.root).not.toHaveProperty("id", top);
    expect([moved.activeTabId, moved.lastTabId]).toEqual([solo.id, tab.id]);
    expect(focusedLeaf(moved)!.target).toEqual(draft("t"));

    const emptied = placeTarget(layout, draft("solo"), tab.id, GRID);
    expect(emptied.tabs.map((t) => t.id)).toEqual([tab.id]);
    expect(leaves(emptied.tabs[0]!.root)).toHaveLength(4);
    expect(emptied.lastTabId).toBeNull();
  });

  it("opens an unshown thread in a blank pane first, else in a new pane", () => {
    const blank = createLeaf(null);
    const one = createTab(createLeaf(draft("a")));
    const two = splitPane(one, one.focusedPaneId, "right", blank);
    const layout: Layout = { tabs: [two], activeTabId: two.id, lastTabId: null };
    const filled = placeTarget(layout, draft("x"), two.id, GRID);
    expect(targets(filled.tabs[0]!)).toEqual([draft("a"), draft("x")]);
    expect(filled.tabs[0]!.focusedPaneId).toBe(blank.id);
    const split = placeTarget(filled, draft("y"), two.id, GRID);
    expect(targets(split.tabs[0]!)).toHaveLength(3);
    // A draft that holds nothing is blank to the caller.
    const taken = placeTarget(filled, draft("z"), two.id, GRID, (leaf) =>
      leaf.target === null ? true : targetKey(leaf.target) === "draft:a",
    );
    expect(targets(taken.tabs[0]!)).toEqual([draft("z"), draft("x")]);
  });

  it("only focuses the pane when the thread is in the tab, or alone and sent to a new tab", () => {
    const { tab, left } = threePanes();
    const solo = createTab(createLeaf(draft("solo")));
    const layout: Layout = {
      tabs: [{ ...tab, fullscreen: true }, solo],
      activeTabId: solo.id,
      lastTabId: null,
    };
    const same = placeTarget(layout, draft("l"), tab.id, GRID);
    expect(same.tabs[0]!).toMatchObject({ focusedPaneId: left, fullscreen: false });
    expect(shapeOf(same.tabs[0]!.root)).toBe(shapeOf(tab.root));
    expect(same.activeTabId).toBe(tab.id);
    expect(placeTarget(layout, draft("solo"), "new", GRID)).toEqual(layout);
    const out = placeTarget(layout, draft("l"), "new", GRID);
    expect(out.tabs).toHaveLength(3);
    expect(targets(out.tabs[2]!)).toEqual([draft("l")]);
    expect(placeTarget(layout, draft("l"), "gone", GRID)).toBe(layout);
  });
});

describe("removeTarget", () => {
  it("closes the pane, then the tab, and leaves the last tab one empty pane", () => {
    const { tab } = threePanes();
    const solo = createTab(createLeaf(draft("solo")));
    const layout: Layout = { tabs: [tab, solo], activeTabId: solo.id, lastTabId: tab.id };
    expect(removeTarget(layout, "draft:none")).toBe(layout);
    const fewer = removeTarget(layout, "draft:t");
    expect(targets(fewer.tabs[0]!)).toEqual([draft("l"), draft("b")]);
    const closed = removeTarget(fewer, "draft:solo");
    expect(closed.tabs.map((t) => t.id)).toEqual([tab.id]);
    expect(closed.activeTabId).toBe(tab.id);
    const last = removeTarget(removeTarget(closed, "draft:l"), "draft:b");
    expect(last.tabs).toHaveLength(1);
    expect(targets(last.tabs[0]!)).toEqual([null]);
    expect(isLayout(last)).toBe(true);
  });
});

describe("dedupeTargets", () => {
  it("keeps a repeated thread in the focused pane, else in the first pane", () => {
    const a = createLeaf(draft("same"));
    const b = createLeaf(draft("same"));
    const tab = splitPane(createTab(a), a.id, "right", b);
    const other = createTab(createLeaf(draft("same")));
    const layout: Layout = { tabs: [tab, other], activeTabId: tab.id, lastTabId: null };
    const focusedKept = dedupeTargets(layout);
    expect(targets(focusedKept.tabs[0]!)).toEqual([null, draft("same")]);
    expect(targets(focusedKept.tabs[1]!)).toEqual([null]);
    const firstKept = dedupeTargets({ ...layout, tabs: [tab, other], activeTabId: other.id });
    expect(targets(firstKept.tabs[1]!)).toEqual([draft("same")]);
    const clean = createLayout(draft("one"));
    expect(dedupeTargets(clean)).toBe(clean);
  });
});

describe("keepRecent", () => {
  it("keeps the active tab and the last three shown, and drops closed tabs", () => {
    const tabs = ["a", "b", "c", "d", "e"].map((id) => ({ ...createTab(createLeaf(null)), id }));
    const recent = ["a", "b", "c", "d"];
    expect(keepRecent(recent, "a", tabs)).toBe(recent);
    expect(keepRecent(recent, "e", tabs)).toEqual(["e", "a", "b", "c"]);
    expect(keepRecent(recent, "c", tabs.slice(2))).toEqual(["c", "d"]);
  });
});

describe("tabGroups", () => {
  it("lists each tab's panes in reading order and marks the one focused pane", () => {
    const { tab, bottom } = threePanes();
    const other = createTab(createLeaf(null));
    const groups = tabGroups({ tabs: [tab, other], activeTabId: tab.id, lastTabId: null });
    expect(groups.map((group) => group.active)).toEqual([true, false]);
    expect(groups[0]!.panes.map((pane) => pane.target)).toEqual([
      draft("l"),
      draft("t"),
      draft("b"),
    ]);
    expect(groups.flatMap((group) => group.panes.filter((pane) => pane.focused))).toEqual([
      expect.objectContaining({ id: bottom }),
    ]);
  });
});

/** Every state a stored or live layout must hold, whatever the keys and drags that led to it. */
function expectSound(layout: Layout) {
  expect(isLayout(JSON.parse(JSON.stringify(layout)))).toBe(true);
  const keys = layout.tabs.flatMap((tab) =>
    leaves(tab.root).flatMap((leaf) => (leaf.target ? [targetKey(leaf.target)] : [])),
  );
  expect(new Set(keys).size).toBe(keys.length);
  const tabIds = layout.tabs.map((tab) => tab.id);
  expect(layout.lastTabId === null || tabIds.includes(layout.lastTabId)).toBe(true);
  for (const tab of layout.tabs) {
    const ids = leaves(tab.root).map((leaf) => leaf.id);
    expect(tab.lastPaneId === null || ids.includes(tab.lastPaneId)).toBe(true);
    expect(tab.fullscreen && !isSplit(tab.root)).toBe(false);
    const area = [...rects(tab.root).values()].reduce((sum, r) => sum + r.width * r.height, 0);
    expect(area).toBeCloseTo(1);
  }
}

describe("layout operations", () => {
  it("keep every layout sound over 4000 random keys, drags and route changes", () => {
    let seed = 20261124;
    const random = (n: number) => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed % n;
    };
    const thread = () => draft(`t${random(9)}`);
    const direction = () => (["left", "right", "up", "down"] as const)[random(4)]!;
    let layout = createLayout(null);
    for (let step = 0; step < 4000; step += 1) {
      const tab = layout.tabs.find((candidate) => candidate.id === layout.activeTabId)!;
      const inTab = (fn: (tab: Tab) => Tab) => updateTab(layout, tab.id, fn);
      const dest = random(4) === 0 ? "new" : layout.tabs[random(layout.tabs.length)]!.id;
      const before = layout;
      const op = random(13);
      switch (op) {
        case 0:
          layout = inTab((t) =>
            splitPane(t, t.focusedPaneId, random(2) ? "right" : "down", createLeaf(null)),
          );
          break;
        case 1:
          layout = inTab((t) => closePane(t, t.focusedPaneId) ?? t);
          break;
        case 2:
          layout = placeTarget(layout, thread(), dest, GRID);
          break;
        case 3:
          layout = removeTarget(layout, targetKey(thread()));
          break;
        case 4:
          layout = followRoute(layout, thread());
          break;
        case 5:
          layout = breakPane(layout, (["new", "left", "right"] as const)[random(3)]!);
          break;
        case 6:
          layout = closeTab(layout, tab.id) ?? layout;
          break;
        case 7:
          layout = addTab(layout, createTab(createLeaf(null)));
          break;
        case 8:
          layout = inTab((t) => swapLayout(t, random(2) ? 1 : -1));
          break;
        case 9:
          layout = inTab((t) =>
            movePane(nudgeBorder(t, t.focusedPaneId, direction()), t.focusedPaneId, direction()),
          );
          break;
        case 10:
          layout = moveTab(stepTab(layout, random(2) ? 1 : -1), random(2) ? 1 : -1);
          break;
        case 11:
          layout = inTab((t) => ({ ...t, fullscreen: isSplit(t.root) && !t.fullscreen }));
          break;
        case 12: {
          const to = neighbor(tab, tab.focusedPaneId, direction());
          layout =
            to === null
              ? layout
              : inTab((t) => ({ ...t, focusedPaneId: to, lastPaneId: t.focusedPaneId }));
          break;
        }
      }
      try {
        expectSound(layout);
      } catch (error) {
        throw new Error(`step ${step}, operation ${op} broke ${JSON.stringify(before)}`, {
          cause: error,
        });
      }
      // A placed thread is where the sidebar will show it.
      for (const key of ["draft:t0", "draft:t5"]) {
        const shown = findTarget(layout, key);
        if (shown === null) continue;
        expect(
          tabGroups(layout)
            .find((group) => group.id === shown.tabId)!
            .panes.map((p) => p.id),
        ).toContain(shown.leafId);
      }
    }
  });
});

describe("swapLayout", () => {
  it("cycles distinct tilings, keeps the panes, and turns side by side into stacked", () => {
    const { tab } = threePanes();
    const ids = leaves(tab.root).map((leaf) => leaf.id);
    const seen = new Set<string>();
    let next = tab;
    for (let i = 0; i < 4; i += 1) {
      next = swapLayout(next, 1);
      seen.add(shapeOf(next.root));
      expect(leaves(next.root).map((leaf) => leaf.id)).toEqual(ids);
    }
    expect(seen).toEqual(
      new Set(["row(•,•,•)", "column(•,•,•)", "row(•,column(•,•))", "column(row(•,•),•)"]),
    );
    const pair = createTab(createLeaf(null));
    const sideBySide = splitPane(pair, pair.focusedPaneId, "right", createLeaf(null));
    expect(shapeOf(swapLayout(sideBySide, 1).root)).toBe("column(•,•)");
    expect(shapeOf(swapLayout(swapLayout(sideBySide, 1), 1).root)).toBe("row(•,•)");
    expect(swapLayout(pair, 1)).toBe(pair);
  });
});
