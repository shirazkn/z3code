# z3code

A fork of [T3 Code](https://github.com/pingdotgg/t3code) `v0.1.11` with Zellij-style panes, tabs and modes, and the A24 look of the dotfiles' work profile. It is a separate Mac app (`com.shirazkn.z3code`, data in `~/.z3code`) and runs beside stock T3 Code.

## Install (Mac, Apple silicon)

```sh
scripts/z3/install-mac.sh
```

It builds `z3code.app` from this checkout, copies it to `/Applications`, signs it ad hoc and opens it. It needs Node 26, pnpm 12 and Rust. Pair a remote T3 server (`0.1.11`) with `t3 pair` there, then Add environment in the app.

## Workspace

- A tab holds a tiling of panes; a pane shows one thread. A thread is open in at most one pane: clicking it in the sidebar opens it in the focused pane, or goes to its pane (switching tabs) when it is already open.
- The sidebar lists the tabs first, in tab-bar order, each with the threads its panes show. Every other thread stays in the stock list below. The sidebar reads the pane layout, so the two cannot differ.
- Move a thread between tabs: drag its sidebar row onto a tab (in the sidebar or the tab bar) or onto + for a new tab, or right-click it and pick Open in tab / Move to tab. It takes a blank pane of that tab, else a new pane. Remove from tab, or a drop on the No tab strip, closes its pane; a tab closes with its last pane.
- The four tabs shown last stay loaded, so a switch back does not load the threads again.
- The tab bar is the top row. Tabs are named Tab 1, Tab 2… until you rename them (double-click, or Cmd+T r); hover shows a close button; + opens a tab. While a mode is on, the bar's right end names it and lists its keys; Locked shows while the lock is on.
- Each pane has a one-line title bar with its thread. Panel buttons and the project card show on the focused pane only.
- The focused pane draws its text at full strength. In a split the other panes fade back; a mode fades them further and dims the sidebar.
- UI text runs one step under the chat text. Every color comes from the active theme.
- The first launch selects the z3 theme, the wide chat width and the grouped sidebar; Settings can change them.

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
  - `components/ThreadRouteView.tsx`: `passive` (a pane without focus is a background thread and leaves the route alone); `onUnavailable` (a pane drops a thread it cannot show instead of going home).
  - `components/chat/{ChatComposer,ComposerControl,ComposerControlsBar,ComposerPrimaryActions,ComposerAttachmentStrip,ComposerSpeechButton,ProviderModelPicker}.tsx`: the compact composer footer (20px controls, 11px text).
  - `components/ChatView.tsx`: four window-level composer-focus and paste listeners also stand down for a background thread.
  - `state/server.ts`: `remapStockKeys` on the app's keybinding list.
  - `components/chat/TimelineWorkGroupRows.tsx`: the working row label (`Z3Working`).
  - `main.tsx`: `z3/firstKeyListener` loads first, so a mode sees every key before stock listeners.
  - `appInit.tsx`: `adoptZ3Theme`.
  - `apps/desktop/src/window/DesktopApplicationMenu.ts`: Hide without Cmd+H.
  - `vite.config.ts`: `apps/web/src/z3/**` is exempt from the translation lint.
  - `components/ChatView.browser.test.tsx`: its stash and right-panel chords moved off the mode keys.
  - `components/settings/KeybindingsSettings.tsx`: the Zellij modes section.
  - `components/sidebar/SidebarChrome.tsx`: the Z3 wordmark (`z3/Z3Wordmark.tsx`) in place of T3's.
  - `components/Sidebar.tsx`: the tab groups (`z3/SidebarTabs.tsx`) lead the thread list and take their threads out of the stock rows; a drag onto a tab counts as a drag out of the list; the thread menu gets the tab entries. A drag of a tab's thread never reorders the stock list.
- Update: `git fetch upstream --tags && git rebase --onto <new tag> v0.1.11 main`, then run `vp run typecheck` in `apps/web` and `vp test run src/z3` (unit and browser). Keep the base tag equal to the server version you pair with.
