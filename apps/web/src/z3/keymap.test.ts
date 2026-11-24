import { compileResolvedKeybindingsConfig } from "@t3tools/shared/keybindings";
import { describe, expect, it } from "vite-plus/test";

import { remapStockKeys, resolveKey, type Mode, type Resolution } from "./keymap";

const MAC = "MacIntel";

function key(spec: string) {
  const parts = spec.split("+");
  const name = parts.pop()!;
  return {
    key: name,
    code: /^[a-z]$/.test(name) ? `Key${name.toUpperCase()}` : name,
    metaKey: parts.includes("cmd"),
    ctrlKey: parts.includes("ctrl"),
    shiftKey: parts.includes("shift"),
    altKey: parts.includes("alt"),
  };
}

const resolve = (mode: Mode, spec: string): Resolution => resolveKey(mode, key(spec), MAC);
const nextMode = (mode: Mode, spec: string) => {
  const r = resolve(mode, spec);
  return r.kind === "bind" ? r.bind.next : undefined;
};

describe("resolveKey", () => {
  it("enters a mode with its Cmd key and leaves it with the same key, Esc or Enter", () => {
    expect(nextMode("normal", "cmd+p")).toBe("pane");
    expect(nextMode("pane", "cmd+p")).toBe("normal");
    expect(nextMode("pane", "cmd+t")).toBe("tab");
    expect(nextMode("tab", "Escape")).toBe("normal");
    expect(nextMode("scroll", "Enter")).toBe("normal");
    expect(resolve("normal", "Escape").kind).toBe("pass");
  });

  it("swallows unbound keys in a mode and passes them in normal mode", () => {
    expect(resolve("pane", "z").kind).toBe("swallow");
    expect(resolve("normal", "z").kind).toBe("pass");
    const direct = resolve("normal", "alt+h");
    expect(direct.kind === "bind" && direct.swallow).toBe(false);
  });

  it("keeps the dotfiles deltas: c splits right, r renames", () => {
    const c = resolve("pane", "c");
    expect(c.kind === "bind" && c.bind.action).toEqual({ do: "newPane", dir: "right" });
    const r = resolve("pane", "r");
    expect(r.kind === "bind" && r.bind.action).toEqual({ do: "renamePane" });
  });

  it("tells grow from shrink by Shift in resize mode", () => {
    const shrink = resolve("resize", "shift+H");
    expect(shrink.kind === "bind" && shrink.bind.action).toEqual({
      do: "resize",
      grow: false,
      dir: "left",
    });
  });

  it("toggles the lock on F18 and passes every other key while locked", () => {
    expect(nextMode("pane", "F18")).toBe("locked");
    expect(nextMode("locked", "F18")).toBe("normal");
    expect(resolve("locked", "cmd+p").kind).toBe("pass");
  });
});

describe("remapStockKeys", () => {
  it("moves a stock command off a mode chord and leaves the rest", () => {
    const config = compileResolvedKeybindingsConfig([
      { key: "mod+p", command: "filePicker.toggle", when: "!terminalFocus" },
      { key: "mod+k", command: "commandPalette.toggle", when: "!terminalFocus" },
    ]);
    const [picker, palette] = remapStockKeys(config);
    expect(picker!.shortcut).toMatchObject({ key: "p", modKey: true, altKey: true });
    expect(picker!.whenAst).toEqual(config[0]!.whenAst);
    expect(palette).toBe(config[1]);
  });
});
