import type { BrowserProfile } from "@t3tools/contracts";

/** An Artifact tool call as the thread lists it; the wire leaves `output` out. */
export interface ArtifactCall {
  readonly type: string;
  readonly toolName?: string | null | undefined;
  readonly status: string;
  readonly input?: unknown;
  readonly output?: unknown;
}

// Calls that name no single artifact to show.
const NO_ARTIFACT_ACTIONS = new Set(["list", "quickstart", "delete", "pin", "unpin"]);

const record = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value : null;

/** The thread's newest finished Artifact tool call that can name an artifact. */
export function latestArtifactCall<T extends ArtifactCall>(items: ReadonlyArray<T>): T | null {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index]!;
    if (item.type !== "dynamic_tool" || item.toolName !== "Artifact") continue;
    if (item.status !== "completed") continue;
    const action = text(record(item.input)?.action);
    if (action === null || !NO_ARTIFACT_ACTIONS.has(action)) return item;
  }
  return null;
}

/** The artifact a call published, updated or read: its claude.ai link and its title. */
export function artifactOf(call: ArtifactCall): { url: string; title: string | null } | null {
  const output = record(call.output);
  const read = record(output?.read);
  const url = text(output?.url) ?? text(read?.url) ?? text(record(call.input)?.url);
  if (url === null || !/^https:\/\/claude\.ai\//u.test(url)) return null;
  return { url, title: text(output?.title) ?? text(read?.title) };
}

/** The browser profile that holds one provider account's claude.ai sign-in. */
export function accountProfile(instanceId: string, displayName: string): BrowserProfile {
  return {
    id: `z3:${instanceId}`.slice(0, 64),
    name: displayName.slice(0, 48),
    kind: "persistent",
  };
}
