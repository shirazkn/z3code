import { describe, expect, it } from "vite-plus/test";

import { accountProfile, artifactOf, latestArtifactCall } from "./artifacts";

const call = (input: unknown, output?: unknown, status = "completed") => ({
  type: "dynamic_tool",
  toolName: "Artifact",
  status,
  input,
  ...(output === undefined ? {} : { output }),
});
const URL = "https://claude.ai/artifact/AAAAAAAAAAAAAAAAAAAAAA";

describe("latestArtifactCall", () => {
  it("takes the newest finished call that names one artifact", () => {
    const publish = call({ file_path: "/tmp/a.html" });
    const items = [
      call({ action: "read", url: URL }),
      publish,
      { type: "dynamic_tool", toolName: "Read", status: "completed", input: {} },
      call({ action: "list" }),
      call({ file_path: "/tmp/b.html" }, undefined, "running"),
      { type: "command_execution", status: "completed" },
    ];
    expect(latestArtifactCall(items)).toBe(publish);
    expect(latestArtifactCall([call({ action: "quickstart" }), call("Large tool input")])).toEqual(
      call("Large tool input"),
    );
    expect(latestArtifactCall([])).toBeNull();
  });
});

describe("artifactOf", () => {
  it("reads the link from a publish, a read or the call's own input", () => {
    expect(artifactOf(call({ file_path: "/tmp/a.html" }, { url: URL, title: "Status" }))).toEqual({
      url: URL,
      title: "Status",
    });
    expect(
      artifactOf(call({ action: "read", url: URL }, { read: { url: URL, title: "Status" } })),
    ).toEqual({ url: URL, title: "Status" });
    expect(artifactOf(call({ action: "open", url: URL }))).toEqual({ url: URL, title: null });
  });

  it("gives nothing for a call without a claude.ai link", () => {
    expect(artifactOf(call({ file_path: "/tmp/a.html" }))).toBeNull();
    expect(artifactOf(call({}, { url: "https://example.com/artifact/1" }))).toBeNull();
    expect(artifactOf(call({}, "Error: publish refused"))).toBeNull();
  });
});

describe("accountProfile", () => {
  it("keeps the profile id and name inside the contract's limits", () => {
    const profile = accountProfile("claudeAgent:" + "x".repeat(80), "n".repeat(60));
    expect(profile.id).toHaveLength(64);
    expect(profile.name).toHaveLength(48);
    expect(accountProfile("claudeAgent", "Claude").id).toBe("z3:claudeAgent");
  });
});
