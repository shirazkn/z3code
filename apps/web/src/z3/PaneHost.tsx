import { Navigate, useLocation, useRouter } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, type ReactNode } from "react";

import { ThreadRouteView } from "../components/ThreadRouteView";
import { SidebarInset } from "../components/ui/sidebar";
import { ComposerHandleContext, useComposerHandleContext } from "../composerHandleContext";
import type { ThreadRouteTarget } from "../threadRoutes";
import { focusPaneById, locationOf, registerHost } from "./actions";
import "./keys";
import {
  activeTab,
  focusedLeaf,
  followRoute,
  leaves,
  type Leaf,
  type Rect,
  rects,
  targetKey,
} from "./layout";
import { useZ3Store } from "./store";
import { OpenThreadMarks, TabStrip, tabStripVisible } from "./TabStrip";
import "./z3.css";

const FULL: Rect = { left: 0, top: 0, width: 1, height: 1 };
const pct = (fraction: number) => `${fraction * 100}%`;

/** Takes the place of the one stock thread view: one view per pane of the active tab. */
export function PaneHost({
  target,
  background,
}: {
  target: ThreadRouteTarget;
  background: boolean;
}) {
  const router = useRouter();
  const composer = useComposerHandleContext();
  const stored = useZ3Store((state) => state.layout);
  const routeKey = useZ3Store((state) => state.routeKey);
  const mode = useZ3Store((state) => state.mode);
  const key = targetKey(target);
  // Derived in render, so the route's thread shows in its pane on the first frame.
  const layout = key === routeKey ? stored : followRoute(stored, target);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- commits the route's placement to the pane store
  useLayoutEffect(() => {
    if (key !== routeKey) useZ3Store.setState({ layout, routeKey: key });
  }, [key, layout, routeKey]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- pane keys act only while the thread view shows
  useEffect(() => {
    if (background) return;
    registerHost(router);
    return () => registerHost(null);
  }, [background, router]);

  const tab = activeTab(layout);
  const focusedId = tab.focusedPaneId;
  const focusedReady = focusedLeaf(layout)?.target != null;
  const focusRequest = useZ3Store((state) => state.focusRequest);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- moves DOM focus into the pane a key focused, once its composer mounts
  useEffect(() => {
    if (focusRequest !== focusedId || !focusedReady) return;
    useZ3Store.setState({ focusRequest: null });
    composer?.current?.focusAtEnd();
  }, [composer, focusRequest, focusedId, focusedReady]);

  const cells = leaves(tab.root);
  const all = rects(tab.root);
  const multi = cells.length > 1;
  // Without the tab strip, the top-left pane's header sits under the window controls.
  const stripShown = tabStripVisible(layout, mode);
  return (
    <SidebarInset
      className="h-svh min-h-0 overflow-hidden overscroll-y-none md:h-dvh"
      inert={background}
      data-z3-host
      data-z3-split={multi || undefined}
      data-z3-strip={stripShown || undefined}
    >
      <OpenThreadMarks layout={layout} />
      <TabStrip layout={layout} />
      <div data-z3-grid className="relative min-h-0 flex-1">
        {cells.map((leaf) => {
          const focused = leaf.id === focusedId;
          const rect = all.get(leaf.id)!;
          return (
            <PaneCell
              key={leaf.id}
              leaf={leaf}
              rect={tab.fullscreen && focused ? FULL : rect}
              corner={!stripShown && rect.left === 0 && rect.top === 0}
              focused={focused}
              multi={multi}
              hidden={tab.fullscreen && !focused}
              background={background}
            />
          );
        })}
      </div>
    </SidebarInset>
  );
}

function PaneCell({
  leaf,
  rect,
  focused,
  multi,
  hidden,
  background,
  corner,
}: {
  leaf: Leaf;
  rect: Rect;
  corner: boolean;
  focused: boolean;
  multi: boolean;
  hidden: boolean;
  background: boolean;
}) {
  const composer = useComposerHandleContext();
  const claim = focused ? undefined : () => focusPaneById(leaf.id);
  return (
    <div
      data-z3-cell={leaf.id}
      data-focused={focused || undefined}
      data-multi={multi || undefined}
      data-z3-corner={corner || undefined}
      data-z3-inner-left={(!hidden && rect.left > 0) || undefined}
      data-z3-inner-top={(!hidden && rect.top > 0) || undefined}
      hidden={hidden}
      className="absolute flex min-h-0 min-w-0 flex-col overflow-hidden"
      style={{
        left: pct(rect.left),
        top: pct(rect.top),
        width: pct(rect.width),
        height: pct(rect.height),
      }}
      onPointerDownCapture={claim}
      onFocusCapture={claim}
    >
      {/* Only the focused pane's composer answers the app-wide composer handle. */}
      <ComposerHandleContext value={focused ? composer : null}>
        {leaf.target ? (
          <ThreadRouteView target={leaf.target} background={background} passive={!focused} />
        ) : (
          <div className="m-auto text-muted-foreground text-xs">New pane</div>
        )}
      </ComposerHandleContext>
    </div>
  );
}

/** At launch, home reopens the focused pane's thread instead of starting a draft over it. */
export function Z3Home({ children }: { children: ReactNode }) {
  const atHome = useLocation({ select: (location) => location.pathname === "/" });
  const routeKey = useZ3Store((state) => state.routeKey);
  const target = useZ3Store((state) => focusedLeaf(state.layout)?.target ?? null);
  if (atHome && routeKey === null && target !== null) {
    const location = locationOf(target);
    return <Navigate to={location.to as never} params={location.params as never} replace />;
  }
  return children;
}
