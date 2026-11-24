# z3code

A fork of [T3 Code](https://github.com/pingdotgg/t3code) `v0.1.11` with Zellij-style panes, tabs and modes, a Zellij compact bar, and the A24/Kanagawa look of the dotfiles' work profile. It is a separate Mac app (`com.shirazkn.z3code`, data in `~/.z3code`) and runs beside stock T3 Code.

## Install (Mac, Apple silicon)

```sh
scripts/z3/install-mac.sh
```

It builds `z3code.app` from this checkout, copies it to `/Applications`, signs it ad hoc and opens it. It needs Node 26, pnpm 12 and Rust. Pair a remote T3 server (`0.1.11`) with `t3 pair` there, then Add environment in the app.

## Keys

The keymap is Zellij's default plus the dotfiles' `config.kdl` deltas. Its one source is `apps/web/src/z3/keymap.ts`.

| Mode (key)             | Keys                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Pane (Cmd+P)           | hjkl/arrows focus · p next · ; last · n new (largest pane) · d down · c right · x close · f fullscreen · r rename thread   |
| Tab (Cmd+T)            | hl/jk/arrows switch · n new · x close · r rename · 1–9 go · Tab last · b break pane to new tab · [ ] break pane left/right |
| Resize (Cmd+N)         | hjkl/arrows move the pane's border that way (opposite keys undo) · = + − grow/shrink all edges                             |
| Move (Cmd+H)           | hjkl swap with neighbour · n/Tab next · p previous                                                                         |
| Scroll (Cmd+S)         | jk line · du half page · hl/PageUp/PageDown/Ctrl+F/Ctrl+B page · [ ] previous/next turn · s find · Ctrl+C bottom           |
| Session (Cmd+O)        | w thread palette · c settings                                                                                              |
| Lock (Caps Lock = F18) | every key goes to the page until Caps Lock again                                                                           |

Esc, Enter or the mode key again return to normal mode. A mode swallows the keys it does not bind. Panes without focus are slightly dimmed; the focused pane has a faint edge glow that brightens while a mode is on (warning tone when locked). Settings → Keybindings → Zellij modes lists every key. Every color comes from the active theme.

Normal mode also has: Alt+N new pane, Alt+HJKL focus (Alt+H/L go to the next tab at the edge; Option+arrows stay word moves), Alt+= Alt+− resize, Alt+I Alt+O move the tab, Home/End/PageUp/PageDown and Ctrl+arrows focus, Cmd+Up/Down focus, Shift+PageUp/PageDown and Ctrl+Shift+Up/Down page scroll, Cmd+Shift+[ ] previous/next tab. A normal-mode key with nothing to act on (no pane or tab there) keeps its stock meaning.

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
- Update: `git fetch upstream --tags && git rebase --onto <new tag> v0.1.11 main`, then run `vp run typecheck` in `apps/web` and `vp test run src/z3` (unit and browser). Keep the base tag equal to the server version you pair with.
