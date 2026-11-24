import { scopedThreadKey } from "@t3tools/client-runtime/environment";
import { turnItemDetailRevision } from "@t3tools/client-runtime/work-log/item-detail";
import {
  AuthPreviewOperateScope,
  BROWSER_PROFILE_MAX_COUNT,
  DEFAULT_BROWSER_PROFILE_ID,
  type OrchestrationV2TurnItem,
  type ScopedThreadRef,
} from "@t3tools/contracts";
import { resolveProviderInstanceDisplayName } from "@t3tools/client-runtime/state/provider-instance-display";
import { AppWindowIcon } from "lucide-react";

import { openUrlInPreview } from "../browser/openFileInPreview";
import { getClientSettings, updateClientSettings } from "../hooks/useSettings";
import { appAtomRegistry } from "../rpc/atomRegistry";
import { readThreadShell, useQuietThreadProjection } from "../state/entities";
import { environmentPresentations } from "../state/presentation";
import { previewEnvironment } from "../state/preview";
import { useTurnItemDetail } from "../state/queries";
import { useEnvironmentScope } from "../state/session";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../components/ui/tooltip";
import { useAtomCommand } from "../state/use-atom-command";
import { accountProfile, artifactOf, latestArtifactCall } from "./artifacts";

/** The browser profile of the account that runs the thread; it is added on first use. */
async function profileFor(threadRef: ScopedThreadRef): Promise<string> {
  const instanceId = readThreadShell(threadRef)?.modelSelection.instanceId;
  if (instanceId === undefined) {
    console.info("[z3] artifact opens in the default profile: the thread names no account");
    return DEFAULT_BROWSER_PROFILE_ID;
  }
  const snapshot = appAtomRegistry
    .get(environmentPresentations.providersByEnvironmentAtom)
    .get(threadRef.environmentId)
    ?.find((candidate) => candidate.instanceId === instanceId);
  const profile = accountProfile(
    instanceId,
    snapshot === undefined ? instanceId : resolveProviderInstanceDisplayName(snapshot),
  );
  const { browserProfiles } = getClientSettings();
  if (browserProfiles.some((candidate) => candidate.id === profile.id)) return profile.id;
  if (browserProfiles.length >= BROWSER_PROFILE_MAX_COUNT) {
    console.info(
      `[z3] artifact opens in the default profile: ${browserProfiles.length} profiles, the limit is ${BROWSER_PROFILE_MAX_COUNT}`,
    );
    return DEFAULT_BROWSER_PROFILE_ID;
  }
  await updateClientSettings({ browserProfiles: [...browserProfiles, profile] });
  return profile.id;
}

/** Shown in a pane whose thread works on a Claude artifact: opens it in its account's browser. */
export function PaneArtifact({ threadRef }: { threadRef: ScopedThreadRef }) {
  const structure = useQuietThreadProjection(threadRef);
  const call =
    structure === null
      ? null
      : latestArtifactCall(
          structure.projection.turnItems as ReadonlyArray<OrchestrationV2TurnItem>,
        );
  // The wire leaves a tool's output out; the full call holds the artifact's link.
  const detail = useTurnItemDetail(
    call === null
      ? null
      : {
          environmentId: threadRef.environmentId,
          threadId: threadRef.threadId,
          itemId: call.id,
          revision: turnItemDetailRevision(call),
        },
  );
  const canPreview = useEnvironmentScope(threadRef.environmentId, AuthPreviewOperateScope);
  const openPreview = useAtomCommand(previewEnvironment.open, { reportFailure: false });
  const artifact = artifactOf(detail.data?.item ?? call ?? { type: "", status: "" });
  if (artifact === null) return null;

  const open = async () => {
    if (canPreview) {
      const profileId = await profileFor(threadRef);
      const result = await openUrlInPreview({
        threadRef,
        url: artifact.url,
        openPreview,
        profileId,
      });
      if (result._tag === "Success") return;
      console.info("[z3] the browser panel did not open the artifact; using a new window", {
        thread: scopedThreadKey(threadRef),
        profileId,
      });
    } else {
      console.info("[z3] no browser panel access here; the artifact opens in a new window");
    }
    window.open(artifact.url, "_blank", "noopener");
  };
  const label = `Open artifact${artifact.title === null ? "" : `: ${artifact.title}`}`;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            data-z3-artifact
            aria-label={label}
            className="absolute top-1 z-[55] flex size-5 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            onClick={() => void open()}
          />
        }
      >
        <AppWindowIcon className="size-3.5" />
      </TooltipTrigger>
      <TooltipPopup side="bottom">{label}</TooltipPopup>
    </Tooltip>
  );
}
