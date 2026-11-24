import "~/index.css";

import { createMemoryHistory } from "@tanstack/react-router";
import { DEFAULT_CLIENT_SETTINGS } from "@t3tools/contracts/settings";
import type * as Context from "effect/Context";
import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

import { AppRoot } from "~/AppRoot";
import { useComposerDraftStore } from "~/composerDraftStore";
// The route loads ChatView lazily; importing it keeps its first transform out of the test.
import "~/components/ChatView";
import { __setClientSettingsForTests, updateClientSettings } from "~/hooks/useSettings";
import { getRouter } from "~/router";
import {
  ENVIRONMENT_ID,
  installFakeEnvironment,
  threadWithHistory,
  type FakeDriver,
  type FakeThread,
} from "../../test/fakeEnvironment";
import { act, render } from "../../test/render";
import { openInTab, removeFromTabs } from "./actions";
import { createLayout, leaves } from "./layout";
import { useZ3Store } from "./store";

// The socket is faked; see test/appScenarios.renders.tsx.
vi.mock("../../../../packages/client-runtime/src/connection/driver.ts", async (importOriginal) => {
  const [actual, { fakeDriver }, Layer] = await Promise.all([
    importOriginal<{ readonly ConnectionDriver: Context.Key<unknown, FakeDriver> }>(),
    import("../../test/fakeEnvironment"),
    import("effect/Layer"),
  ]);
  return { ...actual, layer: Layer.succeed(actual.ConnectionDriver, fakeDriver) };
});

// The fake environment does not serve project files, and a new draft waits for that read.
vi.mock(import("~/lib/t3ProjectFileDefaults"), () => ({
  readT3ProjectFile: () => Promise.resolve(null),
}));

function setup(threads: ReadonlyArray<FakeThread>) {
  useZ3Store.setState({
    layout: createLayout(null),
    routeKey: null,
    mode: "normal",
    focusRequest: null,
  });
  useComposerDraftStore.setState({
    draftsByThreadKey: {},
    draftThreadsByThreadKey: {},
    logicalProjectDraftThreadKeyByLogicalProjectKey: {},
    promotedDraftRedirects: {},
  });
  __setClientSettingsForTests({
    ...DEFAULT_CLIENT_SETTINGS,
    boringSidebarEnabled: true,
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  });
  return installFakeEnvironment(threads);
}

async function openThread(thread: FakeThread) {
  const router = getRouter(
    createMemoryHistory({ initialEntries: [`/${ENVIRONMENT_ID}/${thread.id}`] }),
  );
  await router.load();
  // AppRoot brings its own router.
  const screen = await render(<AppRoot router={router} />, { router: false });
  await expect.element(page.getByText(`Answer 0 for ${thread.id}.`)).toBeVisible();
  return { router, screen };
}

const pointer = (type: string, x: number, y: number) =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    isPrimary: true,
    button: 0,
    buttons: type === "pointerup" ? 0 : 1,
    clientX: x,
    clientY: y,
  });
const center = (element: Element) => {
  const box = element.getBoundingClientRect();
  return [box.x + box.width / 2, box.y + box.height / 2] as const;
};

/** Presses a sidebar row. The sidebar drops a press on a row that moved under 500 ms ago. */
function pressRow(row: HTMLElement, x: number, y: number) {
  using _later = vi.spyOn(performance, "now").mockReturnValue(Number.MAX_SAFE_INTEGER);
  row.dispatchEvent(pointer("pointerdown", x, y));
}

const cells = () => [...document.querySelectorAll<HTMLElement>("[data-z3-cell]")];

it("the sidebar lists each thread under its tab, a drag moves it, and a tab left stays mounted", async () => {
  const [first, second] = [threadWithHistory("z3-one", 1), threadWithHistory("z3-two", 1)];
  using _environment = setup([first, second]);
  await page.viewport(1600, 800);
  const { router, screen } = await openThread(first);
  await using _screen = screen;
  const groups = () => [...document.querySelectorAll<HTMLElement>("[data-z3-tab-group]")];
  const row = (thread: FakeThread) =>
    document.querySelector<HTMLElement>(`li[data-thread-item$="${thread.id}"]`);
  const groupOf = (thread: FakeThread) => row(thread)?.closest("[data-z3-tab-group]") ?? null;
  const tabs = () => useZ3Store.getState().layout.tabs;

  await vi.waitFor(() => expect(groupOf(first)).toBe(groups()[0]));
  expect(groups()).toHaveLength(1);
  await vi.waitFor(() => expect(row(second)).not.toBeNull());
  expect(groupOf(second)).toBeNull();

  // A new tab keeps the tab it leaves mounted, out of sight and without focus.
  await userEvent.keyboard("{Control>}t{/Control}n");
  await vi.waitFor(() => expect(groups()).toHaveLength(2));
  await vi.waitFor(() => expect(router.state.location.pathname).toContain("/draft/"));
  expect(cells()).toHaveLength(2);
  expect(cells()[0]!.closest("[inert]")).not.toBeNull();
  expect(document.querySelectorAll("[data-z3-cell][data-focused]")).toHaveLength(1);
  expect(cells()[1]!.hasAttribute("data-focused")).toBe(true);
  await expect.element(page.getByText("Answer 0 for z3-one.")).not.toBeVisible();
  expect(groups()[1]!.textContent).toContain("New thread");

  // Drag the untabbed thread onto tab 2: it takes the blank draft's pane.
  const from = center(row(second)!);
  await act(() => {
    pressRow(row(second)!, ...from);
    document.dispatchEvent(pointer("pointermove", from[0] + 20, from[1]));
  });
  const onto = center(groups()[1]!);
  await act(() => document.dispatchEvent(pointer("pointermove", ...onto)));
  await vi.waitFor(() => expect(groups()[1]!.hasAttribute("data-thread-context-over")).toBe(true));
  await act(() => document.dispatchEvent(pointer("pointerup", ...onto)));
  await vi.waitFor(() => expect(groupOf(second)).toBe(groups()[1]));
  expect(leaves(tabs()[1]!.root)).toHaveLength(1);
  await vi.waitFor(() => expect(router.state.location.pathname).toContain(second.id));
  await expect.element(page.getByText("Answer 0 for z3-two.")).toBeVisible();

  // A switch back shows the kept tab at once: same pane element, no second mount.
  const kept = cells()[0]!;
  await userEvent.keyboard("{Control>}t{/Control}1");
  await vi.waitFor(() => expect(router.state.location.pathname).toContain(first.id));
  expect(cells()[0]).toBe(kept);
  expect(kept.closest("[inert]")).toBeNull();
  await expect.element(page.getByText("Answer 0 for z3-one.")).toBeVisible();

  // Moving the last thread out of a tab closes the tab; the menu's "Remove from tab" closes the pane.
  const target = {
    kind: "server",
    threadRef: { environmentId: ENVIRONMENT_ID, threadId: second.id },
  } as const;
  await act(() => openInTab([target], tabs()[0]!.id));
  await vi.waitFor(() => expect(groups()).toHaveLength(1));
  expect(groupOf(second)).toBe(groups()[0]);
  expect(cells()).toHaveLength(2);
  await act(() => removeFromTabs([target]));
  await vi.waitFor(() => expect(groupOf(second)).toBeNull());
  expect(row(second)).not.toBeNull();
  expect(cells()).toHaveLength(1);
  await vi.waitFor(() => expect(router.state.location.pathname).toContain(first.id));

  // The stock card list reorders by drag; a drag onto a tab still moves the thread there.
  await act(() => updateClientSettings({ boringSidebarEnabled: false }));
  await vi.waitFor(() =>
    expect(row(second)!.querySelector('[data-testid="sidebar-row-card"]')).not.toBeNull(),
  );
  const card = center(row(second)!);
  await act(() => {
    pressRow(row(second)!, ...card);
    document.dispatchEvent(pointer("pointermove", card[0] + 20, card[1]));
  });
  const tab = center(groups()[0]!.firstElementChild!);
  await act(() => document.dispatchEvent(pointer("pointermove", ...tab)));
  await act(() => document.dispatchEvent(pointer("pointerup", ...tab)));
  await vi.waitFor(() => expect(groupOf(second)).toBe(groups()[0]));
  expect(cells()).toHaveLength(2);
});
