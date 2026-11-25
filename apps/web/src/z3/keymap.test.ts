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
    // Option+arrows stay the text field's word moves.
    expect(resolve("normal", "alt+ArrowLeft").kind).toBe("pass");
    // Globe+arrow never reaches the sidebar's Home/End; left and right reach the next tab.
    const home = resolve("normal", "Home");
    expect(home.kind === "bind" && home.swallow).toBe(true);
    expect(home.kind === "bind" && home.bind.action).toEqual({
      do: "focus",
      dir: "left",
      orTab: true,
    });
    const up = resolve("normal", "PageUp");
    expect(up.kind === "bind" && up.bind.action).toEqual({ do: "focus", dir: "up" });
    const layout = resolve("normal", "alt+]");
    expect(layout.kind === "bind" && layout.bind.action).toEqual({ do: "swapLayout", step: 1 });
    const direct = resolve("normal", "alt+h");
    // Alt+H with no pane to the left must not type a symbol.
    expect(direct.kind === "bind" && direct.swallow).toBe(true);
  });

  it("keeps the dotfiles deltas: c splits right, r renames", () => {
    const c = resolve("pane", "c");
    expect(c.kind === "bind" && c.bind.action).toEqual({ do: "newPane", dir: "right" });
    const r = resolve("pane", "r");
    expect(r.kind === "bind" && r.bind.action).toEqual({ do: "renamePane" });
  });

  it("moves the border with h and Shift+H alike in resize mode", () => {
    for (const spec of ["h", "shift+H", "ArrowLeft"]) {
      const r = resolve("resize", spec);
      expect(r.kind === "bind" && r.bind.action).toEqual({ do: "nudge", dir: "left" });
    }
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
