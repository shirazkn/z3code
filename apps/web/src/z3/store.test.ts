import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { expect, it, vi } from "vite-plus/test";

import { DraftId, useComposerDraftStore } from "../composerDraftStore";
import { createLayout, createLeaf, leaves, splitPane } from "./layout";
import { useZ3Store } from "./store";

// The stores persist to localStorage, which they read when their modules load.
vi.hoisted(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
});

it("moves every pane that shows a sent draft to its new thread, focused or not", () => {
  const draftId = DraftId.make("draft-sent");
  const layout = createLayout(null);
  const tab = layout.tabs[0]!;
  const sent = createLeaf({ kind: "draft", draftId });
  // The draft's pane is not the focused one, so no route follows it.
  const split = splitPane(tab, tab.focusedPaneId, "right", sent);
  useZ3Store.setState({
    layout: { ...layout, tabs: [{ ...split, focusedPaneId: tab.focusedPaneId }] },
  });

  const threadRef = scopeThreadRef(EnvironmentId.make("env"), ThreadId.make("thread-sent"));
  useComposerDraftStore.setState({ promotedDraftRedirects: { [draftId]: threadRef } });

  const shown = leaves(useZ3Store.getState().layout.tabs[0]!.root).map((leaf) => leaf.target);
  expect(shown).toEqual([null, { kind: "server", threadRef }]);
});
