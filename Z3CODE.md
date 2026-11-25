# z3code

A fork of [T3 Code](https://github.com/pingdotgg/t3code) `v0.1.11` with Zellij-style panes, tabs and modes, and a theme in the app icon's colors (deep teal, cream, amber). It is a separate Mac app (`com.shirazkn.z3code`, data in `~/.z3code`) and runs beside stock T3 Code.

## Install (Mac, Apple silicon)

```sh
scripts/z3/install-mac.sh
```

It builds `z3code.app` from this checkout, copies it to `/Applications`, signs it ad hoc and opens it. It needs Node 26, pnpm 12 and Rust. Pair a remote T3 server (`0.1.11`) with `t3 pair` there, then Add environment in the app. While it runs, the app sets its Dock icon to the light or the dark z3 icon, as its appearance (System by default) asks; Finder and Launchpad always show the dark one.

## Workspace

- A tab holds a tiling of panes; a pane shows one thread. A thread is open in at most one pane. A click on a thread in a tab goes to its pane. A click on any other thread opens a menu of the tabs and New tab; Enter on its row opens it in the focused pane.
- The sidebar lists the tabs first, in tab-bar order, each with the threads its panes show. Every other thread stays in one flat list below, without project folders. The sidebar reads the pane layout, so the two cannot differ.
- Move a thread between tabs: drag its sidebar row onto a tab (in the sidebar or the tab bar) or onto + for a new tab, or right-click it and pick Open in tab / Move to tab. It takes a blank pane of that tab, else a new pane. Remove from tab, or a drop on the No tab strip, closes its pane; a tab closes with its last pane.
- A sidebar thread row that is held lifts after 110 ms, to show it can move.
- The dark variants of the built-in themes (T3 Chat, Grove, Ocean, Ember, Iris) have a much darker background (`packages/shared/src/themePalettes.ts`, with boot copies in `apps/web/index.html` and `apps/mobile/generated-uniwind-themes.css`). Their light variants have stronger accent colors and tinted message bubbles and sidebars. In dark mode Ocean's chat area grades to true black at the bottom; Iris and Ember carry a faint glow of their accent (`z3.css`).
- A focus move or a tab switch paints first; the thread views and the route follow in a later render.
- With the sidebar collapsed the tab bar stays 28 px, except beside the macOS window buttons (a window that is not full screen).
- The first launch sets the glass opacity to 50%.
- A pane whose Claude thread published or read an artifact shows a window icon in its title bar. A click opens the newest artifact in the system browser, because claude.ai's bot check fails in the Browser panel. Alt-click opens it in the Browser panel, in a browser profile of the thread's provider account (added on first use, with its own cookies).
- In dark mode the chat area's background drops to true black over its last 32 px at the top and bottom, the top of the tab bar included.
- The four tabs shown last stay loaded, so a switch back does not load the threads again.
- The tab bar is the top row. Tabs are named Tab 1, Tab 2… until you rename them (double-click, or Cmd+T r); hover shows a close button; + opens a tab. While a mode is on, the bar's right end names it and lists its main keys, the key letters in the accent color; Locked shows while the lock is on.
- Each pane has a one-line title bar with its thread. Panel buttons and the project card show on the focused pane only. In a new thread, the project name in the title is the project picker: a search list of the known projects, and Add project.
- The focused pane draws its text at full strength. In a split the other panes fade back (light themes shade them, dark themes veil them); a mode fades them further and dims the sidebar.
- UI text runs one step under the chat text. Every color comes from the active theme.
- A palette theme (`kida`, after `z3` in Settings; `palettes.ts`) gives each pane one of its 4 colors: the pane's top line, flat ground, buttons, focus ring and message bubbles. The sidebar and tab bar keep the palette's neutral. The theme is flat: shadows have no blur, and only the tab bar fades, to black at its top. A new pane takes a random one of the colors its tab uses least and keeps it (`paintLeaves` in `layout.ts`). Any theme whose CSS defines `--z3-hue-0` to `--z3-hue-3` colors panes this way. Settings shows a palette theme as a strip of its colors (`components/settings/ThemePreviewCircles.tsx`).
- The first launch selects the z3 theme, the wide chat width and the grouped sidebar; Settings can change them.

## Keys

The keymap is Zellij's default plus the dotfiles' `config.kdl` deltas, with the changes noted below. Its one source is `apps/web/src/z3/keymap.ts`; Settings → Keybindings → Zellij modes lists it.

| Mode (key)             | Keys                                                                                                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pane (Cmd+P)           | hjkl/arrows focus · p next · ; last · n new (largest pane) · d down · c right · x settle the thread and close the pane · s stash (close the pane, the thread stays open) · f fullscreen · r rename thread |
| Tab (Cmd+T)            | hl/jk/arrows switch · n new · x close · r rename · 1–9 go · Tab last · b break pane to new tab · [ ] break pane left/right · Space layout                                                                 |
| Resize (Cmd+N)         | hjkl/arrows move the pane's border that way (opposite keys undo) · = + − grow/shrink all edges                                                                                                            |
| Move (Cmd+H)           | hjkl swap with neighbour · n/Tab next · p previous                                                                                                                                                        |
| Scroll (Cmd+S)         | jk line · du half page · hl/PageUp/PageDown/Ctrl+F/Ctrl+B page · [ ] previous/next turn · s find · Ctrl+C bottom                                                                                          |
| Session (Cmd+O)        | w thread palette · c settings                                                                                                                                                                             |
| Lock (Caps Lock = F18) | every key goes to the page until Caps Lock again                                                                                                                                                          |

Esc, Enter or the mode key again return to normal mode. A mode swallows the keys it does not bind.

Normal mode: Globe+arrows (Home/End/PageUp/PageDown) and Ctrl+arrows move between panes. With no pane to the left or right they go to the previous or next tab and enter it at the near edge, so repeated presses walk every pane of every tab; with no pane and no other tab they bring the keyboard back to the focused pane. Alt+N new pane, Alt+[ ] change the tab's layout, Alt+= Alt+− resize, Alt+I Alt+O move the tab, Shift+PageUp/PageDown and Ctrl+Shift+Up/Down page scroll, Cmd+Shift+[ ] and Ctrl+[ ] previous/next tab. Option+arrows stay the text field's word moves. Alt keys with nothing to act on do nothing; the page-scroll keys with nothing to act on keep their stock meaning. Each direct key has one chord per modifier family (Globe or Ctrl, Cmd, Alt); the Globe key itself is not a modifier an app can read, so Globe+[ cannot be a key. In a search field, Home, End and Ctrl+arrows stay the field's own keys.

Esc in the prompt box (normal mode): takes back the latest queued message to edit; with none queued, it stops the thread.

Stock commands that moved off a mode key: file picker Cmd+Alt+P, new chat Cmd+Shift+O, stash Cmd+Alt+S, open in editor Cmd+Alt+O, new right-panel tab Cmd+Alt+T, previous/next thread Cmd+Alt+[ ]. macOS Hide keeps its menu item and loses Cmd+H.

## Adding a palette theme (for agents)

1. Ask the user for the theme's name. Do not choose one.
2. Never name the artwork, album, film or other media that inspired a theme: not in code, comments, commits, docs or anywhere else in the repo. The theme's name may hint at it.
3. Add one `PaletteTheme` to `PALETTE_THEMES` in `apps/web/src/z3/palettes.ts`. Each of `light` and `dark` needs a background, a text color, one neutral and exactly 4 `hues`. Stay inside the source's palette; do not invent extra colors.
4. Raise `THEME_VERSION` in `apps/web/src/z3/theme.ts`, so installed copies update.
5. Check contrast: each hue against the background, and the text color against the background.

No other file changes. `theme.ts` builds the theme, `z3.css` colors the panes, and Settings draws the color strip.

## Fork layout

- `main` = `v0.1.11` + `z3: app identity` + the z3 commit(s). Remotes: `upstream` (pingdotgg/t3code, never push, never push tags) and `origin`.
- New code lives in `apps/web/src/z3/`. Upstream files carry small edits only:
  - `routes/_chat.tsx`: `PaneHost` replaces the one `ThreadRouteView`; `Z3Home` wraps home.
  - `components/ThreadRouteView.tsx`: `passive` (a pane without focus is a background thread and leaves the route alone); `onUnavailable` (a pane drops a thread it cannot show instead of going home).
  - `components/chat/{ChatComposer,ComposerControl,ComposerControlsBar,ComposerPrimaryActions,ComposerAttachmentStrip,ComposerSpeechButton,ProviderModelPicker}.tsx`: the compact composer footer (20px controls, 11px text).
  - `components/ChatView.tsx`: four window-level composer-focus and paste listeners also stand down for a background thread.
  - `packages/shared/src/keybindings.ts`, `components/ChatView.tsx`, `components/chat/QueuedRunsControl.tsx`: Esc on `thread.stop`, after the queued-message step.
  - `state/server.ts`: `remapStockKeys` on the app's keybinding list.
  - `components/chat/MessagesTimeline.tsx`: `data-chat-empty` on the empty-thread hint, which panes hide.
  - `components/chat/TimelineWorkGroupRows.tsx`: the working row label (`Z3Working`).
  - `main.tsx`: `z3/firstKeyListener` loads first, so a mode sees every key before stock listeners.
  - `appInit.tsx`: `adoptZ3Theme`.
  - `hooks/useDefaultTheme.ts`: a server default of the stock theme selects the z3 theme.
  - `apps/desktop/src/window/DesktopApplicationMenu.ts`: Hide without Cmd+H.
  - `vite.config.ts`: `apps/web/src/z3/**` is exempt from the translation lint.
  - `components/ChatView.browser.test.tsx`: its stash and right-panel chords moved off the mode keys.
  - `components/settings/KeybindingsSettings.tsx`: the Zellij modes section.
  - `components/AppSidebarLayout.tsx`: `data-native-window-controls` on the sidebar wrapper.
  - `components/chat/ComposerAttachmentStrip.tsx`: also the fainter attach icon.
  - `scripts/lib/brand-assets.ts`, `apps/desktop/scripts/electron-launcher.mjs`, `components/T3AppIcon.tsx`, `apps/web/public/*`: the z3 icon. Its sources are `assets/z3/app-icon.svg` and `app-icon-small.svg` (32 px and below); `scripts/z3/render-icons.sh` renders every size.
  - `components/sidebar/SidebarChrome.tsx`: the Z3 wordmark (`z3/Z3Wordmark.tsx`) in place of T3's.
  - `components/Sidebar.tsx`: the tab groups (`z3/SidebarTabs.tsx`) lead the thread list and take their threads out of the stock rows; a drag onto a tab counts as a drag out of the list; the thread menu gets the tab entries; a click on a thread outside tabs opens the tab menu; the grouped sidebar lists threads flat (`FLAT_THREAD_LIST`). A drag of a tab's thread never reorders the stock list.
- Update: `git fetch upstream --tags && git rebase --onto <new tag> v0.1.11 main`, then run `vp run typecheck` in `apps/web` and `vp test run src/z3` (unit and browser). Keep the base tag equal to the server version you pair with.
