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
import { __setClientSettingsForTests, getClientSettings } from "~/hooks/useSettings";
import { getRouter } from "~/router";
import {
  ENVIRONMENT_ID,
  assistantItem,
  installFakeEnvironment,
  threadWithHistory,
  type FakeDriver,
  type FakeThread,
} from "../../test/fakeEnvironment";
import { render } from "../../test/render";
import { createLayout } from "./layout";
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

const ARTIFACT_URL = "https://claude.ai/artifact/AAAAAAAAAAAAAAAAAAAAAA";

it("a pane whose thread published an artifact shows a button; Alt-click opens it for its account", async () => {
  const plain = threadWithHistory("z3-plain", 1);
  const base = threadWithHistory("z3-artifact", 1);
  const {
    messageId: _messageId,
    text: _text,
    streaming: _streaming,
    ...item
  } = assistantItem(base.id, base.runs[0]!.id, "z3-artifact-call", 9, "");
  const thread: FakeThread = {
    ...base,
    items: [
      ...base.items,
      {
        ...item,
        type: "dynamic_tool",
        toolName: "Artifact",
        input: { file_path: "/tmp/status.html" },
        output: { url: ARTIFACT_URL, title: "Status" },
      },
    ],
  };
  using _environment = setup([thread, plain]);
  await page.viewport(1600, 800);
  const { router, screen } = await openThread(thread);
  await using _screen = screen;

  const button = page.getByRole("button", { name: "Open artifact: Status" });
  await expect.element(button).toBeVisible();
  await userEvent.keyboard("{Alt>}");
  await userEvent.click(button);
  await userEvent.keyboard("{/Alt}");
  // The thread's account gets its own browser profile before the panel opens the link.
  const instanceId = thread.modelSelection!.instanceId;
  await vi.waitFor(() =>
    expect(getClientSettings().browserProfiles.map((profile) => profile.id)).toEqual([
      `z3:${instanceId}`,
    ]),
  );

  await router.navigate({ to: `/${ENVIRONMENT_ID}/${plain.id}` });
  await expect.element(page.getByText("Answer 0 for z3-plain.")).toBeVisible();
  await expect.element(button).not.toBeInTheDocument();
});
