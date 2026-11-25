import { thrownErrorMessage } from "@t3tools/client-runtime/errors";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import type { ScopedThreadRef } from "@t3tools/contracts";
import { msg } from "gt-react";
import { useEffect } from "react";

import { stackedThreadToast, toastManager } from "../components/ui/toast";
import { useStableCallback } from "../hooks/useStableCallback";
import { useThreadActions } from "../hooks/useThreadActions";
import { m } from "../i18n/messages";
import { registerSettle } from "./actions";

/** Lends the stock settle command to the pane keys; a failure shows the stock toast. */
export function SettleBridge() {
  const { settleThread } = useThreadActions();
  const settle = useStableCallback(async (threadRef: ScopedThreadRef): Promise<boolean> => {
    const result = await settleThread(threadRef);
    if (result._tag === "Success") return true;
    const error = squashAtomCommandFailure(result);
    console.info("[z3] settle failed; the pane stays", threadRef.threadId, error);
    toastManager.add(
      stackedThreadToast({
        type: "error",
        title: m(msg("Failed to settle thread")),
        description: thrownErrorMessage(error, m) ?? m(msg("An error occurred.")),
      }),
    );
    return false;
  });
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- registers the hook-bound command with the key actions while the pane host shows
  useEffect(() => {
    registerSettle(settle);
    return () => registerSettle(null);
  }, [settle]);
  return null;
}
