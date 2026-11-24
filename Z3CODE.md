# z3code

A fork of [T3 Code](https://github.com/pingdotgg/t3code) `v0.1.11` with Zellij-style panes, tabs and modes, and the A24 look of the dotfiles' work profile. It is a separate Mac app (`com.shirazkn.z3code`, data in `~/.z3code`) and runs beside stock T3 Code.

## Install (Mac, Apple silicon)

```sh
scripts/z3/install-mac.sh
```

It builds `z3code.app` from this checkout, copies it to `/Applications`, signs it ad hoc and opens it. It needs Node 26, pnpm 12 and Rust. Pair a remote T3 server (`0.1.11`) with `t3 pair` there, then Add environment in the app.

## Workspace

- A tab holds a tiling of panes; a pane shows one thread. A thread is open in at most one pane.
- The sidebar puts a small dot on each thread that is open in a pane. Clicking a thread opens it in the focused pane, or, when it is already open, goes to its pane (switching tabs if needed).
- With two or more tabs (or in tab mode), a tab strip sits in the title bar row. A tab is named after its focused pane's thread until you rename it (double-click, or Cmd+T r). Its glyph shows the tiling; on hover it turns into a close button. + opens a tab.
- In a split, the focused pane reads at higher contrast and the others fade back. While a mode is on, everything but the focused pane dims. The lock has no visual cue.
- Splits and tabbed views use one-line pane headers and narrow side gutters. Every color comes from the active theme.

## Keys

The keymap is Zellij's default plus the dotfiles' `config.kdl` deltas, with the changes noted below. Its one source is `apps/web/src/z3/keymap.ts`; Settings → Keybindings → Zellij modes lists it.

| Mode (key)             | Keys                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Pane (Cmd+P)           | hjkl/arrows focus · p next · ; last · n new (largest pane) · d down · c right · x close · f fullscreen · r rename thread                  |
| Tab (Cmd+T)            | hl/jk/arrows switch · n new · x close · r rename · 1–9 go · Tab last · b break pane to new tab · [ ] break pane left/right · Space layout |
| Resize (Cmd+N)         | hjkl/arrows move the pane's border that way (opposite keys undo) · = + − grow/shrink all edges                                            |
| Move (Cmd+H)           | hjkl swap with neighbour · n/Tab next · p previous                                                                                        |
| Scroll (Cmd+S)         | jk line · du half page · hl/PageUp/PageDown/Ctrl+F/Ctrl+B page · [ ] previous/next turn · s find · Ctrl+C bottom                          |
| Session (Cmd+O)        | w thread palette · c settings                                                                                                             |
| Lock (Caps Lock = F18) | every key goes to the page until Caps Lock again                                                                                          |

Esc, Enter or the mode key again return to normal mode. A mode swallows the keys it does not bind.

Normal mode: Globe+arrows (Home/End/PageUp/PageDown) and Ctrl+arrows move between panes only; with no pane that way they bring the keyboard back to the focused pane. Alt+N new pane, Alt+HJKL focus (Alt+H/L go to the next tab at the edge), Alt+[ ] change the tab's layout, Alt+= Alt+− resize, Alt+I Alt+O move the tab, Cmd+Up/Down focus, Shift+PageUp/PageDown and Ctrl+Shift+Up/Down page scroll, Cmd+Shift+[ ] previous/next tab. Option+arrows stay the text field's word moves. Other normal-mode keys with nothing to act on keep their stock meaning.

Stock commands that moved off a mode key: file picker Cmd+Alt+P, new chat Cmd+Shift+O, stash Cmd+Alt+S, open in editor Cmd+Alt+O, new right-panel tab Cmd+Alt+T, previous/next thread Cmd+Alt+[ ]. macOS Hide keeps its menu item and loses Cmd+H.

## Fork layout

- `main` = `v0.1.11` + `z3: app identity` + the z3 commit(s). Remotes: `upstream` (pingdotgg/t3code, never push, never push tags) and `origin`.
- New code lives in `apps/web/src/z3/`. Upstream files carry small edits only:
  - `routes/_chat.tsx`: `PaneHost` replaces the one `ThreadRouteView`; `Z3Home` wraps home.
  - `components/ThreadRouteView.tsx`: `passive` (a pane without focus is a background thread and leaves the route alone).
  - `components/ChatView.tsx`: four window-level composer-focus and paste listeners also stand down for a background thread.
  - `state/server.ts`: `remapStockKeys` on the app's keybinding list.
  - `components/chat/TimelineWorkGroupRows.tsx`: the working row label (`Z3Working`).
  - `main.tsx`: `z3/firstKeyListener` loads first, so a mode sees every key before stock listeners.
  - `appInit.tsx`: `adoptZ3Theme`.
  - `apps/desktop/src/window/DesktopApplicationMenu.ts`: Hide without Cmd+H.
  - `vite.config.ts`: `apps/web/src/z3/**` is exempt from the translation lint.
  - `components/ChatView.browser.test.tsx`: its stash and right-panel chords moved off the mode keys.
  - `components/settings/KeybindingsSettings.tsx`: the Zellij modes section.
- Update: `git fetch upstream --tags && git rebase --onto <new tag> v0.1.11 main`, then run `vp run typecheck` in `apps/web` and `vp test run src/z3` (unit and browser). Keep the base tag equal to the server version you pair with.
