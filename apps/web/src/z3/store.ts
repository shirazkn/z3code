import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  composerDraftHasUserContent,
  type DraftId,
  useComposerDraftStore,
} from "../composerDraftStore";
import type { Mode } from "./keymap";
import {
  createLayout,
  dedupeTargets,
  isLayout,
  isMulti,
  leaves,
  mapLeaves,
  type Layout,
} from "./layout";

interface Z3State {
  readonly layout: Layout;
  /** Key of the route target the layout last followed; null until the first thread route. */
  readonly routeKey: string | null;
  readonly mode: Mode;
  /** A key moved focus here; the pane host focuses its composer once it mounts. */
  readonly focusRequest: string | null;
}

export const useZ3Store = create<Z3State>()(
  persist(
    (): Z3State => ({
      layout: createLayout(null),
      routeKey: null,
      mode: "normal",
      focusRequest: null,
    }),
    {
      name: "z3code:layout:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ layout: state.layout }),
      merge: (persisted, current) => {
        const layout = (persisted as { layout?: unknown } | undefined)?.layout;
        if (isLayout(layout)) return { ...current, layout: dedupeTargets(layout) };
        if (layout !== undefined) console.warn("[z3] stored layout is unsound; starting fresh");
        return current;
      },
    },
  ),
);

export const setMode = (mode: Mode) => useZ3Store.setState({ mode });

const PANE_DRAFT_KEY = "z3-pane:";

function shownDraftIds(layout: Layout): Set<DraftId> {
  return new Set(
    layout.tabs.flatMap((tab) =>
      leaves(tab.root).flatMap((leaf) =>
        leaf.target?.kind === "draft" ? [leaf.target.draftId] : [],
      ),
    ),
  );
}

/**
 * Stock reuses one draft per project, so with 2+ panes each shown draft gets a key of its own.
 * An unshown, empty pane-keyed draft is dropped.
 */
function syncPaneDrafts(layout: Layout): void {
  const drafts = useComposerDraftStore.getState();
  const shown = shownDraftIds(layout);
  const keyed = drafts.logicalProjectDraftThreadKeyByLogicalProjectKey;
  for (const [key, draftId] of Object.entries(keyed)) {
    if (!key.startsWith(PANE_DRAFT_KEY) || shown.has(draftId as DraftId)) continue;
    const session = drafts.getDraftSession(draftId as DraftId);
    const empty = !composerDraftHasUserContent(drafts.getComposerDraft(draftId as DraftId));
    if (empty && session?.promotedTo == null) drafts.clearDraftThread(draftId as DraftId);
  }
  if (!isMulti(layout)) return;
  const owned = new Set(
    Object.entries(keyed).flatMap(([k, id]) => (k.startsWith(PANE_DRAFT_KEY) ? [id] : [])),
  );
  for (const draftId of shown) {
    const session = drafts.getDraftSession(draftId);
    if (session === null || owned.has(draftId) || session.promotedTo != null) continue;
    drafts.setLogicalProjectDraftThreadId(
      `${PANE_DRAFT_KEY}${draftId}`,
      scopeProjectRef(session.environmentId, session.projectId),
      draftId,
      {
        threadId: session.threadId,
        createdAt: session.createdAt,
        runtimeMode: session.runtimeMode,
        interactionMode: session.interactionMode,
      },
    );
  }
}

// A sent draft becomes a server thread. Only the focused pane follows the route there, so every
// pane showing the draft is retargeted here.
useComposerDraftStore.subscribe((state, previous) => {
  if (state.promotedDraftRedirects === previous.promotedDraftRedirects) return;
  const { layout } = useZ3Store.getState();
  const next = mapLeaves(layout, (leaf) => {
    const threadRef =
      leaf.target?.kind === "draft" ? state.promotedDraftRedirects[leaf.target.draftId] : undefined;
    return threadRef === undefined ? leaf : { ...leaf, target: { kind: "server", threadRef } };
  });
  if (next !== layout) useZ3Store.setState({ layout: next });
});

useZ3Store.subscribe((state, previous) => {
  if (state.layout !== previous.layout) syncPaneDrafts(state.layout);
  // A mode dims everything but the focused pane (z3.css); the lock is not a mode here.
  if (state.mode !== previous.mode) {
    const active = state.mode !== "normal" && state.mode !== "locked";
    document.documentElement.toggleAttribute("data-z3-mode", active);
  }
});
