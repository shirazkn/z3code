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
import { __setClientSettingsForTests } from "~/hooks/useSettings";
import { getRouter } from "~/router";
import {
  ENVIRONMENT_ID,
  installFakeEnvironment,
  threadWithHistory,
  type FakeDriver,
  type FakeThread,
} from "../../test/fakeEnvironment";
import { render } from "../../test/render";
import { activeTab, createLayout, leaves } from "./layout";
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

function setup(threads: ReadonlyArray<FakeThread>, boringSidebarEnabled = false) {
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
    boringSidebarEnabled,
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

const cells = () => [...document.querySelectorAll<HTMLElement>("[data-z3-cell]")];
const focusedIndex = () => cells().findIndex((cell) => cell.hasAttribute("data-focused"));
const composers = () => [
  ...document.querySelectorAll<HTMLElement>('[data-testid="composer-editor"]'),
];
const mode = () => useZ3Store.getState().mode;
const spotlit = () => document.documentElement.hasAttribute("data-z3-mode");
const press = (keys: string) => userEvent.keyboard(keys);

it("pane mode splits, moves focus with the route, swallows other keys, and closes", async () => {
  const thread = threadWithHistory("z3-panes", 1);
  using _environment = setup([thread]);
  await page.viewport(1600, 800);
  const { router, screen } = await openThread(thread);
  await using _screen = screen;
  const threadPath = router.state.location.pathname;
  const firstComposer = composers()[0]!;

  await press("{Control>}p{/Control}");
  expect(mode()).toBe("pane");
  expect(spotlit()).toBe(true);
  await press("z");
  expect(firstComposer.textContent).toBe("");

  await press("c");
  expect(mode()).toBe("normal");
  expect(spotlit()).toBe(false);
  await vi.waitFor(() => expect(composers()).toHaveLength(2));
  expect(focusedIndex()).toBe(1);
  expect(cells()[0]!.contains(firstComposer)).toBe(true);
  await vi.waitFor(() => expect(router.state.location.pathname).toContain("/draft/"));
  const draftPath = router.state.location.pathname;
  const [left, right] = cells().map((cell) => cell.getBoundingClientRect());
  expect(right!.left).toBeCloseTo(left!.right, 0);
  expect(right!.width).toBeCloseTo(left!.width, 0);

  // As in Zellij, a focus move keeps pane mode.
  await press("{Control>}p{/Control}h");
  await vi.waitFor(() => expect(router.state.location.pathname).toBe(threadPath));
  expect(focusedIndex()).toBe(0);
  expect(mode()).toBe("pane");
  await press("{Escape}");
  expect(mode()).toBe("normal");
  await press("{Control>}{ArrowRight}{/Control}");
  await vi.waitFor(() => expect(router.state.location.pathname).toBe(draftPath));
  expect(focusedIndex()).toBe(1);

  await press("{Control>}p{/Control}x");
  await vi.waitFor(() => expect(cells()).toHaveLength(1));
  await vi.waitFor(() => expect(router.state.location.pathname).toBe(threadPath));
  expect(cells()[0]!.contains(firstComposer)).toBe(true);
});

it("tabs show in the strip, and a thread lives in one pane: opening it again jumps there", async () => {
  const thread = threadWithHistory("z3-tabs", 1);
  using _environment = setup([thread]);
  await page.viewport(1600, 800);
  const { router, screen } = await openThread(thread);
  await using _screen = screen;
  const threadPath = router.state.location.pathname;
  const stripTabs = () => [...document.querySelectorAll("[data-z3-tabs] [data-active-tab]")];
  expect(stripTabs().map((tab) => tab.textContent)).toEqual(["Tab 1"]);

  await press("{Control>}t{/Control}n");
  await vi.waitFor(() =>
    expect(leaves(activeTab(useZ3Store.getState().layout).root)[0]!.target?.kind).toBe("draft"),
  );
  expect(router.state.location.pathname).toContain("/draft/");
  await vi.waitFor(() => expect(stripTabs()).toHaveLength(2));
  expect(stripTabs().map((tab) => tab.getAttribute("data-active-tab"))).toEqual(["false", "true"]);

  // What a sidebar click does: the route names the thread, which tab 1 already shows.
  await router.navigate({ to: threadPath });
  await vi.waitFor(() =>
    expect(stripTabs().map((tab) => tab.getAttribute("data-active-tab"))).toEqual([
      "true",
      "false",
    ]),
  );
  const shown = useZ3Store
    .getState()
    .layout.tabs.flatMap((tab) => leaves(tab.root))
    .filter((leaf) => leaf.target?.kind === "server");
  expect(shown).toHaveLength(1);
  await expect.element(page.getByText("Answer 0 for z3-tabs.")).toBeVisible();

  // By exact name: the sidebar's rows also name the tab.
  await userEvent.click(page.getByRole("button", { name: "Tab 2", exact: true }));
  await vi.waitFor(() => expect(router.state.location.pathname).toContain("/draft/"));
});
