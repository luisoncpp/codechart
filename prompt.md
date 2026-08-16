When comparing this diff

diff --git a/docs/architecture/README.md b/docs/architecture/README.md
index 941ea679..376e9c2d 100644
--- a/docs/architecture/README.md
+++ b/docs/architecture/README.md
@@ -7,6 +7,7 @@ Canonical technical guides — the single source of truth for each subsystem's d
 | [onboarding.yaml.md](onboarding.yaml.md) | New-recruit architecture overview | Big-picture map: 4 layers, keystroke→hit flow, deep modules, offline-first data, first-day checklist (hybrid YAML doc) |
 | [entity-architecture.md](entity-architecture.md) | Entity logic/visual split | `CombatActor`, `IActorView`, `EntityView`, `CombatVfxHelper` |
 | [eos-steam-auth.md](eos-steam-auth.md) | Steam + EOS Connect authentication | Official EOS SDK via dedicated thread + channel pattern; 5 env vars; Steam raw FFI login |
+| [lobby-window.md](lobby-window.md) | Lobby window + lobby mode | The header IS the control surface: three tabs (`public`/`private`/`offline`) are create / re-label / leave, routed in `lobbyCommands.ts` from the mode you are already in. Mode is a public EOS **attribute** (`MODE`), deliberately not a permission level — join is a search over `CODE`, so a non-advertised lobby would be unjoinable by its own code. Carries the host/guest/offline render matrix and the live `eos_lobby_updated` path a guest depends on |
 | [networking.md](networking.md) | EOS P2P, RoomSchema, RPCs | Post-MVP; MVP uses no-op stubs |
 | [data-persistence.md](data-persistence.md) | Offline-first data layer | All managers, SyncQueue, local cache, auth flow |
 | [server-architecture.md](server-architecture.md) | OVH Node.js / Fastify backend | Deep module pattern, testing, anti-cheat |
diff --git a/docs/architecture/expanded-hud.md b/docs/architecture/expanded-hud.md
index b02d447f..22e16543 100644
--- a/docs/architecture/expanded-hud.md
+++ b/docs/architecture/expanded-hud.md
@@ -100,19 +100,22 @@ idle art (no swap). `HUD_ICON`/`HUD_BASE` are built by the `hudTriplet(name)` he
 
 ## Lobby button (leftmost)
 
-Opens the **lobby panel as a floating popover** (`inventory/views/LobbyPopover.tsx`) — the same
-`LobbyPanel` the inventory window's LOBBY tab renders, with no window around it, so the button is a
-second entry point to the flow in [lobby-create-join](../flows/lobby-create-join.md) rather than a
-second implementation. It is the `"lobby"` member of `useHudOverlays`' single overlay slot, so it
-mutually excludes the inventory / loot / zone-info surfaces and shares their open-time
-`set_passthrough(false)` + `menuOpenChanged` (which pauses combat input — needed here, since the panel
-has a text field for the join code). Dismiss: backdrop, re-click, or Escape.
+Opens the **lobby window as a floating popover** (`HUD/lobby/LobbyPopover.tsx`) — the **only** lobby
+surface there is, since the inventory window's LOBBY tab was removed when the window grew its own
+title bar and mode header (see [lobby-window.md](lobby-window.md)). It is the `"lobby"` member of
+`useHudOverlays`' single overlay slot, so it mutually excludes the inventory / loot / zone-info
+surfaces and shares their open-time `set_passthrough(false)` + `menuOpenChanged` (which pauses combat
+input — needed here, since the offline window has a text field for the join code). Dismiss: backdrop,
+re-click, or Escape.
 
 **Anchored to the row's RIGHT edge** (`rowLeft + rowW`), opening up-left — not to its own leftmost
-button, which every other popover does: the panel is 250px against a 30px button, and the mockup
-(`1409:1552`) hangs it above the row as a whole. The designed standalone window in that node (title bar,
-lobby-type tabs, ornate footer) is **not ported** — `LobbyPopover` only closes the panel's open
-top/bottom edges.
+button, which every other popover does: the window is 250px against a 30px button, and the mockup
+(`1409:1552`) hangs it above the row as a whole. The window now paints all four of its own edges
+(title-bar and footer textures top and bottom, the panel's borders left and right), so `LobbyPopover`
+contributes only position, backdrop and a `drop-shadow` that follows the textured silhouette.
+
+The button's own icon is still `icon-lobby-offline.png` unconditionally (`HUDMenu.tsx`); driving it
+from the lobby mode — the `icon-lobby-{public,private}` art is already on disk — is an open follow-up.
 
 ### State-driven art (pending)
 
diff --git a/docs/architecture/inventory-menu.md b/docs/architecture/inventory-menu.md
index f163937b..40ae3a6d 100644
--- a/docs/architecture/inventory-menu.md
+++ b/docs/architecture/inventory-menu.md
@@ -217,40 +217,12 @@ pure-logic coverage).
 - `AbilitiesView.tsx` — normal/super attack abilities. `ZoneView.tsx` — zone cards + lock status; each
   unlocked/current zone shows a button (**Restart** on the current zone, **Travel** otherwise) that emits
   `travelToZone(zoneId)` — the same `ZoneManager` path as the old `ZonesTab` (resets to the first battler).
-- `LobbyView.tsx` — exports **two** components: `LobbyPanel` (the panel alone) and `LobbyView`
-  (`TabFrame` + panel) for the tab. The HUD's lobby button mounts `LobbyPanel` directly via
-  `LobbyPopover.tsx` — the panel floating over the game, with no inventory window around it — so the
-  two surfaces cannot drift. **No shared state was needed for the second mounting point**: each mount
-  runs its own `useLobbyViewState`, whose every field arrives from the `lobbySnapshot` it requests on
-  mount. `LobbyPopover` supplies only the top/bottom edges the panel omits (inside the tab, the window
-  frame closes it); the designed standalone lobby window (title bar, lobby-type tabs, ornate footer —
-  Figma `1409:1552`) is **not** ported yet, deliberately. See
-  [expanded-hud.md](expanded-hud.md) §Lobby button. The tab itself (replaced the lobby `ComingSoonView`; it moved here from a
-  windowed-only dev panel, so it now works in every window mode). A **fixed-width column centered in
-  the tab area** (`LobbyLayout.ColumnWidth` 250 of the area's 964): `ROOM CODE` + its two sprite
-  `LobbyIconButton` readout controls (eye reveal toggle, clipboard copy), the green code, the live
-  member **list** (below), then **either** a full-width `LEAVE LOBBY` plate (in a lobby) **or** the
-  join-by-code input + `Join`/`Create lobby` (outside one), and the last `lobbyError` as a red status
-  line. **The centering is the design, not a default** — the tab area is ~4× the drawn width, and the
-  lobby is slated to move into its own narrower frame, so stretching it would have to be undone.
-  **Create/Join swap out instead of sitting there disabled**: the mock-ups only draw Leave because
-  they depict a joined lobby, and the two states share the one column. The code renders **masked** (`••••••`) until
-  the eye is clicked, and re-masks on every menu reopen because the tab remounts — an always-on-top overlay would otherwise keep the code on screen
-  through any screenshare. Copy stays enabled while masked (sending a friend the code never needs it
-  visible); both controls are disabled outside a lobby. **The readout must not reflow when toggled:**
-  a mask character is narrower than a letter in the pixel font, so `roomCodeCells(roomCode, revealed)`
-  models the readout as one cell per **real** character and `RoomCodeReadout` keeps that character in
-  the layout (`visibility: hidden`) with the dot painted over it. Masking the string instead would
-  shrink the readout and shove the two icon buttons sideways on every click. Consequence: the dot count
-  equals the code's length — not a leak worth avoiding, since every code is `RoomCodeText.Length` long. **Bus-only**: emits `ui_createLobby` /
-  `ui_joinLobby` / `ui_leaveLobby` and reads `lobbyCreated`/`lobbyJoined`/`lobbyLeft`/
-  `lobbyMembersChanged`/`lobbyError` via `useBus`, so `src/ui` keeps importing nothing from
-  `src/network` and never touches the auth layer. On mount it emits `lobbySnapshotRequest` and renders
-  the `lobbySnapshot` reply — the tab remounts on every menu open, long after the one-shot
-  `lobbyCreated`/`lobbyJoined` fired, and `lobbyJoined` carries no room code. The EOS-session gate,
-  the bridge, and `lobbyBridge.start()` all live at app level (`app/hooks/lobbyCommands.ts` +
-  `useLobbyCommands.ts`) — see [networking.md → Lobby](networking.md#lobby-implemented) and
-  [lobby-create-join.md](../flows/lobby-create-join.md).
+- **The LOBBY tab is gone.** The lobby moved out of this window into its own — `HUD/lobby/`, floated
+  by the HUD button row — once the design gave it a title bar and a public/private/offline mode
+  header of its own. Five tabs remain, and the two that followed LOBBY moved up one slot rather than
+  leaving a hole (`InventoryLayout.Tabs`; the tabs are free-standing sprites over the window art, not
+  wells painted into it). See [lobby-window.md](lobby-window.md) and
+  [expanded-hud.md](expanded-hud.md) §Lobby button.
 - `LobbyMemberList.tsx` + `lobbyMemberRows.ts` + `lobbyTheme.ts` + `lobbyAssets.ts` +
   `LobbyButton.tsx` — the **member list and chrome, ported 1:1 from Figma node `1413:3678`
   ("Lobby Window")**. The chrome is **exported PNG sprites, not CSS**: `lobbyAssets.ts` maps
@@ -268,8 +240,8 @@ pure-logic coverage).
     reshuffle the guests.
   - **The width arithmetic is load-bearing:** `ColumnWidth 250 − 2×PanelBorder 4 − 2×PanelPaddingX 12 =
     ContentWidth 218 = RowWidth 214 + ScrollbarWidth 4`. The plate must be drawn at its native 214px
-    or the baked-in belt blurs, which is why the shared `.inv-scroll` bar is pinned to 4px here via
-    `invScrollWidth` rather than taking its 8px default.
+    or the baked-in belt blurs, which is why the shared `.hud-scroll` bar is pinned to 4px here via
+    `hudScrollWidth` rather than taking its 8px default.
   - `LobbyButton.tsx` holds the two **three-sliced** sprite buttons — fixed 5×30 end caps either side
     of a tiled body — so they stretch without smearing the pixel art: `LobbyButton` (orange Leave
     plate, whose left/right caps are *distinct exports*, not one mirrored) and `LobbyIconButton`
@@ -313,9 +285,10 @@ pure-logic coverage).
     `LobbyLayout` geometry and `LobbyHeadingStyle` — the single uppercase-heading style the section
     labels, the `MEMBERS` header and the button plate's label share. **Deliberately not folded into
     `InvTheme`**: none of those colours appear elsewhere in the window, and the lobby's chrome must be
-    able to drift when it moves to its own frame without dragging the rest of the menu along. Values
+    able to drift now that it has its own frame without dragging the rest of the menu along. Values
     are Figma variables from node `1413:3678`. It carries **no** scrollbar colours — the list wears
-    the shared `.inv-scroll` bar, narrowed via `invScrollWidth`.
+    the shared `.hud-scroll` bar, narrowed via `hudScrollWidth` — and **no** font families: those are
+    app-wide faces and come from `HUD/hudFonts`, which `InvTheme` reads too.
 - `SettingsView.tsx` — display / account / debug sections (carries the give-all-items + fake-player +
   jump-to-battle debug controls). The Display scale slider is **disabled + dimmed unless "Custom scale"
   is on**: with custom scale off, `useAutoScaleByMonitor` periodically overrides the value back to the
@@ -323,8 +296,7 @@ pure-logic coverage).
   placeholder now (Lobby is implemented).
 - `TabScaffold.tsx` — shared tab primitives (`TabFrame`, `Card`, `Btn`, `Toggle`, `TextStyles`).
   `Btn` takes an optional `disabled` (dimmed + `cursor:not-allowed`, same treatment as the Settings
-  scale slider); the Lobby tab no longer needs it, since Create/Join and Leave now **swap out**
-  rather than sit there greyed.
+  scale slider).
   Button icons are **per-view assets, with no shared icon set.** The lobby port replaced the only
   icon-button consumer in the menu with sprite buttons (`LobbyAsset.iconEye`/`iconClipboard` over
   `LobbyIconButton`), which left *two* things unreferenced — both deleted rather than kept "for later":
@@ -367,10 +339,11 @@ pure-logic coverage).
     silently mis-sorts the other two. Unifying means moving the order beside the `Rarity` union in
     `shared/`; deliberately deferred, since that crosses a workspace whose `dist/` is gitignored (see
     `lessons-learned/nodenext-exports-dist-gitignored-breaks-ci.md`).
-- `scrollbar.ts` + `scrollbar.css` — `InvScrollClass` (`.inv-scroll`) and `invScrollWidth(px)`. **Every
-  scrollable area in the window wears the one class** (see §Scrollbar).
+- The scrollbar is **not** here — it moved to `HUD/hudScrollbar.ts` + `.css` (see §Scrollbar).
+- `theme.ts` — `InvTheme`'s colours. Its three font families are re-exported from `HUD/hudFonts` so this
+  window and the lobby window cannot declare the same face twice.
 - `assets.ts` — `InvAsset` chrome-sprite URLs (only UI chrome; item/character art comes from the catalog).
-- `constants.ts` — `InventoryLayout` geometry, `FitScale`, and `InventoryFeatures` (feature gates: `UnequipEnabled` + `AlwaysUnequippableSlots` + `canUnequipSlot(slot)` helper).
+- `constants.ts` — `InventoryLayout` geometry, `FitScale`, and `InventoryFeatures` (feature gates: `UnequipEnabled` + `AlwaysUnequippableSlots` + `canUnequipSlot(slot)` helper). Tab left-offsets are **derived**, `tabLeft(index) = TabStartX + index * TabStride`, never stored per tab: removing the LOBBY tab from the middle of the strip otherwise meant hand-editing every literal after it.
 
 ## Loot reveal window (HUD star button)
 
@@ -453,9 +426,9 @@ monitor-centered + draggable exactly like `InventoryWindow` — literally the sa
   drops the batch from `PendingLootManager`'s
   ledger. No `useUiCommandHandlers` bridge — `PendingLootManager.wire()` subscribes to `ui_revealLoot`
   directly. Esc closes.
-- **Scrollbar:** the grid viewport wears the module-wide `InvScrollClass` (see §Scrollbar), pinning its
-  width to `ScrollWpx` via `invScrollWidth` since that term is part of the content column's arithmetic.
-  It used to inject its own scoped `<style>` tag per instance; that was folded into `support/scrollbar.css`.
+- **Scrollbar:** the grid viewport wears the HUD-wide `HudScrollClass` (see §Scrollbar), pinning its
+  width to `ScrollWpx` via `hudScrollWidth` since that term is part of the content column's arithmetic.
+  It used to inject its own scoped `<style>` tag per instance; that was folded into `HUD/hudScrollbar.css`.
 - **Server-authoritative model (data layer):** the server has already rolled and awarded/claimed the
   loot (`POST /loot/award`/`/loot/claim`) by the time the client sees it — `applyServerDrops` is the
   sole inventory ingress. The reveal ledger (`loot_reveal_{characterId}`) is purely cosmetic; losing it
@@ -662,10 +635,16 @@ Everything the bag displays therefore runs on **`revealedQuantities(held, unreve
 
 ## Scrollbar
 
-One class, `InvScrollClass` (`.inv-scroll`, `support/scrollbar.css`), on **every** scrollable area in the
-window: the bag grid, the loot-reveal grid, the category dropdown, the lobby member list and each tab's
-body. Five of those six used the **browser default** before — a single styled scrollbar in one window and
-OS chrome in the other five is worse than none, so this is deliberately module-wide rather than per-screen.
+**It lives at HUD level, not here:** `HudScrollClass` (`.hud-scroll`, `HUD/hudScrollbar.ts` + `.css`), on
+**every** scrollable area in every HUD window — the bag grid, the loot-reveal grid, the category dropdown,
+each tab's body, and the lobby window's member list. Five of those used the **browser default** before — a
+single styled scrollbar in one window and OS chrome in the rest is worse than none, so this is deliberately
+shared rather than per-screen.
+
+It was `inventory/support/scrollbar.ts` until the lobby became its own window: owning it here meant a
+sibling module had to import *this window's facade* for a widget with nothing to do with inventory, and the
+`Inv*` prefix taught every reader the bar belonged to the inventory — which is how a third consumer ends up
+copying it instead of importing it. The name change is the point of the move, not incidental to it.
 
 - **CSS, not inline styles** — `::-webkit-scrollbar*` is unreachable from a style object. The loot grid used
   to inject its own `<style>` tag per instance; that was folded into this stylesheet, and its
@@ -675,12 +654,13 @@ OS chrome in the other five is worse than none, so this is deliberately module-w
 - **Thumb is `InvTheme.tanDim`, not `gold`.** Tan is the panel-frame colour, so the bar sits in the chrome
   instead of competing with the active tab; hover lifts it to gold, the one place in this UI where gold
   means "you are touching this".
-- **Width comes from a `--inv-scroll-w` custom property** (default 8px) so a consumer whose layout
-  arithmetic depends on it can override just that: the loot grid pins 4px via `invScrollWidth(L.ScrollWpx)`
+- **Width comes from a `--hud-scroll-w` custom property** (default 8px) so a consumer whose layout
+  arithmetic depends on it can override just that: the loot grid pins 4px via `hudScrollWidth(L.ScrollWpx)`
   because its content column must still sum to the Figma frame's `ContentWpx` (asserted in
-  `lootRevealArt.test.ts`). A custom property rather than a second class keeps the look defined once.
-- Side-effect CSS import (from `scrollbar.ts`, so importing the class name pulls the stylesheet); needs the
-  jest `\.css$` → `styleStub.ts` mapping, already configured.
+  `lootRevealArt.test.ts`), and the lobby member list pins 4px to keep its row plate at a native 214px.
+  A custom property rather than a second class keeps the look defined once.
+- Side-effect CSS import (from `hudScrollbar.ts`, so importing the class name pulls the stylesheet); needs
+  the jest `\.css$` → `styleStub.ts` mapping, already configured.
 
 ## Overlay open/close — one state machine in `HUD/useHudOverlays.ts`
 
@@ -749,10 +729,10 @@ Rationale for the placements recorded in
   UI can *pull*. Regression test: `ZoneManager.test.ts` "carries the character's name and class".
 - **A tab must not own a process-wide listener's lifecycle.** Tab views mount/unmount with the menu, so
   anything they `start()` in an effect dies on close. `lobbyBridge.start()` therefore lives in
-  `useLobbyCommands` at app level; the Lobby tab only emits and listens. Any future tab talking to a
+  `useLobbyCommands` at app level; the lobby window only emits and listens. Any future tab talking to a
   singleton follows the same split.
-- **A tab that mounts late must ask for a snapshot, never assume it saw the one-shot event.** `LobbyView`
-  (`lobbySnapshotRequest`) and `SettingsView`'s `DebugSection` (`uiSnapshotRequest`) both do this.
+- **A view that mounts late must ask for a snapshot, never assume it saw the one-shot event.** The lobby
+  window (`lobbySnapshotRequest`) and `SettingsView`'s `DebugSection` (`uiSnapshotRequest`) both do this.
 - **Loot sync is deferred to collect time:** `PendingDrop` retains the awarding `tokenId`/`zoneId` so the
   per-token `LootSeed` computed at collect time still matches the server; awarding enqueues nothing.
 - **`inventoryListChanged` carries a fresh `Map`, not the live `this.items`:** the manager mutates its
@@ -834,9 +814,10 @@ Rationale for the placements recorded in
    points at the `uiSnapshotRequest` re-publish instead.
    `npm run test:jest -- src/__tests__/SeenItemsManager.test.ts src/__tests__/newItemIds.test.ts`.
 
-6. Lobby tab inert / stuck on `—` → see the
+6. Lobby window inert / stuck on `—` → see the
    [lobby flow's symptom table](../flows/lobby-create-join.md#where-to-look-when-it-breaks); the
-   commands are wired in `App.tsx` (`useLobbyCommands`), not in the menu.
+   commands are wired in `App.tsx` (`useLobbyCommands`), and the window no longer lives in this menu
+   at all — it is `HUD/lobby/`, opened from the HUD button row.
 
 Focused tests: `npm run test:jest -- src/__tests__/resolveLocalIdentityFromJoinEvent.test.ts src/__tests__/resolveLocalEquippedFromGearEvent.test.ts src/__tests__/inventoryGridItems.test.ts src/__tests__/inventoryDnd.test.ts src/__tests__/itemTooltipFormat.test.ts src/__tests__/inventoryFitScale.test.ts src/__tests__/lobbyCommands.test.ts src/__tests__/wearability.test.ts src/__tests__/lootEquipIntent.test.ts src/__tests__/newItemIds.test.ts src/__tests__/SeenItemsManager.test.ts src/__tests__/rarityRank.test.ts`
 — pure logic is unit-tested (`orderGridIds` equip-filtering + rarity-desc/name/id ordering + content-only determinism, plus `rarityRank.test.ts` guarding `RARITY_ORDER`'s completeness; `toGridItems` `equippedInSlot`; `slotAcceptsDrag` + drag-state round-trip; `formatModifier` + `compareModifiers`).
diff --git a/docs/architecture/lobby-window.md b/docs/architecture/lobby-window.md
new file mode 100644
index 00000000..0896dac8
--- /dev/null
+++ b/docs/architecture/lobby-window.md
@@ -0,0 +1,181 @@
+# Lobby window & lobby mode
+
+Canonical design for the lobby's own window (`src/ui/components/HUD/lobby/`) and for the
+public/private/offline **mode** that its header both displays and controls.
+
+Behaviour walkthroughs live in [flows/lobby-create-join.md](../flows/lobby-create-join.md); the EOS
+plumbing under it is in [networking.md → Lobby](networking.md).
+
+---
+
+## The one idea
+
+**The header is the whole control surface.** There is no "Create lobby" button and no host-side
+"Leave lobby" button. Three tabs — `public`, `private`, `offline` — emit one command, and *which*
+operation that means is decided from the mode the client is already in:
+
+| current mode | tab pressed | operation |
+|---|---|---|
+| `offline` | `public` / `private` | **create** a lobby carrying that mode |
+| `public` / `private` | the other one | **re-label** the existing lobby (same room code, same members) |
+| `public` / `private` | the SAME one | **nothing** — see below |
+| any (incl. `offline`) | `offline` | **leave** |
+
+The table is the pure `lobbyModeCommand(current, target)` in `app/hooks/lobbyCommands.ts`
+(unit-tested in `lobbyCommands.test.ts`); the view only ever says which tab was pressed.
+
+**Why the two degenerate rows differ.** Re-clicking the active *lobby* mode is swallowed: it would
+otherwise cost a backend `UpdateLobby` plus a `LobbyUpdateReceived` fan-out that makes every other
+member re-read an attribute that did not change. Re-clicking `offline` is **not** swallowed, and must
+not be — the mode is a *label the client can hold wrongly*. If the `MODE` read fails on join,
+`LobbyModeTracker` keeps the value it had (`offline`) while the player is really in a lobby, so
+guarding that row would leave them with no way out. A redundant leave costs one rejected IPC; a
+swallowed one strands the player.
+
+`offline` is not stored anywhere. It is the *absence* of a lobby, which is why leaving and never
+having joined are indistinguishable downstream.
+
+## Mode is an attribute, not a permission level
+
+`public` and `private` behave identically today and are the two values of a public EOS lobby
+attribute `MODE`, written beside the existing `CODE`.
+
+They are **not** `EOS_ELobbyPermissionLevel`. Joining is implemented as a lobby *search* over `CODE`
+(`src-tauri/src/eos/lobby/join.rs`), so a lobby that stopped being `PUBLICADVERTISED` would stop
+being joinable by its own room code. Every lobby is created `PUBLICADVERTISED` regardless of mode.
+
+> **Consequence worth knowing before building on this:** "private" is a label every member can read,
+> not an access restriction. Hiding a lobby from discovery would need the permission level set at
+> creation time, and that would have to arrive together with a different join path.
+
+A lobby with **no** `MODE` attribute (created by a build older than this feature) reads as
+**private** — see `UnlabelledLobbyMode` in `LobbyModeTracker.ts`. Understating how open a room is,
+is the harmless direction.
+
+## Data flow, end to end
+
+```
+host clicks a tab
+  LobbyModeTabs.tsx  → bus ui_setLobbyMode(mode)
+  lobbyCommands.ts   → routes create / setMode / leave (EOS-session gate on the first two)
+  EosLobbyBridge     → port.createLobby(code, mode) | port.setLobbyMode(mode)
+  TauriLobbyPort     → invoke eos_create_lobby / eos_set_lobby_mode
+  eos/mod.rs         → EosRequest::CreateLobby{code,mode} | SetLobbyMode
+  lobby/modify.rs    → UpdateLobbyModification → AddAttribute(MODE) → UpdateLobby
+
+EOS notifies every member (including the host)
+  lobby/notify.rs    → register_lobby_update_notify → LobbyUpdate{lobby_id}
+  thread.rs          → emit_lobby_updates → Tauri event `eos_lobby_updated`
+  TauriLobbyPort     → onLobbyUpdated
+  LobbyModeTracker   → filters by lobbyId → port.getLobbyMode() → EOS_LobbyDetails_CopyAttributeByKey
+                     → bus lobbyModeChanged(mode)   [only if it actually changed]
+  lobbyCommands.ts   → lobbyModeChanged is a SNAPSHOT_TRIGGER → re-publishes lobbySnapshot
+  LobbyPanel         → useLobbyViewState re-renders; LobbyWindow retitles
+```
+
+The guest path is the same minus the write: `join()` pulls `MODE` once, then the notify keeps it
+fresh. **Without the notify a guest would keep the label it read at join time forever** — nothing
+else fires when a lobby's own data changes.
+
+## Files by responsibility
+
+### Rust (`src-tauri/src/eos/lobby/`)
+
+| File | Responsibility |
+|---|---|
+| `mod.rs` | Facade; owns `ROOM_CODE_KEY`/`MODE_KEY` and the `LobbyHandle` / `LobbyRef` / `LobbySetup` bundles |
+| `modify.rs` | `add_string_attribute` + `modify_lobby` — every lobby write. `begin_modification`/`submit_update` are **private to this file**: handing a raw `EOS_HLobbyModification` outside would let a caller skip the `Release` that `modify_lobby` owns. Extracted from `create.rs` once mode gained a post-creation writer |
+| `details.rs` | `copy_details_handle` + `read_string_attribute` — every lobby read |
+| `mode.rs` | `set_lobby_mode` / `get_lobby_mode`, and the rationale above |
+| `create.rs` | `CreateLobby`, then `CODE` **and** `MODE` in **one** modification |
+| `notify.rs` | Both notifies: member-status and lobby-update (`LOBBY_UPDATED_EVENT`) |
+| `thread.rs` (parent) | `EosRequest::{CreateLobby, SetLobbyMode, GetLobbyMode}`, `lobby_ref()`, `emit_lobby_updates` |
+| `eos/mod.rs` (parent) | Commands `eos_create_lobby(code, mode)`, `eos_set_lobby_mode`, `eos_get_lobby_mode` |
+
+**Two bundles, split by whether a lobby exists yet.** `LobbyHandle { lobby, local }` is who is acting
+and through which interface; `LobbyRef { handle, lobby_id }` names a lobby the local user is already
+in and is what every read (`details`, `members`, `mode`) and every write (`modify`, `leave`) takes —
+a real concept, not a parameter-count dodge. The two operations with no lobby to name yet,
+`create_lobby` and `join_lobby`, take the bare handle, which is what keeps *them* at three parameters
+too; `handle.in_lobby(id)` promotes one to the other the moment an id exists (`create.rs` uses that
+to hand its rollback `leave_lobby` the same `LobbyRef` it just built).
+
+### TypeScript
+
+| File | Responsibility |
+|---|---|
+| `network/lobby/LobbyPort.ts` | IPC seam: `createLobby(code, mode)`, `setLobbyMode`, `getLobbyMode`, `onLobbyUpdated` |
+| `network/lobby/LobbyModeTracker.ts` | The mode's whole lifecycle: local copy, read-back, update subscription, `toLobbyMode` narrowing. Split out of the bridge because none of it touches the roster or the host-loss fallback |
+| `network/lobby/EosLobbyBridge.ts` | `create(mode)`, `setMode(mode)` (rejects for a guest), `getMode()`; wires the tracker's subscription into `start()`/`stop()` |
+| `app/hooks/lobbyCommands.ts` | The routing table above; adds `lobbyModeChanged` to `SNAPSHOT_TRIGGERS` |
+| `bus/bus.ts` | `LobbyMode` type, `lobbySnapshot.mode`, `lobbyModeChanged`, `ui_setLobbyMode` |
+| `ui/.../lobby/lobbyMode.ts` | Pure: `lobbyTitle`, the `LobbyModeTabs` table, `isLobbyHost`, `lobbyRole` |
+| `ui/.../lobby/LobbyModeTabs.tsx` | The three sprite tabs + the host crown. A guest never reaches it — the window omits the whole header |
+| `ui/.../lobby/LobbyWindow.tsx` | Title bar + header + panel + footer; computes `lobbyRole(state)` once |
+| `ui/.../lobby/LobbyPanel.tsx` | Body: join row when offline, else room code + members (+ Leave for a guest) |
+| `ui/.../lobby/LobbyPopover.tsx` | Anchoring, backdrop and shadow only — the window paints its own edges |
+| `ui/.../lobby/spritePlate.ts` | The three-slice plate (`PlateCap`/`PlateCapMirrored`/`plateBodyStyle`) every button and tab is built from, so the Figma cap width and the native-tile-width rule are asserted once |
+| `ui/.../lobby/lobbyTheme.ts` | The lobby's own **colours** + geometry + `LobbyPanelColumn` (the body column the panel and the mode header share, so the window's side borders cannot seam). Font families come from `HUD/hudFonts` |
+
+## Host / guest / offline: what renders
+
+| | title | mode tabs | room code + members | Leave button | join-by-code |
+|---|---|---|---|---|---|
+| offline | `LOBBY (OFFLINE)` | yes, `offline` active | — | — | yes |
+| host | `PUBLIC`/`PRIVATE LOBBY` | yes, crown over the active one | yes | — (the `offline` tab is the leave) | — |
+| guest | `PUBLIC`/`PRIVATE LOBBY` | **none** | yes | yes | — |
+
+**One derivation drives that whole matrix: `lobbyRole(state)` → `"host" | "guest" | "offline"`**
+(pure, in `lobbyMode.ts`, beside `isLobbyHost`). `LobbyWindow` computes it once for the header and
+`LobbyPanel` re-derives it from the same `state` — neither takes a role flag as a prop. Two
+independently-passed booleans were the earlier shape and are what let a caller hand a guest both the
+tabs *and* no Leave button; the matrix is spread over three components, so it needs one definition.
+
+Host-ness is derived from the two PUIDs the snapshot already carries — `EosLobbyBridge` deliberately
+never answers "am I the host" (see its `joinedAsGuest` comment), and `isLobbyHost` returns false when
+either PUID is null so that two nulls outside a lobby cannot compare equal into a false yes. The role
+is deliberately **not** put on the bus: it would be a second source of truth for what those two PUIDs
+already determine.
+
+## Invariants
+
+1. **One modification, both attributes.** A lobby advertising `CODE` but not `MODE` would be
+   joinable yet untitled; `create.rs` writes them together and leaves the lobby if either fails.
+2. **`lobbyModeChanged` fires only on an actual change.** The host's own write comes back as a
+   lobby-update notification, so an unconditional emit would republish the snapshot twice per click.
+3. **Lobby-update events are filtered by `lobbyId`.** The EOS notify is process-wide, exactly like
+   the member-status one.
+4. **A failed mode read keeps the previous label.** A stale title beats a window claiming to be
+   offline while the player is still in a room.
+5. **`setMode` is refused locally for a guest.** EOS would reject it anyway; failing here makes a
+   wiring bug loud (`lobbyError`) instead of silent.
+6. **The mode tabs are the only lobby control.** If you add a second way to create or leave, the
+   routing in `lobbyCommands.ts` stops being the single place that decides what a tab means.
+7. **The `offline` tab is never guarded as a no-op.** It is the only way out, and the client's idea
+   of its own mode can be wrong (invariant 4 is exactly that case). See `lobbyModeCommand`.
+8. **The local player's role has one definition.** `lobbyRole(state)` in the pure `lobbyMode.ts` — no
+   component takes an `isHost`/`isGuest` flag as a prop, so the render matrix cannot disagree with
+   itself across the three components that implement it.
+
+## Debug playbook
+
+| Symptom | Check |
+|---|---|
+| Title always reads `LOBBY (OFFLINE)` in a lobby | `lobbySnapshot.mode` — is `lobbyModeChanged` in `SNAPSHOT_TRIGGERS`? Is `wireLobbyCommands` mounted? |
+| Guest's title never follows the host's switch | `register_lobby_update_notify` at thread start, `emit_lobby_updates` in `run_event_loop`, and `LobbyModeTracker.watch()` inside `bridge.start()` |
+| Every lobby reads `PRIVATE LOBBY` | `getLobbyMode` is returning `null` — the `MODE` attribute never got written (check `create.rs`'s single modification) |
+| Switching modes drops the room code or the members | `setMode` must go through `modify_lobby`, never through create-then-leave |
+| `only the host can change the lobby mode` in the error line | a guest reached `setMode` — the header should not have rendered at all; check `lobbyRole(state)` in `LobbyWindow` |
+| Mode tabs visible to a guest | `lobbyRole` returned `host`/`offline`: `isLobbyHost` got two nulls, or `mode` is still `offline` on a client that has joined |
+| The `offline` tab does nothing | it must always route to `leave` — check `lobbyModeCommand` still exempts it from the same-mode guard |
+| Tab plates look smeared | the body sprite is being tiled at the wrong slice width — see `fillIdleWidth` in `lobbyMode.ts` (green is 5px, brown 3px) |
+
+## Focused tests
+
+```bash
+npm run test:jest -- src/__tests__/lobbyMode.test.ts src/__tests__/lobbyCommands.test.ts src/__tests__/EosLobbyBridge.test.ts
+```
+
+```bash
+cargo test --manifest-path src-tauri/Cargo.toml lobby
+```
diff --git a/docs/architecture/networking.md b/docs/architecture/networking.md
index f3c67783..05ba6352 100644
--- a/docs/architecture/networking.md
+++ b/docs/architecture/networking.md
@@ -224,25 +224,27 @@ These two commands are now wrapped by `RelayClient implements Transport` (see [R
 
 Real EOS Lobby management via the raw Lobby Interface FFI (`eos-rs` v0.1.1 exposes no typed wrapper). Room codes are the join mechanism: the creator's client mints a short `RoomCode`, advertised as the public `CODE` lobby attribute; a joiner types it back and a lobby search resolves it. All lobby FFI runs **only** on the EOS thread that owns `Platform`.
 
-**Data flow (create):** `EosLobbyBridge.create()` → `RoomCode.generate()` → `eos_create_lobby(code)` → `EosThread` `CreateLobby` req → `lobby::create_lobby` (`EOS_Lobby_CreateLobby` with `bucketId="typelords:mvp"`, `PUBLICADVERTISED`, `bEnableJoinById` → then `UpdateLobbyModification`+`AddAttribute(CODE)`+`UpdateLobby` to advertise the code) → returns lobby id → bridge refreshes members → `lobbyCreated` bus event.
+**Data flow (create):** `EosLobbyBridge.create(mode)` → `RoomCode.generate()` → `eos_create_lobby(code, mode)` → `EosThread` `CreateLobby` req → `lobby::create_lobby` (`EOS_Lobby_CreateLobby` with `bucketId="typelords:mvp"`, `PUBLICADVERTISED`, `bEnableJoinById` → then one `UpdateLobbyModification`+`AddAttribute(CODE)`+`AddAttribute(MODE)`+`UpdateLobby` to advertise both) → returns lobby id → bridge refreshes members → `lobbyCreated` bus event.
 
-**Data flow (join):** `EosLobbyBridge.join(code)` → `eos_join_lobby` → `lobby::join_lobby` (`CreateLobbySearch` + `SetParameter(CODE == code, EQUAL)` + `Find` → `CopySearchResultByIndex(0)` → `JoinLobby`) → lobby id → refresh members → `lobbyJoined`.
+**Data flow (join):** `EosLobbyBridge.join(code)` → `eos_join_lobby` → `lobby::join_lobby` (`CreateLobbySearch` + `SetParameter(CODE == code, EQUAL)` + `Find` → `CopySearchResultByIndex(0)` → `JoinLobby`) → lobby id → read `MODE` → refresh members → `lobbyJoined`.
 
 **Membership:** `eos_get_lobby_members` → `CopyLobbyDetailsHandle` + `GetMemberCount`/`GetMemberByIndex`. Live changes: `EOS_Lobby_AddNotifyLobbyMemberStatusReceived` (registered once at thread start) pushes `MemberChange` onto a channel the event loop drains → `eos_lobby_member_changed` Tauri event → `TauriLobbyPort.onMemberChanged` → `EosLobbyBridge.refreshMembers()` → `LobbyManager.setMembers()` + `lobbyMembersChanged`. The bridge also uses each change to run its **host-loss watchdog** (see *Party teardown* below), so it inspects the payload's `status` rather than discarding it.
 
 **Async-op pattern:** each async lobby call (create/update/find/join/leave) boxes an `OpCtx { Sender<LoginOutcome> }` as `ClientData`, then reuses `platform::pump_until_outcome` (ticks until the callback resolves) — the same pattern as login. The member-status notify's `Sender` is intentionally leaked (lives for the process) since the notify is registered once and never removed.
 
-**UI (implemented):** the **Lobby tab of the inventory window** (`inventory/views/LobbyView.tsx`) — room code (masked behind an eye toggle, with a clipboard copy) + create/leave, join-by-code, live member **list**, last error. Available in **every** window mode (it replaced a windowed-only dev panel). It is **bus-only** and imports no network code: it emits `ui_createLobby`/`ui_joinLobby`/`ui_leaveLobby` and reads back `lobbyCreated`/`lobbyJoined`/`lobbyLeft`/`lobbyMembersChanged`/`lobbyError`. The app layer owns the rest:
+**Lobby mode (`public` / `private` / `offline`)** is a second public attribute, `MODE`, written beside `CODE` and mutable by the owner afterwards; live changes ride `EOS_Lobby_AddNotifyLobbyUpdateReceived` → `eos_lobby_updated`. It is deliberately **not** `EOS_ELobbyPermissionLevel` — join is a search over `CODE`, so a lobby that stopped being `PUBLICADVERTISED` would stop being joinable by its own room code. Full design in [lobby-window.md](lobby-window.md).
 
-- **The member list** (`views/LobbyMemberList.tsx` + the pure `views/lobbyMemberRows.ts`) is host-crown / class icon / player name per row, with `MEMBERS N/4` above it (`LobbyCapacity.MaxMembers` mirrors `MAX_LOBBY_MEMBERS`; unclamped, so a debug fake party reads `5/4`). It joins **two disjoint sources by `PeerId`**: the EOS lobby says who is in the room, the battle schema says who they are. A member EOS has admitted but the party has not yet accepted renders as a dimmed placeholder — rows are driven by the lobby list, never the party, so the count cannot disagree with the header. The party side comes from `usePartyRoster()` (`src/ui/hooks/`), which **must** be called from the always-mounted `useHUDMenuData` and passed down as a prop: `playerJoined` fires at battle start, long before the menu is opened. Being always mounted is also why that roster holds **identity only** — folding in the per-tick `playerHpChanged` would rebuild its Map on every hit for a field no row draws. See [flow](../flows/lobby-create-join.md#sequence--the-member-list-crown--class-icon--name).
+**UI (implemented):** the **lobby window** (`HUD/lobby/`, floated by the HUD's lobby button) — a mode-titled title bar over the host-only mode tabs, room code (masked behind an eye toggle, with a clipboard copy), live member **list**, join-by-code when offline, a guest's Leave button, last error. Available in **every** window mode, and the only lobby surface (the inventory LOBBY tab was removed). It is **bus-only** and imports no network code: it emits `ui_setLobbyMode`/`ui_joinLobby`/`ui_leaveLobby` and reads back `lobbyCreated`/`lobbyJoined`/`lobbyLeft`/`lobbyMembersChanged`/`lobbyModeChanged`/`lobbyError`. The app layer owns the rest:
+
+- **The member list** (`lobby/LobbyMemberList.tsx` + the pure `lobby/lobbyMemberRows.ts`) is host-crown / class icon / player name per row, with `MEMBERS N/4` above it (`LobbyCapacity.MaxMembers` mirrors `MAX_LOBBY_MEMBERS`; unclamped, so a debug fake party reads `5/4`). It joins **two disjoint sources by `PeerId`**: the EOS lobby says who is in the room, the battle schema says who they are. A member EOS has admitted but the party has not yet accepted renders as a dimmed placeholder — rows are driven by the lobby list, never the party, so the count cannot disagree with the header. The party side comes from `usePartyRoster()` (`src/ui/hooks/`), which **must** be called from the always-mounted `useHUDMenuData` and passed down as a prop: `playerJoined` fires at battle start, long before the menu is opened. Being always mounted is also why that roster holds **identity only** — folding in the per-tick `playerHpChanged` would rebuild its Map on every hit for a field no row draws. See [flow](../flows/lobby-create-join.md#sequence--the-member-list-crown--class-icon--name).
 - **`EosLobbyBridge` splits the owner id from the role.** `ownerPuid` (`getOwnerPuid()`) is sampled from `eos_get_lobby_owner` on **both** create and join, so it is always set and is what the crown reads; null means "no lobby" or "EOS refused to name the owner", never "I am the host". The separate `joinedAsGuest` boolean is what the host-loss watchdog guards on — deriving that role from a null id instead would arm `handleHostLost` for a host and make the first guest departure a self-eject. A failed owner query costs the crown and (for a guest) the watchdog; the list is otherwise complete.
 
-- **`wireLobbyCommands`** (`src/app/hooks/lobbyCommands.ts`) maps those commands onto `lobbyBridge`, gating create/join on `authManager.ensureEosSession()` (the per-process EOS-session gate — see [flow step 0](../flows/lobby-create-join.md)) and reporting a missing session / blank code as `lobbyError`. `network/lobby` must not import the auth layer and `src/ui` must not import either, so this seam is the only place all three meet.
-- **`useLobbyCommands`** (`src/app/hooks/useLobbyCommands.ts`, called from `App.tsx`) owns `lobbyBridge.start()`/`stop()` for the whole session. **This must not live in the tab:** `start()` subscribes to `eos_lobby_member_changed`, so a view owning it silently stops refreshing the roster whenever it unmounts (the old dev panel had exactly that flaw).
-- **`lobbySnapshotRequest` → `lobbySnapshot { roomCode, members, hostPuid, localPuid }`** rehydrates the tab: it remounts on every menu open, long after the one-shot `lobbyCreated`/`lobbyJoined` fired, and `lobbyJoined` carries no room code. Same pattern as `uiSnapshotRequest`/`zonesSnapshotRequest`. The two PUIDs ride this event alone (`lobbyMembersChanged` stays a bare `string[]` — three non-UI consumers depend on that shape). `wireLobbyCommands` therefore **republishes the snapshot itself** on `lobbyCreated`/`lobbyJoined`/`lobbyLeft`: each of those is individually incomplete (create names the code but not the owner, join names neither, left nothing), so making it the publisher's job keeps every consumer from having to know which event obliges a re-request. `localPuid` is `authManager.getPuid()`, read per snapshot rather than captured, since the EOS login can land after the app booted.
-- Joining re-inits the game generation as a guest (`useGameRole`), which unmounts the menu mid-join; reopening it rehydrates from the snapshot.
+- **`wireLobbyCommands`** (`src/app/hooks/lobbyCommands.ts`) maps those commands onto `lobbyBridge`, gating create/join/set-mode on `authManager.ensureEosSession()` (the per-process EOS-session gate — see [flow step 0](../flows/lobby-create-join.md)) and reporting a missing session / blank code as `lobbyError`. It also **routes the one mode command** into create / re-label / leave from the mode the client is already in. `network/lobby` must not import the auth layer and `src/ui` must not import either, so this seam is the only place all three meet.
+- **`useLobbyCommands`** (`src/app/hooks/useLobbyCommands.ts`, called from `App.tsx`) owns `lobbyBridge.start()`/`stop()` for the whole session. **This must not live in a mountable view:** `start()` subscribes to `eos_lobby_member_changed` *and* `eos_lobby_updated`, so a view owning it silently stops refreshing the roster (and the mode) whenever it unmounts (the old dev panel had exactly that flaw).
+- **`lobbySnapshotRequest` → `lobbySnapshot { roomCode, members, hostPuid, localPuid, mode }`** rehydrates the window: it remounts on every open, long after the one-shot `lobbyCreated`/`lobbyJoined` fired, and `lobbyJoined` carries no room code. Same pattern as `uiSnapshotRequest`/`zonesSnapshotRequest`. The two PUIDs and the mode ride this event alone (`lobbyMembersChanged` stays a bare `string[]` — three non-UI consumers depend on that shape). `wireLobbyCommands` therefore **republishes the snapshot itself** on `lobbyCreated`/`lobbyJoined`/`lobbyLeft`/`lobbyModeChanged`: each of those is individually incomplete (create names the code but not the owner, join names neither, left nothing, a mode switch fires nothing else), so making it the publisher's job keeps every consumer from having to know which event obliges a re-request. `localPuid` is `authManager.getPuid()`, read per snapshot rather than captured, since the EOS login can land after the app booted.
+- Joining re-inits the game generation as a guest (`useGameRole`), which unmounts the HUD mid-join; reopening the window rehydrates from the snapshot.
 
-**Files:** `src-tauri/src/eos/lobby/` (FFI deep module — facade `mod.rs` re-exporting private `create`/`join`/`leave`/`members`/`notify`/`async_ops`/`attr` submodules), `thread.rs` (`EosSession` holds lobby handle + `current_lobby_id` + `member_receiver`; `CreateLobby`/`JoinLobby`/`LeaveLobby`/`GetLobbyMembers` requests), `platform.rs` (`lobby_handle()`), `mod.rs` (commands + generic `eos_await`). Client: `src/network/lobby/` + `LobbyManager`; UI/app seam: `inventory/views/LobbyView.tsx` + `LobbyMemberList.tsx` + `lobbyMemberRows.ts` + `lobbyTheme.ts` + `src/ui/hooks/usePartyRoster.ts` + `app/hooks/lobbyCommands.ts` + `app/hooks/useLobbyCommands.ts` (tested in `src/__tests__/lobbyCommands.test.ts`, `EosLobbyBridge.test.ts`, `lobbyMemberRows.test.ts`, `partyRoster.test.ts`).
+**Files:** `src-tauri/src/eos/lobby/` (FFI deep module — facade `mod.rs` re-exporting private `create`/`join`/`leave`/`members`/`mode`/`modify`/`details`/`notify`/`async_ops`/`attr` submodules), `thread.rs` (`EosSession` holds lobby handle + `current_lobby_id` + `member_receiver` + `lobby_update_receiver`; `CreateLobby`/`JoinLobby`/`LeaveLobby`/`GetLobbyMembers`/`SetLobbyMode`/`GetLobbyMode` requests), `platform.rs` (`lobby_handle()`), `mod.rs` (commands + generic `eos_await`). Client: `src/network/lobby/` (incl. `LobbyModeTracker`) + `LobbyManager`; UI/app seam: `HUD/lobby/` (`LobbyWindow` + `LobbyPanel` + `LobbyModeTabs` + the pure `lobbyMode.ts` + `LobbyMemberList` + `lobbyMemberRows` + `lobbyTheme`) + `src/ui/hooks/usePartyRoster.ts` + `app/hooks/lobbyCommands.ts` + `app/hooks/useLobbyCommands.ts` (tested in `src/__tests__/lobbyCommands.test.ts`, `EosLobbyBridge.test.ts`, `lobbyMode.test.ts`, `lobbyMemberRows.test.ts`, `partyRoster.test.ts`).
 
 ### Relay transport (real EOS P2P)
 
@@ -327,7 +329,7 @@ Quitting is announced in **both** directions, because `close_app` is `app.exit(0
 | guest | `registerGuestLeave` | `LeavePartyRpc` (`LEAVE_PARTY`, guest→host) | `useGameInit`'s `onGuestGeneration` → `GuestPartyClient.destroy()` |
 | host | `registerHostLeave` | `PartyClosedRpc` (`PARTY_CLOSED`, host→guests, **broadcast**) | `runHostGeneration` → `hostManager.broadcastRPC` |
 
-**Leaving without quitting — the `lobbyLeaving` window.** The table above covers the *quit* path only. Either side can press Lobby tab → Leave (`ui_leaveLobby`) and keep playing, and a guest can also be ejected by its own host-loss watchdog. All of those go through `EosLobbyBridge.leave()`, whose `finally` **shuts down routing before `lobbyLeft` is emitted**: `resetLocalLobbyState()` calls `lobbyRoster.setMembers([])`, and `lobbyRoster` is the very `LobbyManager` `NetworkInstances` hands `RelayClient` as its destination gate. An announce sent on `lobbyLeft` (or from the React teardown it triggers) resolves to no remote destination and is delivered to the sender itself — no error, no log.
+**Leaving without quitting — the `lobbyLeaving` window.** The table above covers the *quit* path only. Either side can leave the lobby — a guest via the window's Leave button, a host via its `offline` mode tab, both reaching `ui_leaveLobby` — and keep playing, and a guest can also be ejected by its own host-loss watchdog. All of those go through `EosLobbyBridge.leave()`, whose `finally` **shuts down routing before `lobbyLeft` is emitted**: `resetLocalLobbyState()` calls `lobbyRoster.setMembers([])`, and `lobbyRoster` is the very `LobbyManager` `NetworkInstances` hands `RelayClient` as its destination gate. An announce sent on `lobbyLeft` (or from the React teardown it triggers) resolves to no remote destination and is delivered to the sender itself — no error, no log.
 
 `leave()` therefore emits **`lobbyLeaving`** first, before the awaited EOS leave, and every departure announce hangs off it:
 
@@ -361,7 +363,7 @@ The handler emits `partyEnded` (HUD notice) then calls `leave()`, and **`lobbyLe
 
 ### What does NOT exist in Phase 1
 - EOS **invites** (`AddNotifyLobbyInviteReceived`) — not implemented; join is room-code-only
-- Lobby UI on the **load-failed screen** — the Lobby tab needs a ready game, so a lobby is not reachable when the auth/catalog gate fails (`DevPingPanel` still is, windowed only)
+- Lobby UI on the **load-failed screen** — the lobby window needs a ready game (it hangs off the HUD button row), so a lobby is not reachable when the auth/catalog gate fails (`DevPingPanel` still is, windowed only)
 
 ---
 
diff --git a/docs/flows/host-disconnect-fallback.md b/docs/flows/host-disconnect-fallback.md
index 1d58e7fd..b3abcfdf 100644
--- a/docs/flows/host-disconnect-fallback.md
+++ b/docs/flows/host-disconnect-fallback.md
@@ -8,7 +8,7 @@ Inverse of [guest-join-shared-battle.md](guest-join-shared-battle.md). Design +
 |---|---------|------|
 | A | Host clicks Settings → "Close game" (or Alt-F4 / taskbar close in `--windowed`) | graceful `PARTY_CLOSED` announce |
 | B | Host process killed, crashes, or loses network | EOS member-change watchdog |
-| C | Host presses Lobby tab → **Leave** and keeps playing | `HostPartyManager.disbandParty()` — `PARTY_CLOSED` broadcast **plus** a host-side eviction |
+| C | Host presses the lobby window's **offline** mode tab and keeps playing | `HostPartyManager.disbandParty()` — `PARTY_CLOSED` broadcast **plus** a host-side eviction |
 
 A–C all reach the guest through `handleHostLost()`. C additionally has a host side (below), because the host survives it.
 
@@ -46,7 +46,7 @@ Step 5 keys on **roster absence, not the status label** — EOS may report the o
 
 | # | Where | What |
 |---|-------|------|
-| 1 | `LobbyView` → `ui_leaveLobby` | `wireLobbyCommands.onLeave` (no session gate) → `bridge.leave()` |
+| 1 | lobby window → `ui_leaveLobby` (guest: the Leave button; host: the `offline` mode tab, routed by `onSetMode`) | `wireLobbyCommands.onLeave` (no session gate) → `bridge.leave()` |
 | 2 | `EosLobbyBridge.leave()` | emits `lobbyLeaving` **before** the awaited EOS leave — routing is still alive here and dead by step 4 |
 | 3 | `HostPartyManager.disbandParty` (on `lobbyLeaving`) | no-op if it accepted no guest; else `broadcastRPC(PartyClosedRpc)` **then** `solver.removePlayer` per `acceptedGuests` id |
 | 4 | `leave()`'s `finally` | `resetLocalLobbyState()` (empties `lobbyRoster`, the relay's destination gate) → emit `lobbyLeft` → emit `lobbyMembersChanged []` |
diff --git a/docs/flows/lobby-create-join.md b/docs/flows/lobby-create-join.md
index 770da200..cbb21653 100644
--- a/docs/flows/lobby-create-join.md
+++ b/docs/flows/lobby-create-join.md
@@ -1,29 +1,34 @@
-# Flow: Create / join a lobby (room code)
+# Flow: Create / join / re-label a lobby (room code + mode)
 
-**Trigger:** the player uses the lobby panel, reachable **two ways** — the **Lobby tab** of the
-inventory window (backpack / F9 → LOBBY), or the **lobby button** (leftmost) of the HUD button row,
-which floats the same panel on its own via `LobbyPopover` (see
-[expanded-hud.md](../architecture/expanded-hud.md) §Lobby button). Both are available in every window
-mode and run the identical sequence below — the popover is a different container around the same
-`LobbyPanel`, not a second implementation. Requires a real EOS login (a local PUID); the dev-token
-bypass has no PUID and errors.
+**Trigger:** the player uses the **lobby window**, opened by the **lobby button** (leftmost) of the
+HUD button row, which floats it via `LobbyPopover` (see
+[expanded-hud.md](../architecture/expanded-hud.md) §Lobby button). This is now the **only** lobby
+surface — the inventory window's LOBBY tab was removed when the window grew its own title bar and
+mode header. Requires a real EOS login (a local PUID); the dev-token bypass has no PUID and errors.
+
+**There is no "Create lobby" button.** Creating, re-labelling and leaving are all the three mode
+tabs in the header; see [architecture/lobby-window.md](../architecture/lobby-window.md) for the
+routing table and for why `private` is an attribute rather than an EOS permission level.
 
 ## Sequence — UI → bridge (shared prefix of every operation)
 
-1. **`LobbyPanel`** (`src/ui/components/HUD/inventory/views/LobbyView.tsx`) emits one of
-   `ui_createLobby` / `ui_joinLobby(rawCode)` / `ui_leaveLobby`. The view holds no network
-   reference — `src/ui` imports nothing from `src/network`.
+1. **`LobbyModeTabs`** (`src/ui/components/HUD/lobby/LobbyModeTabs.tsx`) emits
+   `ui_setLobbyMode(mode)`, or **`LobbyPanel`** (`.../lobby/LobbyPanel.tsx`) emits
+   `ui_joinLobby(rawCode)` / `ui_leaveLobby`. The views hold no network reference — `src/ui` imports
+   nothing from `src/network`.
 2. **`wireLobbyCommands`** (`src/app/hooks/lobbyCommands.ts`, installed for the session by
    `useLobbyCommands` from `App.tsx`) receives it, applies step 0, then calls the matching
-   `lobbyBridge` method. A blank join code fails fast as `lobbyError`.
-3. Read-back is bus-only: the panel renders `lobbyCreated` / `lobbyMembersChanged` / `lobbyError`,
-   and asks `lobbySnapshotRequest` → `lobbySnapshot { roomCode, members, hostPuid, localPuid }`
-   on mount (it remounts on every open of either surface, and `lobbyJoined` carries no room code).
-   That mount-time request is also why a **second** mounting point (the HUD popover) needed no
-   shared state: whichever one is open rehydrates itself.
-   **`wireLobbyCommands` republishes that snapshot on `lobbyCreated`/`lobbyJoined`/`lobbyLeft`**,
-   so a consumer never has to work out which one-shot event obliges it to re-request: each is
-   incomplete on its own (create names the code but not the owner, join names neither).
+   `lobbyBridge` method. `ui_setLobbyMode` first **routes**: `offline` → `leave()` (ungated),
+   `offline`-now → `create(mode)`, otherwise → `setMode(mode)`. A blank join code fails fast as
+   `lobbyError`.
+3. Read-back is bus-only: the window renders `lobbyCreated` / `lobbyMembersChanged` / `lobbyError`,
+   and asks `lobbySnapshotRequest` →
+   `lobbySnapshot { roomCode, members, hostPuid, localPuid, mode }` on mount (it remounts on every
+   open, and `lobbyJoined` carries no room code).
+   **`wireLobbyCommands` republishes that snapshot on
+   `lobbyCreated`/`lobbyJoined`/`lobbyLeft`/`lobbyModeChanged`**, so a consumer never has to work out
+   which one-shot event obliges it to re-request: each is incomplete on its own (create names the
+   code but not the owner, join names neither, and a mode switch fires nothing else at all).
 
 **Step 0 — the session gate (do this before step 1).** `await authManager.ensureEosSession()`
 (`eosSessionError` in `lobbyCommands.ts`). The EOS SDK session lives in the Rust process, and *nothing*
@@ -35,38 +40,52 @@ The gate belongs to the app layer — `network/lobby` must not import the auth l
 may `src/ui`. A *thrown* login (not just `false`) is reported as `lobbyError` too, or it would be invisible.
 See [lesson](../lessons-learned/persisted-token-restores-identity-not-the-eos-session.md).
 
-**Bridge liveness.** `lobbyBridge.start()` (the `eos_lobby_member_changed` subscription) is owned by
-`useLobbyCommands` at app level, **not** by the tab — a mountable view owning it stops the roster
-updating whenever it closes. See
+**Bridge liveness.** `lobbyBridge.start()` (the `eos_lobby_member_changed` **and**
+`eos_lobby_updated` subscriptions) is owned by `useLobbyCommands` at app level, **not** by the
+window — a mountable view owning it stops the roster (and the mode) updating whenever it closes. See
 [lesson](../lessons-learned/singleton-listener-lifecycle-must-not-live-in-a-mountable-view.md).
 
 See [networking.md → Lobby (implemented)](../architecture/networking.md#lobby-implemented) for the design.
 
-## Sequence — create
+## Sequence — create (the `public`/`private` tab while offline)
 
-1. **`EosLobbyBridge.create()`** (`src/network/lobby/EosLobbyBridge.ts`): `RoomCode.generate()` → 6-char code.
-2. **`TauriLobbyPort.createLobby(code)`** → `invoke("eos_create_lobby", { code })`.
+1. **`EosLobbyBridge.create(mode)`** (`src/network/lobby/EosLobbyBridge.ts`): `RoomCode.generate()` → 6-char code.
+2. **`TauriLobbyPort.createLobby(code, mode)`** → `invoke("eos_create_lobby", { code, mode })`.
 3. **`eos::eos_create_lobby`** (`src-tauri/src/eos/mod.rs`) → `EosRequest::CreateLobby` → `EosThread`.
 4. **`thread.rs create_lobby`** → `lobby::create_lobby` (`src-tauri/src/eos/lobby/create.rs`, re-exported by `lobby/mod.rs`):
-   - `EOS_Lobby_CreateLobby` (bucket `typelords:mvp`, `PUBLICADVERTISED`, `bEnableJoinById`) → lobby id (via `pump_until_outcome`).
-   - `UpdateLobbyModification` + `AddAttribute(CODE=code, PUBLIC)` + `UpdateLobby` → advertises the code.
+   - `EOS_Lobby_CreateLobby` (bucket `typelords:mvp`, `PUBLICADVERTISED` **for both modes**, `bEnableJoinById`) → lobby id (via `pump_until_outcome`).
+   - `modify_lobby` + `AddAttribute(CODE=code, PUBLIC)` + `AddAttribute(MODE=mode, PUBLIC)` + `UpdateLobby` → advertises both, in ONE modification.
    - stores `session.current_lobby_id`; returns lobby id.
-5. **Bridge** sets `roomCode`, `LobbyManager.setRoomCode()`, then `refreshMembers()` → `eos_get_lobby_members` → `LobbyManager.setMembers()`; emits `lobbyCreated` + `lobbyMembersChanged`.
+5. **Bridge** sets `roomCode`, `LobbyManager.setRoomCode()`, `modeTracker.adopt(mode)`, then `refreshMembers()` → `eos_get_lobby_members` → `LobbyManager.setMembers()`; emits `lobbyCreated` + `lobbyMembersChanged`.
 
 ## Sequence — join
 
 1. **`EosLobbyBridge.join(rawCode)`**: `RoomCode.normalize()` (trim/upper).
 2. **`eos_join_lobby`** → `lobby::join_lobby`: `CreateLobbySearch` + `SetParameter(CODE == code, EQUAL)` + `Find` → `GetSearchResultCount` (0 ⇒ "No lobby found") → `CopySearchResultByIndex(0)` → `JoinLobby` → lobby id.
-3. **Bridge** `refreshMembers()` → emits `lobbyJoined` + `lobbyMembersChanged`.
-4. **`useGameRole`** turns `lobbyJoined` into `role = "guest"`, which is an `initGame` dep — the whole
-   game generation tears down and re-inits as a guest, so `ready` goes false and the inventory window
-   (with the Lobby tab) unmounts mid-join. Reopening it rehydrates via `lobbySnapshotRequest`.
+3. **Bridge** sets `lobbyId`, then `modeTracker.pull()` → `eos_get_lobby_mode` → the guest's window
+   titles itself with the room's own mode (absent attribute ⇒ `private`). The pull must come **after**
+   `lobbyId` is set, or the tracker's own update filter would reject its lobby.
+4. **Bridge** `refreshMembers()` → emits `lobbyJoined` + `lobbyMembersChanged`.
+5. **`useGameRole`** turns `lobbyJoined` into `role = "guest"`, which is an `initGame` dep — the whole
+   game generation tears down and re-inits as a guest, so `ready` goes false and the HUD (with the
+   lobby popover) unmounts mid-join. Reopening it rehydrates via `lobbySnapshotRequest`.
    The abrupt unmount skips `useHudOverlays`' own explicit-close transition — but its unmount
    cleanup (`releaseMenuGateOnUnmount`) closes the App-level `menuOpenRef` gate regardless, so
    passthrough (forced off while the gate is open — the whole overlay window would otherwise
    swallow every desktop click) still gets released. See
    [`useHudOverlays.ts`](../../src/ui/components/HUD/useHudOverlays.ts).
 
+## Sequence — re-label (the other mode tab, host only)
+
+1. **`EosLobbyBridge.setMode(mode)`** — throws for a guest (reported as `lobbyError`; a guest is
+   shown no tabs, so reaching it is a wiring bug).
+2. **`eos_set_lobby_mode`** → `lobby::set_lobby_mode` → `modify_lobby` + `AddAttribute(MODE)` +
+   `UpdateLobby`. The lobby is **modified, not recreated**: the room code and every member survive.
+3. **EOS** fires `LobbyUpdateReceived` on every member (the host included) → `notify.rs` →
+   `eos_lobby_updated` → `LobbyModeTracker` re-reads `MODE` → `lobbyModeChanged` → snapshot
+   republished → both windows retitle. See
+   [architecture/lobby-window.md](../architecture/lobby-window.md) for the full path.
+
 ## Sequence — live membership
 
 1. **EOS** fires `LobbyMemberStatusReceived` → `on_member_status` callback pushes `MemberChange` onto `session.member_receiver`.
@@ -92,8 +111,8 @@ Two sources joined by `PeerId`; **neither alone can render a row**.
    it, so a subscription owned by the tab would start empty every time. That same always-mounted
    position is why it subscribes to arrivals/departures only: `playerHpChanged` fires per member
    per combat tick, so tracking hp here would re-key the Map (and bust step 3's memo) constantly.
-2. `InventoryMenu` passes it down as `<LobbyView party={data.partyRoster} />`.
-3. `buildLobbyMemberRows` (`views/lobbyMemberRows.ts`, pure) maps **the lobby list**, enriching
+2. `HUD.tsx` passes it down as `<LobbyPopover party={menuData.partyRoster} …/>` → `LobbyWindow` → `LobbyPanel`.
+3. `buildLobbyMemberRows` (`lobby/lobbyMemberRows.ts`, pure) maps **the lobby list**, enriching
    each entry from the party. A member EOS has admitted but the party has not (the join handshake
    is only accepted while the solver is `fighting`) becomes a dimmed placeholder row — shortened
    PUID, `—` for the class. Driving off the party instead would make the list disagree with its own
@@ -116,14 +135,15 @@ crown is stale until the watchdog fires.
 | "EOS not logged in — no local PUID" | login didn't set `session.local` (dev-token bypass has none); use Dev Auth |
 | Join returns "No lobby found" | `CODE` attribute must be `PUBLIC` + lobby `PUBLICADVERTISED`; same `bucketId` on both sides |
 | Members never update | `register_member_status_notify` at thread start; `emit_member_changes` drain in `run_event_loop`; `TauriLobbyPort.onMemberChanged` subscription — `useLobbyCommands` must be mounted in `App.tsx` (it calls `bridge.start()`) |
-| Lobby tab shows `—` / empty though a lobby exists | `lobbySnapshotRequest` handler missing from `wireLobbyCommands`, or `useLobbyCommands` not mounted |
+| Lobby window shows `—` / empty though a lobby exists | `lobbySnapshotRequest` handler missing from `wireLobbyCommands`, or `useLobbyCommands` not mounted |
 | Code/crown stale right after Create or Join | `wireLobbyCommands` must republish the snapshot on `lobbyCreated`/`lobbyJoined` (`SNAPSHOT_TRIGGERS`) — the view no longer re-requests it itself |
-| **Every** member row is a dimmed PUID with `—` columns | `usePartyRoster` is subscribing too late — it must be called from `useHUDMenuData` (always mounted), never from `LobbyView`. Otherwise: nobody is in `RoomSchema.players`, so check `HostPartyManager.acceptGuest` ran (it only accepts while `phase === "fighting"`) |
+| Title stuck on `LOBBY (OFFLINE)`, or a guest never sees the host's switch | mode-specific — see the debug table in [architecture/lobby-window.md](../architecture/lobby-window.md) |
+| **Every** member row is a dimmed PUID with `—` columns | `usePartyRoster` is subscribing too late — it must be called from `useHUDMenuData` (always mounted), never from the lobby window. Otherwise: nobody is in `RoomSchema.players`, so check `HostPartyManager.acceptGuest` ran (it only accepts while `phase === "fighting"`) |
 | **One** row is a dimmed PUID | expected while that member is between the EOS join and the party handshake; persistent means their `JoinHandshakeRpc` never landed — see [guest-join-shared-battle](guest-join-shared-battle.md) |
 | No crown on any row | `[EosLobbyBridge] owner query failed` in the log → `eos_get_lobby_owner` rejected, so `ownerPuid`/`hostPuid` is null. The host-loss watchdog is degraded too |
 | Crown on the wrong row | the owner is sampled only at create/join; EOS promoted a new owner mid-session |
-| No `(you)` marker on your own row | `authManager.getPuid()` is still null (dev-token bypass has no PUID), or the snapshot predates the login — reopen the tab |
-| Buttons do nothing, no error line | the `ui_*` events are declared but unwired — check `useLobbyCommands()` sits **before** `App`'s load-failed early return |
+| No `(you)` marker on your own row | `authManager.getPuid()` is still null (dev-token bypass has no PUID), or the snapshot predates the login — reopen the window |
+| Buttons/tabs do nothing, no error line | the `ui_*` events are declared but unwired — check `useLobbyCommands()` sits **before** `App`'s load-failed early return |
 | `getFriends()` stale | bridge must hold the **same** `LobbyManager` instance passed to `becomeHost` |
 | Desktop/other apps stop receiving clicks after a join (only HUD buttons still work) | `menuOpenRef` stuck `true` — check `useHudOverlays`' unmount cleanup (`releaseMenuGateOnUnmount`) actually ran |
 | Op hangs then times out | callback never fired — check `pump_until_outcome` is ticking; op errored inside EOS (see `[EOS]` logs) |
diff --git a/docs/lessons-learned/README.md b/docs/lessons-learned/README.md
index 855c5c38..e2de6635 100644
--- a/docs/lessons-learned/README.md
+++ b/docs/lessons-learned/README.md
@@ -27,6 +27,8 @@ Avoid: "bug description + fix". Prefer: "what I learned that applies to future w
 
 | File | Topic | Date |
 |------|-------|------|
+| [a-shared-widget-borrowed-through-a-facade-belongs-one-level-up.md](a-shared-widget-borrowed-through-a-facade-belongs-one-level-up.md) | Splitting one window out of another produced two opposite reflexes in one change — *widen the old module's facade* so the new sibling can borrow its scrollbar, and *duplicate* the font families "so the chrome can drift alone" — both symptoms of a thing used by two siblings still being owned by one. The facade widening is the tell: if a sibling has to reach through your `index.ts`, the export probably isn't yours. Test a claimed-deliberate duplicate by asking what would have to change for the copies to *legitimately* differ (colours: real; a bundled font face: only by mistake, and silently). Fix is move up **and rename** — `InvScrollClass` is what teaches the next reader to write a second scrollbar | 2026-08-13 |
+| [eos-lobby-privacy-is-a-join-path-not-a-permission-level.md](eos-lobby-privacy-is-a-join-path-not-a-permission-level.md) | `EOS_ELobbyPermissionLevel` looks like the field a public/private lobby feature wants, and setting it here would make a lobby **unjoinable** rather than private: join is a *search* over the `CODE` attribute, and only `PUBLICADVERTISED` lobbies come back. A `MODE` attribute is therefore a label, not an access restriction — real privacy needs a different join path first. Also: an attribute rewrite fires `AddNotifyLobbyUpdateReceived`, never the member-status notify, so re-reading inside the member handler leaves every member stale in a room nobody is joining or leaving | 2026-08-13 |
 | [hud-popover-anchors-must-derive-from-the-button-list.md](hud-popover-anchors-must-derive-from-the-button-list.md) | The HUD row's width and click-through hitbox both derive from `HudGeometry.ExpandedButtons`, but popover anchors were hardcoded slot indices — so inserting a button silently mis-anchored the zone-info card with nothing failing (the hitbox has the opposite property: a wrong count makes a button visibly dead, which is why the anchors were the half that rotted). Anchor through `buttonAnchor(layout, key)`; when a constant becomes a layout's source of truth, sweep for coordinates hand-derived from the old arrangement | 2026-08-12 |
 | [deep-module-lint-ignores-aliased-imports.md](deep-module-lint-ignores-aliased-imports.md) | `deep-modules/no-boundary-violation` returns early on any import that doesn't start with `.`, so **every** `@/...` / `@typerlords/shared/...` facade bypass passes lint. `utils/aliasResolver.js` was written to close exactly this gap and is never called — dead code. Wiring it in is not a free fix: ~300 `@typerlords/shared/{types,api}/*` subpath imports would light up at once. Also records the `.js`→`.ts` jest `moduleNameMapper` the shared barrel needs | 2026-08-11 |
 | [figma-chrome-is-sprites-hand-written-css-will-never-converge.md](figma-chrome-is-sprites-hand-written-css-will-never-converge.md) | The UI's plates/buttons/ornaments are exported PNGs (the lobby row is ONE 214×34 sprite with the belt baked in), so eyeballing them as CSS gradients structurally cannot converge — call `get_design_context` first. Carries the sprite rules that follow: native-size layout arithmetic is load-bearing, stretchable chrome is three-sliced, `get_design_context` asset URLs 404 while `download_assets` ones work (identify the unnamed results by dimension + pixel colour), and the node tree — not the screenshot — is what tells you where separators are | 2026-08-11 |
diff --git a/docs/lessons-learned/eos-lobby-privacy-is-a-join-path-not-a-permission-level.md b/docs/lessons-learned/eos-lobby-privacy-is-a-join-path-not-a-permission-level.md
new file mode 100644
index 00000000..0161537b
--- /dev/null
+++ b/docs/lessons-learned/eos-lobby-privacy-is-a-join-path-not-a-permission-level.md
@@ -0,0 +1,28 @@
+# An EOS lobby's privacy is decided by its join path, not by `EOS_ELobbyPermissionLevel`
+
+`EOS_ELobbyPermissionLevel` has exactly the three values a "public / friends / invite-only" feature
+wants (`PUBLICADVERTISED`, `JOIN_VIA_PRESENCE`, `INVITE_ONLY`), and reaching for it is the obvious
+move. In this codebase it is a trap.
+
+**Joining is a lobby *search*.** `src-tauri/src/eos/lobby/join.rs` resolves a room code by
+`CreateLobbySearch` + `SetParameter(CODE == code)` + `Find`, and only search results for
+`PUBLICADVERTISED` lobbies come back. So lowering the permission level does not make a lobby private
+— it makes it **unjoinable by its own room code**, which is the only join mechanism there is.
+
+The consequence runs the other way too: as long as join is a search, *every* lobby is publicly
+enumerable regardless of what the UI calls it. A `MODE=private` attribute is a **label**, not an
+access restriction. Making private actually private means changing the join path first (EOS invites,
+or a server-brokered lobby id), and only then the permission level.
+
+**How to tell which case you are in:** if a feature's privacy claim is enforced by a field on the
+lobby, check what the *joiner* does. A joiner that searches is constrained by advertisement; a joiner
+handed an id or an invite is not.
+
+Related: a lobby's own data changing (an attribute rewrite) fires
+`EOS_Lobby_AddNotifyLobbyUpdateReceived`, **not** `LobbyMemberStatusReceived` — and the payload names
+only the lobby, never which attribute moved, so a listener re-reads what it cares about. Re-reading
+inside the member-status handler instead looks equivalent and is not: a host toggling a setting in a
+stable room fires no member event at all, so every other member stays stale until somebody joins or
+leaves.
+
+See [architecture/lobby-window.md](../architecture/lobby-window.md).
diff --git a/docs/lessons-learned/singleton-listener-lifecycle-must-not-live-in-a-mountable-view.md b/docs/lessons-learned/singleton-listener-lifecycle-must-not-live-in-a-mountable-view.md
index 065069e5..2daa34c7 100644
--- a/docs/lessons-learned/singleton-listener-lifecycle-must-not-live-in-a-mountable-view.md
+++ b/docs/lessons-learned/singleton-listener-lifecycle-must-not-live-in-a-mountable-view.md
@@ -22,7 +22,7 @@ list, dropped RPCs to a peer who left) would surface far away from the cause.
 | a singleton / the data layer / network routing | an app-level effect, for the session |
 
 `lobbyBridge.start()` now lives in `useLobbyCommands` (called from `App.tsx`, before its load-failed
-early return, so it runs in every window mode). The Lobby tab only emits `ui_*` commands and subscribes
+early return, so it runs in every window mode). The lobby window only emits `ui_*` commands and subscribes
 to bus events for its own rendering — it owns nothing that outlives it.
 
 **Corollary — a late-mounting view cannot rely on one-shot events.** Once the lifecycle moves up,
diff --git a/docs/live/current-status.md b/docs/live/current-status.md
index 567bc8aa..35ead024 100644
--- a/docs/live/current-status.md
+++ b/docs/live/current-status.md
@@ -196,10 +196,11 @@ All 4 slices complete. `ObservableMap` is gone. Schema stack uses `@colyseus/sch
 
 The in-process RPC abstraction (`HostManager` / `GuestNetworkManager` / `NetworkManagerBusses`) is complete and all managers run through it. Replacing the in-memory busses with real EOS P2P is the only work left:
 
-1. ✅ **Tauri Rust EOS lobby commands** — `eos_create_lobby`/`eos_join_lobby`/`eos_leave_lobby`/`eos_get_lobby_members` + `eos_lobby_member_changed` event, over the raw EOS Lobby Interface FFI (`src-tauri/src/eos/lobby/` deep module). Join is room-code based (public `CODE` attribute + lobby search). P2P commands (`eos_p2p_send`) already exist via the echo slice.
-2. ✅ **`EosLobbyBridge`** (`src/network/lobby/`) — translates lobby Tauri events → mitt bus events; fills `LobbyManager.setMembers()` from real EOS lobby membership via a `LobbyPort` seam (fake-testable). Exposed as the `lobbyBridge` singleton. **Production UI done:** the inventory window's **Lobby tab** (`inventory/views/LobbyView.tsx`) drives create/join/leave + a live roster **list** (host crown / class icon / name, with unaccepted members shown as dimmed placeholders) in every window mode, over `ui_createLobby`/`ui_joinLobby`/`ui_leaveLobby` + `lobbySnapshotRequest`; the app layer owns the EOS-session gate and the bridge lifetime (`app/hooks/lobbyCommands.ts` + `useLobbyCommands.ts`). This replaced the windowed-only dev panel, which is deleted. **Remaining:** EOS invites (join is room-code-only); lobby UI is not reachable on the load-failed screen.
-3. ✅ **`RelayClient`** (`src/network/relay/`) — dispatches `[0x00, ...msgpack]` RPC packets, `[0x01, ...schema-bytes]` patch packets, and `[0x02, ...]` fragments (>1170 B) over EOS P2P channel 0 (`ReliableOrdered`); on receive, `FrameAssembler` reassembles and routes by type byte to the inner transport. Hybrid routing keyed on `guest_id` (remote roster PUID → EOS, else in-memory); `eos_get_lobby_owner` resolves the host for guest→host sends.
-4. ✅ **Wired into `NetworkInstances`** — `RelayClient` is the default transport (wrapping an inner `InMemoryTransport`); `startRelay()` + `lobbyMembersChanged` roster binding in `useGameInit`. MessagePack via `@msgpack/msgpack`. Two-instance live P2P round-trip verified.
+1. ✅ **Tauri Rust EOS lobby commands** — `eos_create_lobby`/`eos_join_lobby`/`eos_leave_lobby`/`eos_get_lobby_members`/`eos_get_lobby_owner`/`eos_set_lobby_mode`/`eos_get_lobby_mode` + the `eos_lobby_member_changed` and `eos_lobby_updated` events, over the raw EOS Lobby Interface FFI (`src-tauri/src/eos/lobby/` deep module). Join is room-code based (public `CODE` attribute + lobby search); the lobby's public/private **mode** is a second public attribute (`MODE`). P2P commands (`eos_p2p_send`) already exist via the echo slice.
+2. ✅ **`EosLobbyBridge`** (`src/network/lobby/`) — translates lobby Tauri events → mitt bus events; fills `LobbyManager.setMembers()` from real EOS lobby membership via a `LobbyPort` seam (fake-testable). Exposed as the `lobbyBridge` singleton. **Production UI done:** the **lobby window** (`HUD/lobby/`, floated by the HUD button row) drives create/join/leave/mode + a live roster **list** (host crown / class icon / name, with unaccepted members shown as dimmed placeholders) in every window mode, over `ui_setLobbyMode`/`ui_joinLobby`/`ui_leaveLobby` + `lobbySnapshotRequest`; the app layer owns the EOS-session gate and the bridge lifetime (`app/hooks/lobbyCommands.ts` + `useLobbyCommands.ts`). This replaced the windowed-only dev panel and then the inventory window's LOBBY tab, both deleted. **Remaining:** EOS invites (join is room-code-only); lobby UI is not reachable on the load-failed screen; the HUD lobby **button icon** does not yet follow the mode.
+3. ✅ **Lobby mode (public / private / offline) — implemented (unit-tested; pending live two-instance check).** The window's three mode tabs are its whole control surface: a mode picked while offline **creates**, the other one while hosting **re-labels** the existing lobby (same room code, same members), and `offline` **leaves**. Guests see no tabs at all and follow the host live via `EOS_Lobby_AddNotifyLobbyUpdateReceived`. Mode is deliberately an **attribute, not `EOS_ELobbyPermissionLevel`** — join is a search over `CODE`, so a non-advertised lobby would be unjoinable by its own code, which means "private" is a label rather than an access restriction today. See [lobby-window.md](../architecture/lobby-window.md).
+4. ✅ **`RelayClient`** (`src/network/relay/`) — dispatches `[0x00, ...msgpack]` RPC packets, `[0x01, ...schema-bytes]` patch packets, and `[0x02, ...]` fragments (>1170 B) over EOS P2P channel 0 (`ReliableOrdered`); on receive, `FrameAssembler` reassembles and routes by type byte to the inner transport. Hybrid routing keyed on `guest_id` (remote roster PUID → EOS, else in-memory); `eos_get_lobby_owner` resolves the host for guest→host sends.
+5. ✅ **Wired into `NetworkInstances`** — `RelayClient` is the default transport (wrapping an inner `InMemoryTransport`); `startRelay()` + `lobbyMembersChanged` roster binding in `useGameInit`. MessagePack via `@msgpack/msgpack`. Two-instance live P2P round-trip verified.
 
 ### Phase 2 step 2 — shared host battle (guest game-session)
 
diff --git a/docs/live/file-map.md b/docs/live/file-map.md
index fe5356a1..330a83b7 100644
--- a/docs/live/file-map.md
+++ b/docs/live/file-map.md
@@ -21,14 +21,17 @@ Registry of TypeScript/TSX files and their responsibilities. Add new files here
 | `src-tauri/src/eos/steam.rs` | `SteamThread`: dedicated `std::thread` + callback loop for `GetAuthTicketForWebApi`; `get_ticket()` async method awaits `TicketForWebApiResponse` | Implemented |
 | `src-tauri/src/eos/thread.rs` | `EosThread` (takes `AppHandle`); `EosRequest` enum (`LoginSteam`/`LoginEpic`/`LoginEpicAccountPortal`/`LoginEpicDevAuth`/`SendP2P`/`CreateLobby`/`JoinLobby`/`LeaveLobby`/`GetLobbyMembers`); `EosSession` (p2p+lobby handles, local PUID, `current_lobby_id`, `member_receiver`); dedicated thread owning `eos_rs::Platform`; continuous `run_event_loop` (tick/drain/poll) that pumps login + polls P2P + emits `eos_p2p_received`/`eos_lobby_member_changed` | Implemented |
 | `src-tauri/src/eos/p2p.rs` | Raw EOS P2P FFI: `send_packet`, `poll_received`, `puid_from_str`, socket-id helper, `register_accept_connections` (auto-accept incoming on socket `"typelords"`) | Implemented |
-| `src-tauri/src/eos/lobby/mod.rs` | Facade of the EOS Lobby deep module (inside the `eos` deep module): re-exports `create_lobby`/`join_lobby`/`leave_lobby`/`list_members`/`get_lobby_owner`/`register_member_status_notify`/`MemberChange`/`MEMBER_CHANGED_EVENT`; holds shared `ROOM_CODE_KEY`. Private submodules below | Implemented |
-| `src-tauri/src/eos/lobby/attr.rs` | Room-code attribute FFI helpers: `make_string_attr`, `lobby_id_to_string` (+ their unit tests) | Implemented |
+| `src-tauri/src/eos/lobby/mod.rs` | Facade of the EOS Lobby deep module (inside the `eos` deep module): re-exports `create_lobby`/`join_lobby`/`leave_lobby`/`list_members`/`get_lobby_owner`/`get_lobby_mode`/`set_lobby_mode`/both notify registrations/`MemberChange`/`LobbyUpdate`/`MEMBER_CHANGED_EVENT`/`LOBBY_UPDATED_EVENT`; holds shared `ROOM_CODE_KEY` + `MODE_KEY` and three bundles split by whether a lobby exists yet: `LobbyHandle {lobby, local}` (who is acting — taken by `create_lobby`/`join_lobby`, the two operations with no lobby to name), `LobbyRef {handle, lobby_id}` + `handle.in_lobby(id)` (a lobby the user is already in — taken by every read and every write, a real concept rather than a parameter-count dodge), and `LobbySetup {code, mode}` (what a new lobby advertises). Private submodules below | Implemented |
+| `src-tauri/src/eos/lobby/attr.rs` | Attribute FFI helpers: `make_string_attr`, `lobby_id_to_string` (+ their unit tests, covering both the `CODE` and `MODE` keys) | Implemented |
 | `src-tauri/src/eos/lobby/async_ops.rs` | Async-op plumbing: boxed `OpContext` per call (`new_op`) + `on_create`/`on_update`/`on_find`/`on_join`/`on_leave` C callbacks that `send_outcome` back to `pump_until_outcome` | Implemented |
-| `src-tauri/src/eos/lobby/create.rs` | `create_lobby`: `EOS_Lobby_CreateLobby` (bucket `typelords:mvp`, `PUBLICADVERTISED`) → advertise `CODE` via UpdateLobbyModification; leaves the lobby if advertising fails. Owns `MAX_LOBBY_MEMBERS` | Implemented |
-| `src-tauri/src/eos/lobby/join.rs` | `join_lobby`: `CreateLobbySearch` + `SetParameter(CODE==code)` → Find → copy first result → JoinLobby. Owns `SEARCH_MAX_RESULTS` | Implemented |
-| `src-tauri/src/eos/lobby/leave.rs` | `leave_lobby`: `EOS_Lobby_LeaveLobby` for the local user, pumped to completion | Implemented |
-| `src-tauri/src/eos/lobby/members.rs` | `list_members`: `CopyLobbyDetailsHandle` + `GetMemberCount`/`GetMemberByIndex` → `Vec<String>` PUIDs (includes local); `get_lobby_owner`: `CopyLobbyDetailsHandle` + `EOS_LobbyDetails_GetLobbyOwner` → owner PUID (the relay host) | Implemented |
-| `src-tauri/src/eos/lobby/notify.rs` | Member-status notifications: `MemberChange`, `MEMBER_CHANGED_EVENT`, `register_member_status_notify` (leaked `Sender`) + `on_member_status` (+ label test) | Implemented |
+| `src-tauri/src/eos/lobby/modify.rs` | Every lobby **write**: `add_string_attribute` + `modify_lobby(platform, target, write)`, which owns the modification handle's lifetime (released whatever happened). `begin_modification`/`submit_update` are **private to this file** — exposing a raw `EOS_HLobbyModification` would let a caller skip that `Release`, the exact leak the module exists to prevent. Extracted from `create.rs` once `MODE` gained a post-creation writer — creating and re-labelling a lobby differ only in which attributes they add | Implemented |
+| `src-tauri/src/eos/lobby/details.rs` | Every lobby **read**: `copy_details_handle` (shared with `members.rs`) + `read_string_attribute` via `EOS_LobbyDetails_CopyAttributeByKey`. A key the lobby never carried is `Ok(None)`, not an error — the caller decides the fallback | Implemented |
+| `src-tauri/src/eos/lobby/mode.rs` | `set_lobby_mode` / `get_lobby_mode` over the public `MODE` attribute, and the load-bearing comment for **why mode is an attribute and not `EOS_ELobbyPermissionLevel`**: joining is a search over `CODE`, so a lobby that stopped being `PUBLICADVERTISED` would stop being joinable by its own room code | Implemented |
+| `src-tauri/src/eos/lobby/create.rs` | `create_lobby`: `EOS_Lobby_CreateLobby` (bucket `typelords:mvp`, `PUBLICADVERTISED` **for both modes**) → advertise `CODE` **and** `MODE` in ONE modification (a lobby advertising its code but not its mode would be joinable yet untitled); leaves the lobby if advertising fails. Owns `MAX_LOBBY_MEMBERS` | Implemented |
+| `src-tauri/src/eos/lobby/join.rs` | `join_lobby(platform, handle, code)`: `CreateLobbySearch` + `SetParameter(CODE==code)` → Find → copy first result → JoinLobby. Takes a bare `LobbyHandle` — like create, it has no lobby to name yet. Owns `SEARCH_MAX_RESULTS` | Implemented |
+| `src-tauri/src/eos/lobby/leave.rs` | `leave_lobby(platform, target)`: `EOS_Lobby_LeaveLobby` for the local user, pumped to completion. Takes a `LobbyRef` like every other operation on an existing lobby, so `create.rs`'s rollback hands it the ref it already built | Implemented |
+| `src-tauri/src/eos/lobby/members.rs` | `list_members`: `GetMemberCount`/`GetMemberByIndex` → `Vec<String>` PUIDs (includes local); `get_lobby_owner`: `EOS_LobbyDetails_GetLobbyOwner` → owner PUID (the relay host). Both take their details handle from `details.rs` | Implemented |
+| `src-tauri/src/eos/lobby/notify.rs` | Both EOS notifications, each registered once with a leaked `Sender`: member-status (`MemberChange`, `MEMBER_CHANGED_EVENT`, `on_member_status` + label test) and **lobby-data updates** (`LobbyUpdate`, `LOBBY_UPDATED_EVENT`, `on_lobby_update`). The update payload carries only the lobby id — EOS never says *which* attribute changed, so the receiver re-reads. Without this a guest would keep the mode it read at join time forever | Implemented |
 | `src-tauri/src/eos/platform.rs` | `RawPlatform`: raw `EOS_Platform_Create` with per-profile `CacheDirectory` (eos_rs hardcodes null); `tick`/`connect_handle`/`auth_handle`/`lobby_handle`/`raw_handle`/Drop; shared `pump_until_outcome` | Implemented |
 | `src-tauri/src/eos/logging.rs` | Raw FFI to the EOS Logging interface (eos-sys 0.1.1 omits it): `init()` registers a stderr callback at Verbose for all categories so SDK/backend errors (e.g. Auth `InvalidRequest`) print their real reason. Called after `EOS_Initialize` in `thread.rs` | Implemented |
 | `src-tauri/src/eos/connect.rs` | Raw EOS Connect/Auth login FFI (raw `sys::EOS_HConnect`): Steam / exchange-code / Dev-Auth-Tool submit helpers, callbacks gated on `IsOperationComplete`, `build_result` → PUID+JWT | Implemented |
@@ -96,7 +99,7 @@ Registry of TypeScript/TSX files and their responsibilities. Add new files here
 | `src/app/dev/DevPingPanel.tsx` | Windowed-only dev UI for the EOS P2P echo slice: acquires a PUID by delegating to `authManager.ensureEosSession()` (single login chain — dev-auth when `TYPELORDS_EOS_CRED` is set, else Account Portal — and it re-logs in when this process holds no EOS session), starts blank so it can never show a PUID with no session behind it, shows local PUID (copy), accepts a remote PUID (paste), pings it, listens `eos_p2p_received`, auto-replies pong, logs round-trip ms | Implemented |
 | `src/app/dev/pingProtocol.ts` | Pure (Tauri-free) encode/decode + `classifyMessage` for the ping/pong wire format; unit-tested | Implemented |
 | `src/app/dev/devCred.ts` | Pure (Tauri-free) `parseDevCred` — splits `TYPELORDS_EOS_CRED` (`host:port\|credName`) into `{host, credentialName}`; unit-tested | Implemented |
-| `src/app/hooks/lobbyCommands.ts` | `wireLobbyCommands({bridge, lobby, bus, ensureSession, getLocalPuid})` → unwire: maps the Lobby tab's `ui_createLobby`/`ui_joinLobby`/`ui_leaveLobby` onto `lobbyBridge`, gating create/join on `authManager.ensureEosSession()` (per-process EOS session; a hydrated token does not restore it) and reporting a missing session / thrown login / blank code as `lobbyError`; answers `lobbySnapshotRequest` with `lobbySnapshot {roomCode, members, hostPuid, localPuid}` (owner from `bridge.getOwnerPuid()`, local PUID read **per snapshot** so a login landing after boot still shows up). **Republishes that snapshot on `lobbyCreated`/`lobbyJoined`/`lobbyLeft` too** (`SNAPSHOT_TRIGGERS` + `publishSnapshotOn`): each one-shot event is individually incomplete — create names the code but not the owner, join names neither, left nothing — so publishing centrally keeps "which event obliges a re-request" out of every consumer, in the one module that can read the bridge. Structural `LobbyBridgeApi`/`LobbyRosterApi` deps so tests need no Tauri. The only seam where the UI, network and auth layers meet | Implemented |
+| `src/app/hooks/lobbyCommands.ts` | `wireLobbyCommands({bridge, lobby, bus, ensureSession, getLocalPuid})` → unwire: maps the lobby window's `ui_setLobbyMode`/`ui_joinLobby`/`ui_leaveLobby` onto `lobbyBridge`, gating create/join/set-mode on `authManager.ensureEosSession()` (per-process EOS session; a hydrated token does not restore it) and reporting a missing session / thrown login / blank code as `lobbyError`. **Owns the mode-tab routing** — the three tabs are one command, and which of create / re-label / leave a click means is decided HERE from `bridge.getMode()` by the exported pure `lobbyModeCommand(current, target)` → `none|leave|create|relabel` (unit-tested directly): `offline` → leave (ungated, as before, and **never** short-circuited as a no-op — the mode is a label the client can hold wrongly, so guarding it could strand a player whose `MODE` read failed at join), same lobby mode re-clicked → nothing (a redundant `UpdateLobby` would make every other member re-read an unchanged attribute), offline-now → `create(mode)`, otherwise → `setMode(mode)`. Answers `lobbySnapshotRequest` with `lobbySnapshot {roomCode, members, hostPuid, localPuid, mode}` (owner from `bridge.getOwnerPuid()`, local PUID read **per snapshot** so a login landing after boot still shows up). **Republishes that snapshot on `lobbyCreated`/`lobbyJoined`/`lobbyLeft`/`lobbyModeChanged` too** (`SNAPSHOT_TRIGGERS` + `publishSnapshotOn`): each one-shot event is individually incomplete — create names the code but not the owner, join names neither, left nothing, and a host's mode switch fires nothing else at all — so publishing centrally keeps "which event obliges a re-request" out of every consumer, in the one module that can read the bridge. Structural `LobbyBridgeApi`/`LobbyRosterApi` deps so tests need no Tauri. The only seam where the UI, network and auth layers meet | Implemented |
 | `src/app/hooks/useLobbyCommands.ts` | App-level hook (called from `App.tsx`, all window modes): owns `lobbyBridge.start()`/`stop()` for the session and installs `wireLobbyCommands`. `start()` must NOT be owned by the tab — it subscribes to `eos_lobby_member_changed`, so a mountable view owning it stops roster refreshes on close | Implemented |
 | `src/app/hooks/useTauriListeners.ts` | Tauri event listeners + `handleMouseMove` passthrough toggling. In windowed mode skips all click-through toggling so the window stays interactive. `applySceneHover` splits one `withinHoverBox` check into two flags: `hovering` (`overBattler`, monitor-gated via `onGameMonitor` — cosmetic game/bar dim only, so a near-edge sprite's oversized hover box does not dim the game from a neighbouring monitor) and `buttonsArmed` (`armed`, **ungated** — drives `HUDMenu`'s button opacity/pointerEvents, since a game genuinely spanning two monitors must keep buttons clickable on either one) | Implemented |
 | `src/__tests__/hoverCrossMonitorRepro.test.ts` | Regression: `handleMouseMove` does NOT set hovering when the cursor is on a neighbouring monitor even though it falls inside the scale-1.45 hover box (near-edge sprite); control asserts a same-monitor cursor over the sprite still dims; separate suite asserts `buttonsArmed` STILL activates in that same neighbouring-monitor case (must not be gated like `hovering`) | Implemented |
@@ -194,7 +197,7 @@ outside (`HUD.tsx`). See `docs/architecture/inventory-menu.md`.
 |---|---|---|
 | `inventory/index.ts` | Public interface: `InventoryMenu`, `InventoryMenuSettings`, `useUnrevealedLoot`, `LootRevealWindow`, `ZoneInfoCard`, `ZoneHoverTooltip`, `selectZoneInfo`. No OPEN/CLOSE state and no key binding are exported — `HUD/useHudOverlays` owns both for all three overlays | Implemented |
 | `inventory/loot-reveal/LootRevealWindow.tsx` | "NEW LOOT!" reveal window (Figma 1194:2382 unrevealed / 1310:1417 revealed), opened from the HUD star button (replaces `LootPopover` in `HUDPopovers`): ornate frame PNG (710×452) + gold "NEW LOOT!" tab + fixed-height subtitle (`SubtitleHpx`, so the column lands on the painted button row) + scrollable chest grid + 3-slice "CLAIM LOOT!" button (`ClaimLabel`; same staggered reveal-all handler as the old "REVEAL N ITEMS" — copy-only change) that becomes "SKIP" mid-run; monitor-centered + draggable + fit-scaled like `InventoryWindow`; no close/move affordance (backdrop click or Esc closes). Takes `batches: UnrevealedLootBatch[]`; the local `useLootReveal` hook keys reveal by CELL (per loot unit) so a click reveals only that item + plays the `Reveal_<rarity>` burst and emits `ui_revealLoot({batchId, itemId})` (per-UNIT ledger decrement, guarded once per cell) so unopened units persist next session and the counter drops by exactly what's opened; `displayBatches` snapshot keeps revealed cells visible until close | Implemented |
-| `inventory/loot-reveal/LootGrid.tsx` | Fixed 8-column grid (cell 64px, col gap 13, row gap 10 → 603px wide, matching the Figma frame) + the local `GridLootBox` sub-component that resolves each cell's catalog item, its `LootCellOffer` (`buildEquipIntent` spread with the shared `wornItem` as `rival` — ONE object, so the four equip-related facts travel together) and `isNew` (from `newItemIds`, keyed by **itemId** since items stack) — extracted so `LootGrid` stays under the max-lines-per-function limit. 4 rows tall viewport with vertical scroll (wears the module-wide `InvScrollClass`, pinning its width via `invScrollWidth`); renders `toLootCells(batches, catalog)` (memoized) — one `LootBox` per loot UNIT, ordered by rarity (rarest last); threads the per-CELL `revealing` set + `onReveal(cellKey, batchId, itemId)` (reveal that one unit); when the grid fits within VisibleRows it uses `overflow: visible` so reveal bursts show past the grid edges, else `overflowY:auto`+scroll | Implemented |
+| `inventory/loot-reveal/LootGrid.tsx` | Fixed 8-column grid (cell 64px, col gap 13, row gap 10 → 603px wide, matching the Figma frame) + the local `GridLootBox` sub-component that resolves each cell's catalog item, its `LootCellOffer` (`buildEquipIntent` spread with the shared `wornItem` as `rival` — ONE object, so the four equip-related facts travel together) and `isNew` (from `newItemIds`, keyed by **itemId** since items stack) — extracted so `LootGrid` stays under the max-lines-per-function limit. 4 rows tall viewport with vertical scroll (wears the HUD-wide `HudScrollClass`, pinning its width via `hudScrollWidth`); renders `toLootCells(batches, catalog)` (memoized) — one `LootBox` per loot UNIT, ordered by rarity (rarest last); threads the per-CELL `revealing` set + `onReveal(cellKey, batchId, itemId)` (reveal that one unit); when the grid fits within VisibleRows it uses `overflow: visible` so reveal bursts show past the grid edges, else `overflowY:auto`+scroll | Implemented |
 | `inventory/loot-reveal/lootOrder.ts` | Pure `toLootCells(batches, catalog)`: flattens the unrevealed batches into one cell per unit (no id-grouping), each tagged with its `batchId`, sorted by rarity **ascending (rarest last)** via the shared `rarityRank` — deliberately the inverse of the bag's best-first order, because reveal-all opens cells in grid order and the pacing/auto-scroll assume the sequence builds to the best drop; missing/unknown rarity → common | Implemented |
 | `inventory/loot-reveal/lootEquip.ts` | Pure glue for equipping a revealed drop: `buildEquipIntent(item, deps)` → `{equip?, hint?, worn}` — the cell's double-click gesture, the tooltip line naming it, and whether the item is the one already worn (returned rather than re-derived at the call site, so the two can't disagree). The tooltip's stat rival comes from the shared `support/wornItem` called directly by `GridLootBox`; there is no loot-specific wrapper. Four outcomes: slotless → nothing at all, already worn → `worn` only (no gesture and no hint — naming an absent action is worse than silence, and the worn cell already shows its "Equipped" tag), wrong body type → a blocked hint with no gesture, wearable → both. `equipped` comes from live gear state, so the equipped view self-corrects on `playerGearChanged` with no local bookkeeping; unit-tested | Implemented |
 | `inventory/loot-reveal/LootBox.tsx` | One 64×64 loot cell, borderless (the art carries its own frame). Closed → `ClosedChest`: the `RarityChest[rarity]` PNG at 60×60 inset 2 (exact 2× of the 30×30 source). While `revealing`, the item stays hidden through the `_start` burst and then shows as `RevealedSlot`: shadow (`#3d1911`, offset 4) → the SHARED `loot-slot-frame.png` → the flat `RaritySlotPlate` (56×56 inset 4, shows as a 2px ring) → the `RarityGradient` field (52×52 inset 6) holding the item's catalog `ItemIcon` at 52px — rarity reads from the gradient, not from a border. `RarityIdleLoop` (epic+ shine) renders AFTER the state art because the plate/field are opaque. The **two-phase** burst (`AnimatedSprite`, `loot_reveal.png`, one mounted instance switching only `tag`; pure VFX, no item art) sits on top, centered via px `left/top` + `translate(-50%,-50%) scale(RevealScale)` + a nudge: `Reveal_<rarity>_start` plays while the cell stays CLOSED (`itemShown=false`), its `onFinish` reveals the item (`phase: start→finish`) and switches to `Reveal_<rarity>_finish` over it, whose `onFinish` unmounts the burst and arms the cell (`phase: finish→done`); click → reveal its cell (a REVEALED cell's click is a no-op, so its cursor drops to `default`). Equip-from-loot: the tooltip gets `rival` (the worn item, for the stat comparison) and its `hint`, and `onDoubleClick` arms **only once the full burst settles** (`phase` done) — so a cursor resting on the grid during a reveal-all can't equip what pops open under it, at the cost of coupling the affordance to the burst's `onFinish`. An already-worn item instead shows a gold "Equipped" tag along the cell's bottom edge (same construction as the bag's NEW badge; gold because it confirms rather than calls to action), and a first-ever drop wears the shared red `<NewBadge/>` top-left. Both tags wait for that settle (`phase` done — the burst covers the cell before that, and a closed chest must give nothing away) and never collide. Hovering here does NOT emit `ui_markItemSeen` — revealing is looking, so dismissing would clear the tag as it appeared | Implemented |
@@ -240,18 +243,24 @@ outside (`HUD.tsx`). See `docs/architecture/inventory-menu.md`.
 | `inventory/ZoneView.tsx` | Zone tab (zone cards + lock status); Restart (current) / Travel (unlocked) button emits `travelToZone` | Implemented |
 | `inventory/SettingsView.tsx` | Settings tab: display / account (reset position, switch/delete character, logout) / debug (give-all-items, fake players, jump-to-battle, unlock-all-zones, force-defeat, two cheat toggles via one `CheatToggle` sub-component (instakill / insta-dead), clear-all-local-data-and-close via `confirm()` guard); scale slider disabled+dimmed unless "Custom scale" is on (auto-scale would otherwise override it). `CheatToggle` seeds its checkbox from `DebugCheats.get(cheat)` (this tab unmounts on every menu close, so component state alone would report "off" while the solver is still buffed) and only emits the `debugInstakill` command | Implemented |
 | `inventory/ComingSoonView.tsx` | Placeholder view for the Store tab (Lobby is implemented) | Implemented |
-| `inventory/views/roomCodeDisplay.ts` | Pure `roomCodeCells(roomCode, revealed)` + `RoomCodeText` (length/mask char/empty dash) — models the Lobby tab's code readout as one cell per **real** character flagged masked or not, so `RoomCodeReadout` can hide the glyph and paint a dot over it instead of substituting narrower text (which would reflow the row and shift the icon buttons). `—` single cell outside a lobby. Extracted so the states are unit-testable in the node test env | Implemented |
-| `inventory/views/LobbyView.tsx` | Exports **`LobbyPanel`** (the bare panel) and **`LobbyView`** (= `TabFrame` + panel). The panel is mounted by the LOBBY tab *and* by `LobbyPopover`; each mounting point runs its own `useLobbyViewState`, and every field there comes from the `lobbySnapshot` it requests on mount, so a second mounting point needs no shared state. Lobby tab, as a **250px column centered in the 964px tab area** (`LobbyLayout.ColumnWidth`; the lobby is slated to move to its own narrower frame), wearing the Figma window panel (`panelBg` + 4px `panelEdge` left/right borders) — **the design's title bar and footer are deliberately NOT ported**: the title carries the unimplemented public/private lobby-type feature, and this already sits inside the inventory window's frame. `ROOM CODE` + eye/clipboard `LobbyIconButton`s, the green code (masked by default; the design ships one eye sprite, so the dots-vs-digits readout carries the toggle state), the member list (`LobbyMemberList`), then a full-width `LEAVE LOBBY` plate **or** — outside a lobby — the join-by-code input (Enter submits) + `Join`/`Create lobby`, and last `lobbyError` as a red line. Bus-only — emits `ui_createLobby`/`ui_joinLobby`/`ui_leaveLobby`, reads the `lobby*` events via `useBus`, and rehydrates on mount via `lobbySnapshotRequest`→`lobbySnapshot {roomCode, members, hostPuid, localPuid}`. **`lobbySnapshot` is the only writer of those four fields** — `wireLobbyCommands` republishes it after create/join/leave, so the one-shot handlers here only clear the stale error line and the view never needs to know which event carries which field. Takes `party` as a PROP rather than subscribing: `playerJoined` fires at battle start, long before this tab mounts. Imports nothing from `src/network`; replaced the windowed-only `app/dev/LobbyPanel.tsx`, so lobbies now work in the production overlay | Implemented |
-| `inventory/views/LobbyPopover.tsx` | Floats `LobbyPanel` over the game for the HUD's **lobby button** — the same panel the LOBBY tab shows, without opening the inventory window. Backdrop-dismissed, anchored to the button row's **right** edge opening upward (the panel is far wider than one button, so it hangs off the row, not off its own leftmost button). **Provisional chrome**: it only supplies the top/bottom edges the panel lacks (in the tab the window frame closes it) — the designed standalone window (title bar + lobby-type tabs + ornate footer, Figma `1409:1552`) is NOT ported, so the panel renders unchanged in both places | Implemented |
-| `inventory/views/LobbyMemberList.tsx` | The lobby member list: `MEMBERS` / `N/4` header over one **214×34 sprite plate** per EOS lobby member (`row-idle.png`, `row-local.png` for the local player), scrollable at 6 rows, pending rows dimmed. The belt ornament and the dark class-icon well are **baked into the plate**, so a row positions three things over that background: catalog class icon 28×28 at (19,3) via `useClassIconMap()` (falling back to `class-unknown.png`), `crown.png` 32×18 for the owner, and the name in Inter 14. One 3px rule sits **under the host row only**. Ported from Figma node `1413:3678`; replaced the CSS plate-gradient chrome | Implemented |
-| `inventory/views/lobbyMemberRows.ts` | Pure `buildLobbyMemberRows({members, party, hostPuid, localPuid})` + `shortPuid` + `LobbyCapacity.MaxMembers` (mirrors `MAX_LOBBY_MEMBERS` in `src-tauri/src/eos/lobby/create.rs` — host + 3 guests) + `memberCountLabel(count)` (`N/4`, **unclamped**, so a debug fake party reads `5/4` instead of a false `4/4`) — joins the EOS lobby roster (bare PUIDs) against the battle party (`PartyRoster`, identity only) by `PeerId`. **Rows are driven by the lobby list, enriched from the party, never the reverse**: a member EOS admitted but the party has not accepted yet becomes a dimmed placeholder (shortened PUID + `—`), so the row count can never disagree with `MEMBERS N/4`. **`hostFirst` hoists the owner to the top** — EOS returns members in arbitrary order, and the crowned-row-then-separator design only reads right if the owner is there; a stable partition, not a sort, so only that one row moves. Carries name + class only — the redesign dropped the level/hp columns. DOM-free so both rules are unit-testable (`src/__tests__/lobbyMemberRows.test.ts`) | Implemented |
-| `inventory/views/lobbyTheme.ts` | Lobby-tab-only `LobbyPalette` (panel bg/edge, green code, separator — **Figma variables from node `1413:3678`, not eyedropped**; no scrollbar colours, the list wears the shared `.inv-scroll` bar) + `LobbyLayout` geometry + `LobbyHeadingStyle`, the one uppercase-heading style the section labels, the `MEMBERS` header and the button plate's label all share (three copies before). The width arithmetic is load-bearing and closes exactly: `ColumnWidth 250 − 2×PanelBorder 4 − 2×PanelPaddingX 12 = ContentWidth 218 = RowWidth 214 + ScrollbarWidth 4`, because the row plate must be drawn at its native 214px or the belt baked into it blurs. Kept OUT of the shared `InvTheme`: none of these colours appear elsewhere in the window, and the lobby must be able to restyle when it moves to its own frame | Implemented |
-| `inventory/views/lobbyAssets.ts` | `LobbyAsset` — public URLs for the lobby chrome sprites exported from Figma node `1413:3678`, served from `public/assets/ui/lobby/`: row plates (idle/local), crown, grey unknown-class shield, the brown icon-button cap/fill, the orange Leave cap-left/cap-right/fill, and the eye/clipboard glyphs. Same shape as `support/assets.ts`, kept separate so the lobby's chrome can move with it to its own frame. All pixel-art → `image-rendering: pixelated` | Implemented |
-| `inventory/views/LobbyButton.tsx` | The lobby's two **three-sliced** sprite buttons — fixed 5×30 end caps either side of a body that tiles a 3×30 fill, so a button stretches without smearing the pixel art: `LobbyButton` (orange full-width Leave plate; its left/right caps are *distinct exports*, not one mirrored) and `LobbyIconButton` (30×30 brown button with a full-bleed 30×30 glyph over it, `tooltip` mandatory and doubling as `aria-label`). Also exports `LobbySeparator`, the 3px rule the design draws under the host row | Implemented |
+| `lobby/roomCodeDisplay.ts` | Pure `roomCodeCells(roomCode, revealed)` + `RoomCodeText` (length/mask char/empty dash) — models the lobby window's code readout as one cell per **real** character flagged masked or not, so `RoomCodeReadout` can hide the glyph and paint a dot over it instead of substituting narrower text (which would reflow the row and shift the icon buttons). `—` single cell outside a lobby. Extracted so the states are unit-testable in the node test env | Implemented |
+| `lobby/LobbyPanel.tsx` | Exports **`LobbyPanel`** (the window body) and **`useLobbyViewState`** (the hook `LobbyWindow` reads to decide the title and whether to draw the tabs, so the two cannot disagree). Forks three ways: **offline** → the join-by-code input (Enter submits) + `Join` alone, collapsing the window to the design's 139px (Figma `1411:1927`); **in a lobby** → `ROOM CODE` + eye/clipboard `LobbyIconButton`s over the green code (masked by default; the design ships one eye sprite, so the dots-vs-digits readout carries the toggle state) + the member list; **guest only** → a full-width `LEAVE LOBBY` plate, because a host leaves through the offline mode tab instead. `lobbyError` renders last as a red line. Bus-only — emits `ui_joinLobby`/`ui_leaveLobby`, reads the `lobby*` events via `useBus`, and rehydrates on mount via `lobbySnapshotRequest`→`lobbySnapshot {roomCode, members, hostPuid, localPuid, mode}`. **`lobbySnapshot` is the only writer of those five fields** — `wireLobbyCommands` republishes it after create/join/leave/mode-change, so the one-shot handlers here only clear the stale error line. Takes `party` as a PROP rather than subscribing: `playerJoined` fires at battle start, long before this window mounts. Takes NO role flag — it re-derives `lobbyRole(state)` from the state it already holds, so the guest matrix has one definition. Imports nothing from `src/network`. Was `inventory/views/LobbyView.tsx` (the LOBBY tab) until the mode header made the lobby its own window | Implemented |
+| `lobby/LobbyWindow.tsx` | The whole designed window: crimson title-bar texture + `lobbyTitle(mode)` (`PUBLIC LOBBY` / `PRIVATE LOBBY` / `LOBBY (OFFLINE)`), the host-only mode-tab header + its 3px rule, `LobbyPanel`, and the ornate footer texture. Calls `lobbyRole(state)` once and omits the **whole header** (tabs + rule) for a guest; the panel re-derives the same role rather than being handed a flag, so no caller can produce a guest with tabs *and* no Leave button. Both textures are exported at half size and drawn 2× under `pixelated`. Its header wears `LobbyPanelColumn` from `lobbyTheme` — the same column the panel does, so the window's side borders cannot seam between them | Implemented |
+| `lobby/LobbyModeTabs.tsx` | The three three-sliced sprite mode tabs (public / private / offline) — **the lobby's whole control surface**: each emits `ui_setLobbyMode(mode)` and `app/hooks/lobbyCommands.ts` decides whether that means create, re-label or leave. The active tab wears the gold cap/fill and the dark glyph variant (the idle glyph would read as a smudge on light gold); the crown sits 7px above the active tab **only for the owner**. Built from the shared `spritePlate` primitives, not its own copies of them. A guest never reaches it: `LobbyWindow` omits the entire header, since the design draws no tab row for them and a row of dead controls invites a click that can only fail | Implemented |
+| `lobby/lobbyMode.ts` | Pure, DOM-free model of the header: `lobbyTitle(mode)`, the `LobbyModeTabs` table in design order `[public, private, offline]` (glyph + active glyph + idle cap/fill + that fill's **native tile width** — the green plate's slice is 5px and the brown one 3px, and tiling either at the wrong width smears the bevel baked in), `tabSprites(tab, isActive)` (the active look — gold plate + gold body + dark glyph — resolved in ONE place, because picking each separately at the render site is how a gold tab ends up wearing the idle glyph), `isLobbyHost(hostPuid, localPuid)` which is **false when either PUID is null** so two nulls outside a lobby cannot compare equal into a false yes, and `lobbyRole(state)` → `host|guest|offline`, the ONE derivation the whole render matrix reads (no component takes a role flag as a prop; it is deliberately not on the bus, which would be a second source of truth for what the snapshot's two PUIDs already determine). Unit-tested by `src/__tests__/lobbyMode.test.ts` | Implemented |
+| `lobby/LobbyPopover.tsx` | Floats `LobbyWindow` over the game for the HUD's **lobby button** — the only lobby surface there is since the inventory LOBBY tab was removed. Backdrop-dismissed, anchored to the button row's **right** edge opening upward (the window is far wider than one button, so it hangs off the row, not off its own leftmost button). Contributes **no chrome**: the window paints all four of its own edges now, so this is position + backdrop + a `drop-shadow` (which follows the textured silhouette, unlike a `box-shadow` rectangle) | Implemented |
+| `lobby/index.ts` | Public interface of the lobby deep module — exports `LobbyPopover` and nothing else; `HUD.tsx` is the sole consumer | Implemented |
+| `lobby/LobbyMemberList.tsx` | The lobby member list: `MEMBERS` / `N/4` header over one **214×34 sprite plate** per EOS lobby member (`row-idle.png`, `row-local.png` for the local player), scrollable at 6 rows, pending rows dimmed. The belt ornament and the dark class-icon well are **baked into the plate**, so a row positions three things over that background: catalog class icon 28×28 at (19,3) via `useClassIconMap()` (falling back to `class-unknown.png`), `crown.png` 32×18 for the owner, and the name in Inter 14. One 3px rule sits **under the host row only**. Ported from Figma node `1413:3678`; replaced the CSS plate-gradient chrome | Implemented |
+| `lobby/lobbyMemberRows.ts` | Pure `buildLobbyMemberRows({members, party, hostPuid, localPuid})` + `shortPuid` + `LobbyCapacity.MaxMembers` (mirrors `MAX_LOBBY_MEMBERS` in `src-tauri/src/eos/lobby/create.rs` — host + 3 guests) + `memberCountLabel(count)` (`N/4`, **unclamped**, so a debug fake party reads `5/4` instead of a false `4/4`) — joins the EOS lobby roster (bare PUIDs) against the battle party (`PartyRoster`, identity only) by `PeerId`. **Rows are driven by the lobby list, enriched from the party, never the reverse**: a member EOS admitted but the party has not accepted yet becomes a dimmed placeholder (shortened PUID + `—`), so the row count can never disagree with `MEMBERS N/4`. **`hostFirst` hoists the owner to the top** — EOS returns members in arbitrary order, and the crowned-row-then-separator design only reads right if the owner is there; a stable partition, not a sort, so only that one row moves. Carries name + class only — the redesign dropped the level/hp columns. DOM-free so both rules are unit-testable (`src/__tests__/lobbyMemberRows.test.ts`) | Implemented |
+| `lobby/lobbyTheme.ts` | Lobby-window-only `LobbyPalette` (panel bg/edge, green code, separator, the join field's well, the error red) — **Figma variables from node `1413:3678`, not eyedropped**; no scrollbar colours (the list wears the shared `.hud-scroll` bar) and **no font families** (those are app-wide faces from `HUD/hudFonts`; only COLOURS are this window's own to drift) + `LobbyLayout` geometry + `LobbyHeadingStyle`, the one uppercase-heading style the section labels, the `MEMBERS` header and the button plate's label all share (three copies before) + `LobbyPanelColumn`, the body column the panel and the mode header both wear so the window's 4px side borders are declared once and cannot seam where the two meet. The width arithmetic is load-bearing and closes exactly: `ColumnWidth 250 − 2×PanelBorder 4 − 2×PanelPaddingX 12 = ContentWidth 218 = RowWidth 214 + ScrollbarWidth 4`, because the row plate must be drawn at its native 214px or the belt baked into it blurs. Kept OUT of `InvTheme`: none of these colours appear elsewhere | Implemented |
+| `lobby/lobbyAssets.ts` | `LobbyAsset` — public URLs for the lobby chrome sprites exported from Figma nodes `1413:3678` + the three mode frames (`1411:2053`/`1413:3056`/`1411:1927`), served from `public/assets/ui/lobby/`: row plates (idle/local), crown, grey unknown-class shield, the brown icon-button cap/fill, the orange Leave cap-left/cap-right/fill, the eye/clipboard glyphs, **the 125×15 title-bar and 125×20 footer textures (drawn 2×)**, and the mode tabs' green idle + gold active cap/fill plus the six 30×30 mode glyphs (`tab-icon-{public,private,offline}{,-active}` — same silhouettes, the `-active` twin drawn dark for the light gold plate). All pixel-art → `image-rendering: pixelated` | Implemented |
+| `lobby/spritePlate.ts` | The three-slice plate every lobby control is built from: `PlateCap` / `PlateCapMirrored` (the fixed 5×30 bevelled ends) / `PlateBase` / `plateBodyStyle(fillUrl, fillWidth, centerContent?)`. `fillWidth` is the sprite's **native** slice width and must be passed as such — tiling at any other width smears the bevel baked in, and the mode tabs' green plate is 5px where the brown button body is 3px. Extracted because `LobbyButton` and `LobbyModeTabs` each carried a byte-identical copy of the cap/tile rule | Implemented |
+| `lobby/LobbyButton.tsx` | The lobby's two sprite buttons, both built from `spritePlate`: `LobbyButton` (orange full-width Leave/Join plate; its left/right caps are *distinct exports*, not one mirrored) and `LobbyIconButton` (30×30 brown button with a full-bleed 30×30 glyph over it, `tooltip` mandatory and doubling as `aria-label`). Also exports `LobbySeparator`, the 3px rule the design draws under the host row | Implemented |
 | `inventory/TabScaffold.tsx` | Shared tab primitives: `TabFrame`, `Card`, `Btn`, `Toggle`, `TextStyles`. The `IconBtn` variant (+ its hover-tooltip style) was **removed** with the lobby port: the Lobby tab was its only consumer and now uses the sprite `LobbyIconButton`, so it stood as dead code. A future shared icon button should come back with a live consumer | Implemented |
-| `inventory/theme.ts` | `InvTheme` tokens (New Amsterdam @500 / Inter), `RarityFill` (flat legacy field, now only the `Rarity` type anchor + rarity enumeration source — no longer painted), `RarityGradient` (the per-rarity gradient field painted behind EVERY slot/cell — bag, equip, drag ghost, loot-reveal — verbatim from Figma; moved here from `loot-reveal/lootReveal.ts` so the whole inventory + loot popup share one source), `RarityTextColor` (bright per-rarity accent — the tooltip item NAME and the assetless placeholder glyph both read the tier from this one color; promoted here from `grid/ItemTooltip.tsx`), `Rarity` | Implemented |
+| `inventory/theme.ts` | `InvTheme` tokens — its colours are this window's own; its three font families are re-exported from `HUD/hudFonts` so no second window can declare the same face — `RarityFill` (flat legacy field, now only the `Rarity` type anchor + rarity enumeration source — no longer painted), `RarityGradient` (the per-rarity gradient field painted behind EVERY slot/cell — bag, equip, drag ghost, loot-reveal — verbatim from Figma; moved here from `loot-reveal/lootReveal.ts` so the whole inventory + loot popup share one source), `RarityTextColor` (bright per-rarity accent — the tooltip item NAME and the assetless placeholder glyph both read the tier from this one color; promoted here from `grid/ItemTooltip.tsx`), `Rarity` | Implemented |
 | `inventory/support/rarity.ts` | `RARITY_ORDER` (low→high, off the facade — no consumer outside this file), `DEFAULT_RARITY`, `rarityRank(rarity)` (O(1) lookup; it is read inside sort comparators) — the ranking the bag (best-first) and the loot-reveal grid (rarest-last) share, so **those two** can only differ in SIGN, never in which tier is rarer. NOT app-wide: `victory/rarityLoot.ts` and `dashboard/src/loot/lootModel.ts` keep their own copies and structurally cannot import this one (deep-module boundary / separate package) — unifying means moving the order into `shared/`. Lives in `support/` because those two are sibling subgroups that cannot import each other. The list is hand-written, NOT `Object.keys(RarityFill)`, so reshuffling a color map can't reorder gameplay surfaces; `rarityRank.test.ts` guards its completeness against the `Rarity` union | Implemented |
-| `inventory/support/scrollbar.ts` + `scrollbar.css` | The window's ONE scrollbar: `InvScrollClass` (`.inv-scroll`) worn by every scrollable area in the module (bag grid, loot-reveal grid, category dropdown, lobby member list, each tab body — five of the six used the browser default before) plus `invScrollWidth(px)`, a `--inv-scroll-w` custom-property override for the one consumer whose layout arithmetic depends on the width (the loot grid pins 4px). CSS because `::-webkit-scrollbar*` is unreachable from inline styles; square corners + 1px ink outline (a rounded pill reads as OS chrome here), `InvTheme.tanDim` thumb lifting to gold on hover. Replaced the per-instance `<style>` tag `LootGrid` used to inject | Implemented |
+| `HUD/hudScrollbar.ts` + `hudScrollbar.css` | The HUD's ONE scrollbar: `HudScrollClass` (`.hud-scroll`) worn by every scrollable area in every HUD window (bag grid, loot-reveal grid, category dropdown, each inventory tab body, the lobby member list — most used the browser default before) plus `hudScrollWidth(px)`, a `--hud-scroll-w` custom-property override for the consumers whose layout arithmetic depends on the width (the loot grid and the lobby member list each pin 4px). CSS because `::-webkit-scrollbar*` is unreachable from inline styles; square corners + 1px ink outline (a rounded pill reads as OS chrome here), `InvTheme.tanDim` thumb lifting to gold on hover. Lives at HUD level, **not** in `inventory/support/`: owning it there made the lobby import the inventory's facade for a widget unrelated to inventory, and the `Inv*` name taught readers the bar was inventory's. Replaced the per-instance `<style>` tag `LootGrid` used to inject | Implemented |
+| `HUD/hudFonts.ts` | `HudFont` — the app's three faces (New Amsterdam display / Inter body / Jersey 25 pixel), declared once. `InvTheme` and the lobby's chrome both read it: a font family is not per-window styling, and a second declaration silently keeps a dangling family when one is renamed or the fallback stack is corrected | Implemented |
 | `inventory/assets.ts` | `InvAsset` chrome-sprite URLs (UI chrome only; item/character art from catalog) | Implemented |
 | `inventory/constants.ts` | `InventoryLayout` geometry | Implemented |
 | `src/fonts.css` | Bundled `@font-face` (New Amsterdam, Inter) from `public/assets/fonts/*.woff2`; imported by `main.tsx` | Implemented |
@@ -286,8 +295,9 @@ outside (`HUD.tsx`). See `docs/architecture/inventory-menu.md`.
 | `src/network/private/PatchesRpc.ts` | `PatchesRpc` — `RpcContract<Uint8Array>` named `"PatchNetStates"`; typed channel for schema delta broadcast/receive | Implemented |
 | `src/network/RpcContract.ts` | `RpcContract<T>` interface — typed `{ name, schema }` contract for `sendRPC`/`registerRPC` | Implemented |
 | `src/network/LobbyManager.ts` | Membership holder — `getFriends()` gates `HostManager` broadcast/send recipients; `setMembers()`/`setRoomCode()` mutated live by `EosLobbyBridge`; seeded fixed in the in-memory MVP | Implemented |
-| `src/network/lobby/EosLobbyBridge.ts` | Orchestrates create/join/leave via a `LobbyPort`; mints/normalizes room codes (`RoomCode`); pushes rosters into `LobbyManager.setMembers()`; emits `lobbyCreated`/`lobbyJoined`/`lobbyLeft`/`lobbyMembersChanged`/`lobbyError` bus events. Also owns the guest **host-loss fallback**: `hostLost` (from the host's `PARTY_CLOSED`) or the cached owner going absent from a refreshed roster / a `closed` status → `handleHostLost()` → `partyEnded` + resilient `leave()`. `leave()` clears local state in a `finally` so a rejected EOS leave can't strand the player as a guest. Owner tracking is **one always-set id plus an explicit role**: `ownerPuid`/`getOwnerPuid()` is sampled from `getOwner()` on **both** create and join (null only means "no lobby" or "EOS refused to say"), and a separate `joinedAsGuest` boolean is what the host-loss watchdog guards on — so the Lobby tab can crown the owner on every client without arming the fallback for a host | Implemented |
-| `src/network/lobby/LobbyPort.ts` | `LobbyPort` interface + `TauriLobbyPort` (invokes `eos_create_lobby`/`eos_join_lobby`/`eos_leave_lobby`/`eos_get_lobby_members`/`eos_get_lobby_owner`; subscribes `eos_lobby_member_changed`); `LobbyMemberChange` type | Implemented |
+| `src/network/lobby/EosLobbyBridge.ts` | Orchestrates create/join/leave/**set-mode** via a `LobbyPort`; mints/normalizes room codes (`RoomCode`); pushes rosters into `LobbyManager.setMembers()`; emits `lobbyCreated`/`lobbyJoined`/`lobbyLeft`/`lobbyMembersChanged`/`lobbyError` bus events. `create(mode)` adopts the mode it created with, `join()` pulls it off the lobby (after `lobbyId` is set, or the tracker's own filter would reject it), `setMode(mode)` **throws for a guest** so a wiring bug is loud rather than a write EOS silently rejects, and `getMode()` answers the snapshot. Also owns the guest **host-loss fallback**: `hostLost` (from the host's `PARTY_CLOSED`) or the cached owner going absent from a refreshed roster / a `closed` status → `handleHostLost()` → `partyEnded` + resilient `leave()`. `leave()` clears local state in a `finally` so a rejected EOS leave can't strand the player as a guest. Owner tracking is **one always-set id plus an explicit role**: `ownerPuid`/`getOwnerPuid()` is sampled from `getOwner()` on **both** create and join (null only means "no lobby" or "EOS refused to say"), and a separate `joinedAsGuest` boolean is what the host-loss watchdog guards on — so the lobby window can crown the owner on every client without arming the fallback for a host | Implemented |
+| `src/network/lobby/LobbyModeTracker.ts` | The lobby mode's whole lifecycle, split out of the bridge because none of it touches the roster or the host-loss fallback: the local copy (`get`/`adopt`/`reset`), the read-back (`pull` → `getLobbyMode`), and `watch()` — the `eos_lobby_updated` subscription that is a guest's ONLY way to learn its host re-labelled the room. Filters updates by `lobbyId` (the EOS notify is process-wide). `lobbyModeChanged` fires **only on an actual change**, since the host's own write comes back to it as an update event. `toLobbyMode` narrows the raw attribute; an absent one reads **private** — understating how open a room is, is the harmless direction. A failed read keeps the previous label rather than claiming offline | Implemented |
+| `src/network/lobby/LobbyPort.ts` | `LobbyPort` interface + `TauriLobbyPort` (invokes `eos_create_lobby {code, mode}`/`eos_join_lobby`/`eos_leave_lobby`/`eos_get_lobby_members`/`eos_get_lobby_owner`/`eos_get_lobby_mode`/`eos_set_lobby_mode`; subscribes `eos_lobby_member_changed` and `eos_lobby_updated` through one shared `subscribe` helper); `LobbyMemberChange` + `LobbyUpdate` types | Implemented |
 | `src/network/lobby/roomCode.ts` | `RoomCode` — `generate`/`isValid`/`normalize` for 6-char unambiguous room codes | Implemented |
 | `src/network/lobby/lobbyBridge.ts` | `lobbyBridge`/`lobbyRoster` singletons — process-wide `EosLobbyBridge` + dedicated `LobbyManager` tracking the real EOS lobby roster (separate from the in-memory RPC gate until `RelayClient` lands) | Implemented |
 | `src/network/lobby/index.ts` | Facade for the nested lobby deep module (re-exported by `network/index.ts`; unreachable directly from outside `network`) | Implemented |
@@ -489,7 +499,8 @@ outside (`HUD.tsx`). See `docs/architecture/inventory-menu.md`.
 | `src/__tests__/partyZonePosition.test.ts` | Unit tests for `PARTY_ZONE_POSITION` end-to-end (host broadcast + targeted send → guest `adoptPartyPosition`): guest adopts the party's zone/battler, keeps it across a simulated generation rebuild after host loss, does not unlock the adopted zone, emits `zoneChanged` once, ignores repeats/unknown zones, clamps an out-of-range index | Implemented |
 | `src/__tests__/partyClosedRpc.test.ts` | Unit tests for `PartyClosedRpc` delivery — the host's broadcast reaches every guest exactly once (guards `GuestNetworkManager`'s per-`guest_id` filter), and stops after the guest generation unsubscribes | Implemented |
 | `src/__tests__/partyLeaveAnnounce.test.ts` | Regression tests for the departure-announce routing window: the real `EosLobbyBridge` drives the real `RelayClient` over the shared `LobbyManager`, proving `LEAVE_PARTY`/`PARTY_CLOSED` reach the wire on `lobbyLeaving` and cannot on `lobbyLeft` | Implemented |
-| `src/__tests__/roomCodeDisplay.test.ts` | Unit tests for the Lobby tab's code readout cells — revealed leaves every cell unmasked, hidden marks them masked while **keeping the same characters** (the no-reflow guarantee), one cell per code character, single unmasked dash outside a lobby | Implemented |
+| `src/__tests__/lobbyMode.test.ts` | Unit tests for the lobby window's pure mode model: the three titles, the tab table's **design order** (which tab lights up is how a player reads the mode, so a reorder silently mislabels every lobby), distinct idle/active glyphs, the two lobby modes plated alike and offline differently, each idle body's own tile width, and `isLobbyHost` returning **false for two nulls** — the case that would otherwise crown a local player outside any lobby and show a guest the host's tabs | Implemented |
+| `src/__tests__/roomCodeDisplay.test.ts` | Unit tests for the lobby window's code readout cells — revealed leaves every cell unmasked, hidden marks them masked while **keeping the same characters** (the no-reflow guarantee), one cell per code character, single unmasked dash outside a lobby | Implemented |
 | `src/__tests__/AuthManager.test.ts` | Unit tests for PUID capture: `getPuid()` returns steam/epic `product_user_id`, `null` after dev fallback, survives sessionStorage round-trip (mocks `invoke` + `devToken`) | Implemented |
 | `src/__tests__/pingProtocol.test.ts` | Unit tests for the P2P echo wire format: encode/decode round-trip, ping/pong/other classification | Implemented |
 | `src/__tests__/GearManager.test.ts` | Unit tests for `GearManager` — load/query, RPC round-trip for `equip`/`unequip`, cache persistence, SyncQueue enqueue, bus event emission, `buildGearNetState` mapping | Implemented |
diff --git a/public/assets/ui/lobby/tab-cap-active.png b/public/assets/ui/lobby/tab-cap-active.png
new file mode 100644
index 0000000000000000000000000000000000000000..e6d1822a0ac18ab1d6be62ea00c28ec07b3f6d8d
GIT binary patch
literal 199
zcmeAS@N?(olHy`uVBq!ia0vp^tUxTs!3HFs)Lq#Nq!^2X+?^QKos)S9<glbW`Z_W&
zZ0zU$lL%5-=;`7Zq7j^&;=pv5ck6#glNbS&g6BWA4WxBCbP6*5DzUkhH2xECWK%0)
z{652;$0tEhqrm(>^Rhse#Dow5-V6Q#u0cJFEshD#J;e-o!)HzjJruCxneE|osyZD<
t7^X2cRbH+Nn9Mt+Q-FoBgN2!yp?IZ19?zm}H-VNjc)I$ztaD0e0sw~fJ%IoK

literal 0
HcmV?d00001

diff --git a/public/assets/ui/lobby/tab-cap-idle.png b/public/assets/ui/lobby/tab-cap-idle.png
new file mode 100644
index 0000000000000000000000000000000000000000..d0f9c3b3081d6baadac9c112128ac826eddee019
GIT binary patch
literal 195
zcmeAS@N?(olHy`uVBq!ia0vp^tUxTs!3HFs)Lq#Nq!^2X+?^QKos)S9<glbW`Z_W&
zZ0zU$lL%6o>*?Ycq7j^&;=pv5ck6#glNbS&g6BWA4WxBCbP6*5DzUkhH2!b<!{hUU
zX_M3`9-jn34F=8zhAsu39<D`<zc^QUbQv}naM<iC6!$qCs+Ky{z+m2gj%f|*Y#Vq4
p&dk2nJS%5`Pm2PFgNlR%!^%*DoozQK>jN!j@O1TaS?83{1OU5lJbeHF

literal 0
HcmV?d00001

diff --git a/public/assets/ui/lobby/tab-fill-active.png b/public/assets/ui/lobby/tab-fill-active.png
new file mode 100644
index 0000000000000000000000000000000000000000..0b7fd00092691d06780532baf0235fa748613c0c
GIT binary patch
literal 134
zcmeAS@N?(olHy`uVBq!ia0vp^%s?#1!3HE>CM@{{q!^2X+?^QKos)S9<T!Y`IEF|}
zO@5QN;_rC|R-N*B`<pgON|+wCcxcq~U%X3kis6bwp@s&A20cX+EOmIc3(8D!NZH8U
h<E#-pQKY$;K|qw}*QpZ|_5sae@O1TaS?83{1OUUGDgFQe

literal 0
HcmV?d00001

diff --git a/public/assets/ui/lobby/tab-fill-idle.png b/public/assets/ui/lobby/tab-fill-idle.png
new file mode 100644
index 0000000000000000000000000000000000000000..d9bd8d8ec34474c4caa13262acb6bf4ef3f133c9
GIT binary patch
literal 126
zcmeAS@N?(olHy`uVBq!ia0vp^tUxTs!3HFs)Lq#Nq!^2X+?^QKos)S9<XCvRIEH9U
zOn#HM;_vwewupB&^{slx4y@2T*10lB?GlHxs&Lzh6%P!AkIa*J!}Qo7WYY?du0#$d
Zh7EF@ufvxZ2LR1r@O1TaS?83{1OW6CDIEX+

literal 0
HcmV?d00001

diff --git a/public/assets/ui/lobby/tab-icon-offline-active.png b/public/assets/ui/lobby/tab-icon-offline-active.png
new file mode 100644
index 0000000000000000000000000000000000000000..52a33e07a555069274ab60d6fdf77c6d29d57ce3
GIT binary patch
literal 279
zcmeAS@N?(olHy`uVBq!ia0vp^av;pX1|+Qw)-3{3jKx9jP7LeL$-D$|SkfJR9T^xl
z_H+M9WCijMdb&7<czC~^lE~L&z~k25&iFXi=Yhq%1CKKv#dZ`)o={(Vv%hbvQS+>Q
zEgMWv$DOhhlX?Dr#f!De>}8KX{I}qy&))n)4{MCyrbg*_O0JICTi|&r;)!)t`bp2m
zG~UHx(~lkX6qqA3%k<3m|9(Czxl@e8O7FzAy}ET(xqrT^QfRu*O268)14;)TFWs=x
z+K-i6c5m^!SAD9Q4&{>+#JAnwyYo@QQID-NLLWtR86TDD7uoSBp}3`cnSQ|U6*me~
boMteD%_)k{D!=&)=oto2S3j3^P6<r_TU&HD

literal 0
HcmV?d00001

diff --git a/public/assets/ui/lobby/tab-icon-offline.png b/public/assets/ui/lobby/tab-icon-offline.png
new file mode 100644
index 0000000000000000000000000000000000000000..b5a36b4ad5666600aaba6d33247e94cae74ad06f
GIT binary patch
literal 289
zcmeAS@N?(olHy`uVBq!ia0vp^av;pX1|+Qw)-3{3jKx9jP7LeL$-D$|SkfJR9T^xl
z_H+M9WCik1d%8G=cz7pEur5xx!RV&pD{{lk_S60;lMJV@GoF7pH}%7*7{5uD3JzP?
za;6<(u$(5mRAT;81BX>leFCKP6;d=g1QxSN3Zxq99$0ZSf>Gn40Mn5bj%>}=)(06(
zxhF6(r~JNgU~kLEL+9rGH!zD3;40`;W?mF*x-Nl@afYh`L$a_}j>}Jp@Iy>LJML7d
zpE`a+hm~={`wfu}K1tHERK<&!oY`(1xxjc+OgWmXD_B6jWuvOaD&`3f7aU=IdWg}Z
kXPH=kQ(%L%fdK=<9^+E?u7Ba@f!<>9boFyt=akR{0L4yX%m4rY

literal 0
HcmV?d00001

diff --git a/public/assets/ui/lobby/tab-icon-private-active.png b/public/assets/ui/lobby/tab-icon-private-active.png
new file mode 100644
index 0000000000000000000000000000000000000000..cc3e0ce5874651a7c0e6b853a7b869edd4e3befc
GIT binary patch
literal 206
zcmeAS@N?(olHy`uVBq!ia0vp^av;pX1|+Qw)-3{3jKx9jP7LeL$-D$|SkfJR9T^xl
z_H+M9WCijoJY5_^JiL=7SQjVUV06>)HQ5pN^7sF1y|V-4SXN}NFwWSTuXa*rl1TDq
z5jKylb23_g=(I8h>7+MZVqsMDc5IL^HE`H+^a|TzvBxY6TAVoq7PGOj)t5CfW{D~=
zv$35yuA(WYYjly(Fe@Qp%M&S}H6jx@B_tSb8af-!w=K*Dx`Dyd)z4*}Q$iB}3nM+s

literal 0
HcmV?d00001

diff --git a/public/assets/ui/lobby/tab-icon-private.png b/public/assets/ui/lobby/tab-icon-private.png
new file mode 100644
index 0000000000000000000000000000000000000000..066fa49e1435ab96eb28e1e6851d4b384e5ebb71
GIT binary patch
literal 207
zcmeAS@N?(olHy`uVBq!ia0vp^av;pX1|+Qw)-3{3jKx9jP7LeL$-D$|SkfJR9T^xl
z_H+M9WCijoJzX3_JiL=7SQjVUV06>)H8~OW>i7MKlTxRe8#aIMGxF)a=QAl%Me|si
zCeMT{%ZpqeBe|HDM4V$;%E{z3t%<=fE1@BydnK=%?lDdW&UOI>H(nl|e{WcruV^{2
z@$k&(_YAU$N?F95bmhQ-jFYBZZU;3KgbfTB7@mByw_acOxC-b922WQ%mvv4FO#t9*
BL3scG

literal 0
HcmV?d00001

diff --git a/public/assets/ui/lobby/tab-icon-public-active.png b/public/assets/ui/lobby/tab-icon-public-active.png
new file mode 100644
index 0000000000000000000000000000000000000000..6ed441c919d580bc6126cdd8400d1c0cbe23a6e7
GIT binary patch
literal 351
zcmeAS@N?(olHy`uVBq!ia0vp^av;pX1|+Qw)-3{3jKx9jP7LeL$-D$|SkfJR9T^xl
z_H+M9WChA`db&7<czC~^vYYpifk2yVme&ym51S)G8yIAjH?RnAU{SuXkwK@i!h@$l
z<7IQ*X>rSQKa<>DJSOfx)<5U{<hR|SN*67SF1r=pT=(hs*JZya-wZihe*A^aqo&VQ
zQ|#}_-<9Y8l~q`gwrz^SPFa4l<<rgge|KInrDN)MpXfueG3u;8+9Zz5(mY#ddB%6U
zi|ZRNPEW5NNfwo^XFP8=*k<wFNt9JIbaCx*DmwUaalw)!WrZ_WGU=&D7v8Zo|2dao
zt?}We1@}82Jn>y}K$|Vk=%ph=*;lV11+`BH-$w8&aoj6>BWr%I5M<%@UnxrLMKcpQ
v!*aZVmJ}Gq=n4EO`a5fXr*P-Gg;&IF;-3}s@79$E1`>m(tDnm{r-UW|ske^E

literal 0
HcmV?d00001

diff --git a/public/assets/ui/lobby/tab-icon-public.png b/public/assets/ui/lobby/tab-icon-public.png
new file mode 100644
index 0000000000000000000000000000000000000000..3d39c6b7b0db92cd32b1504030d6b7c9965be24d
GIT binary patch
literal 340
zcmV-a0jvIrP)<h;3K|Lk000e1NJLTq0015U0015c1^@s6J20-I00001b5ch_0Itp)
z=>Px#1ZP1_K>z@;j|==^1poj5{z*hZR7gwhlrav1FcgN1*I@Myu8!QnIB7hBt8w)R
zMknJP7+t-CE9b!cO&=-nx3p-YA^jF8JpM0jA61FO<jBl5iruZK7xSgQf4&~-ye^}2
zydSKNMV;rlzOSlE-4A7EO9hd$dOaXGUxZ49SozFcTi73iAt}H+)Yu|qAj=F}^u%4M
z;FAih#wG8Gne<awCS7U<_Hc-h8lfjfLv+DXp>ce{c5|6W4J?y(9NTAKXS0qLT%8^C
zI|)oaMhcu_&<#6nuipCoWz#IPPYS$2F4&CqAcEi-$L{gy8HY-RSo!}PnZT9`KB>TJ
mSQZFAxxUTM#EHbzQ0fg){L?&FcYXZ;0000<MNUMnLSTZ}@{slb

literal 0
HcmV?d00001

diff --git a/public/assets/ui/lobby/window-bottom.png b/public/assets/ui/lobby/window-bottom.png
new file mode 100644
index 0000000000000000000000000000000000000000..1dbae8d7744275b87d79bda225f14df642af0c67
GIT binary patch
literal 498
zcmV<O0S*3%P)<h;3K|Lk000e1NJLTq004ae000yS1^@s6pnEd600001b5ch_0Itp)
z=>Px#1ZP1_K>z@;j|==^1poj6oJmAMRA@u(na@hYKoEyFUK5laEiHl|q-VYP0D?C`
zkAjaTcvR?3@BzHlvjIVn7CjavIag+qpG>ytpW`|^A1t$>O_|NNo6V%jX#a5G1g~H3
zNz*ly;5*)Fq7e}$Jwi-+gd`W2=Zh>$n?vXBZtrbRSH|_t)!&|8mQ}sdi{g!&p%>|x
zrKf4i&CrW<+}hJ==^Og+y|VOPZ;zXy7wMR#&t{+8482Ilt=qd12PQp2xK5wXzxjaf
z`QwL2b#=O|Q&*w+{e<thC4D&Tb6myb>4jr<u*)&ek2r<~@;o^^=D1B&f)`Z&xuJrZ
zyZrd!xGCT1wBFB`q*qmaaR!6_(t{ldmeT1vA%eUqU&xlT+{gcn<l};dIz~WamD2qe
zY|<lYbQ))CPnQKe`e^^5hL;nyD_;l({xKoX^Cy1DP~N^XLiPc#^rpX&;<@06+j~eW
zp-T|*qt%Ps8$q*O3a4!ive*4iNFYzF^!zmExDD$6T*0K4;-z#cT;oG*7f}pSiYG|2
o>=UsFC!!hXx@{~b;m$et3*a@%3BV#DG5`Po07*qoM6N<$g0ENXPXGV_

literal 0
HcmV?d00001

diff --git a/public/assets/ui/lobby/window-top.png b/public/assets/ui/lobby/window-top.png
new file mode 100644
index 0000000000000000000000000000000000000000..da121c2199bfa641a8bc5bca198a17caee0de37c
GIT binary patch
literal 356
zcmV-q0h|7bP)<h;3K|Lk000e1NJLTq004ae000jN1^@s6$!fsw00001b5ch_0Itp)
z=>Px#1ZP1_K>z@;j|==^1poj64oO5oR9Hu2WS|h7^UeDYWsU+m0i(^6D2g|VG=n1i
z-s4A5-YB3KP?D9SDB_u*G+AIY!UqOW8txQD`Y0HhfRU6s`M}=mP!<EjZ2r3p&Ek4c
z-YB3qsC{{fA@!p&l*ho};H(K{5eDFTp^wY;znmI3SO6b*bn7dWH5%yy4bUT<*!U~@
zwwn=Lyn`6X5jqNnAAm(Thz+mPM<agt0^|q>0hET^Xv7acfF9u>Fxq+_fdC`YNofU+
zg24~4#V1OnkB+bnKLCnP^lmvk(#eVN(fWU20IA`Q9`WD`o|p(nw+Pfv2La^1;wYdG
zz!mm{`s%PTd&V^e0sqO#u`r8A!N37>GMt<mHv<4~Y<zY~_!MXW0000<MNUMnLSTYV
CzL1gt

literal 0
HcmV?d00001

diff --git a/src-tauri/src/eos/lobby/attr.rs b/src-tauri/src/eos/lobby/attr.rs
index c42f9979..aa6d7cf7 100644
--- a/src-tauri/src/eos/lobby/attr.rs
+++ b/src-tauri/src/eos/lobby/attr.rs
@@ -26,7 +26,7 @@ pub(super) fn lobby_id_to_string(id: sys::EOS_LobbyId) -> String {
 #[cfg(test)]
 mod tests {
     use super::*;
-    use crate::eos::lobby::ROOM_CODE_KEY;
+    use crate::eos::lobby::{MODE_KEY, ROOM_CODE_KEY};
     use std::ffi::CString;
 
     #[test]
@@ -41,6 +41,21 @@ mod tests {
         assert_eq!(read_value, "ABC123");
     }
 
+    /// The mode rides the same string-attribute path as the room code — a lobby whose
+    /// MODE arrived as a non-string would be untitled for every member.
+    #[test]
+    fn mode_attribute_is_a_string_under_its_own_key() {
+        let key = CString::new(MODE_KEY).unwrap();
+        let value = CString::new("private").unwrap();
+        let attr = make_string_attr(&key, &value);
+        assert_eq!(attr.ValueType, sys::EOS_EAttributeType_EOS_AT_STRING);
+        assert_ne!(MODE_KEY, ROOM_CODE_KEY);
+        let read_key = unsafe { CStr::from_ptr(attr.Key) }.to_str().unwrap();
+        assert_eq!(read_key, MODE_KEY);
+        let read_value = unsafe { CStr::from_ptr(attr.Value.AsUtf8) }.to_str().unwrap();
+        assert_eq!(read_value, "private");
+    }
+
     #[test]
     fn null_lobby_id_stringifies_to_empty() {
         assert_eq!(lobby_id_to_string(std::ptr::null()), "");
diff --git a/src-tauri/src/eos/lobby/create.rs b/src-tauri/src/eos/lobby/create.rs
index 98f07cdd..c5392cb9 100644
--- a/src-tauri/src/eos/lobby/create.rs
+++ b/src-tauri/src/eos/lobby/create.rs
@@ -1,116 +1,65 @@
-// @Architecture(descriptionShort="EOS Lobby create flow: CreateLobby → advertise CODE attribute via a lobby modification; leaves the lobby if advertising fails.")
-//! Create a public lobby and advertise its room code.
+// @Architecture(descriptionShort="EOS Lobby create flow: CreateLobby → advertise the CODE and MODE attributes in one modification; leaves the lobby if advertising fails.")
+//! Create a public lobby and advertise its room code and mode.
 
 use std::ffi::CString;
 
 use eos_rs::sys;
 
 use super::super::platform::{pump_until_outcome, RawPlatform};
-use super::attr::make_string_attr;
 use super::leave::leave_lobby;
-use super::async_ops::{new_op, on_create, on_update};
-use super::ROOM_CODE_KEY;
+use super::async_ops::{new_op, on_create};
+use super::modify::{add_string_attribute, modify_lobby};
+use super::{LobbyHandle, LobbyRef, LobbySetup, MODE_KEY, ROOM_CODE_KEY};
 
 const LOBBY_BUCKET_ID:  &str = "typelords:mvp";
 const MAX_LOBBY_MEMBERS: u32 = 4;
 
-/// Create a public lobby and advertise `code` as its `CODE` attribute so a
-/// searcher can find it. Returns the EOS lobby id.
+/// Create a public lobby, then advertise `code` as its `CODE` attribute so a searcher
+/// can find it and `mode` as its `MODE` attribute so every member can read whether it
+/// is public or private. Returns the EOS lobby id.
+///
+/// Takes a bare `LobbyHandle` rather than a `LobbyRef`: this is the one lobby operation with no
+/// lobby to name yet.
 pub fn create_lobby(
     platform: &RawPlatform,
-    lobby:    sys::EOS_HLobby,
-    local:    sys::EOS_ProductUserId,
-    code:     &str,
+    handle:   LobbyHandle,
+    setup:    LobbySetup,
 ) -> Result<String, String> {
-    let lobby_id = submit_create(platform, lobby, local)?;
-    if let Err(e) = advertise_code(platform, lobby, local, &lobby_id, code) {
+    let lobby_id = submit_create(platform, handle)?;
+    let target = handle.in_lobby(&lobby_id);
+    if let Err(e) = advertise(platform, target, setup) {
         // The lobby exists but is unfindable (no CODE attribute) and the caller
         // never learns its id — leave it instead of stranding the creator inside.
-        let _ = leave_lobby(platform, lobby, local, &lobby_id);
+        let _ = leave_lobby(platform, target);
         return Err(e);
     }
     Ok(lobby_id)
 }
 
-fn submit_create(
-    platform: &RawPlatform,
-    lobby:    sys::EOS_HLobby,
-    local:    sys::EOS_ProductUserId,
-) -> Result<String, String> {
+fn submit_create(platform: &RawPlatform, handle: LobbyHandle) -> Result<String, String> {
     let bucket = CString::new(LOBBY_BUCKET_ID).map_err(|e| format!("bad bucket id: {e}"))?;
     let (context, rx) = new_op();
     let options = sys::EOS_Lobby_CreateLobbyOptions {
         ApiVersion:      sys::EOS_LOBBY_CREATELOBBY_API_LATEST as i32,
-        LocalUserId:     local,
+        LocalUserId:     handle.local,
         MaxLobbyMembers: MAX_LOBBY_MEMBERS,
+        // PUBLICADVERTISED for a private lobby too — see `mode.rs` for why the mode is
+        // an attribute rather than this field.
         PermissionLevel: sys::EOS_ELobbyPermissionLevel_EOS_LPL_PUBLICADVERTISED,
         bAllowInvites:   sys::EOS_TRUE as i32,
         BucketId:        bucket.as_ptr(),
         bEnableJoinById: sys::EOS_TRUE as i32,
         ..Default::default()
     };
-    unsafe { sys::EOS_Lobby_CreateLobby(lobby, &options, context, Some(on_create)) };
+    unsafe { sys::EOS_Lobby_CreateLobby(handle.lobby, &options, context, Some(on_create)) };
     pump_until_outcome(platform, rx)
 }
 
-fn advertise_code(
-    platform: &RawPlatform,
-    lobby:    sys::EOS_HLobby,
-    local:    sys::EOS_ProductUserId,
-    lobby_id: &str,
-    code:     &str,
-) -> Result<(), String> {
-    let modification = begin_modification(lobby, local, lobby_id)?;
-    let result = add_code_attribute(modification, code).and_then(|_| submit_update(platform, lobby, modification));
-    unsafe { sys::EOS_LobbyModification_Release(modification) };
-    result
-}
-
-fn begin_modification(
-    lobby:    sys::EOS_HLobby,
-    local:    sys::EOS_ProductUserId,
-    lobby_id: &str,
-) -> Result<sys::EOS_HLobbyModification, String> {
-    let id_cstr = CString::new(lobby_id).map_err(|e| format!("bad lobby id: {e}"))?;
-    let options = sys::EOS_Lobby_UpdateLobbyModificationOptions {
-        ApiVersion:  sys::EOS_LOBBY_UPDATELOBBYMODIFICATION_API_LATEST as i32,
-        LocalUserId: local,
-        LobbyId:     id_cstr.as_ptr(),
-    };
-    let mut handle: sys::EOS_HLobbyModification = std::ptr::null_mut();
-    let res = unsafe { sys::EOS_Lobby_UpdateLobbyModification(lobby, &options, &mut handle) };
-    if res != sys::EOS_EResult_EOS_Success {
-        return Err(format!("EOS_Lobby_UpdateLobbyModification failed: result={res:?}"));
-    }
-    Ok(handle)
-}
-
-fn add_code_attribute(modification: sys::EOS_HLobbyModification, code: &str) -> Result<(), String> {
-    let key = CString::new(ROOM_CODE_KEY).map_err(|e| format!("bad code key: {e}"))?;
-    let value = CString::new(code).map_err(|e| format!("bad room code: {e}"))?;
-    let attribute = make_string_attr(&key, &value);
-    let options = sys::EOS_LobbyModification_AddAttributeOptions {
-        ApiVersion: sys::EOS_LOBBYMODIFICATION_ADDATTRIBUTE_API_LATEST as i32,
-        Attribute:  &attribute,
-        Visibility: sys::EOS_ELobbyAttributeVisibility_EOS_LAT_PUBLIC,
-    };
-    let res = unsafe { sys::EOS_LobbyModification_AddAttribute(modification, &options) };
-    if res != sys::EOS_EResult_EOS_Success {
-        return Err(format!("EOS_LobbyModification_AddAttribute failed: result={res:?}"));
-    }
-    Ok(())
-}
-
-fn submit_update(
-    platform:     &RawPlatform,
-    lobby:        sys::EOS_HLobby,
-    modification: sys::EOS_HLobbyModification,
-) -> Result<(), String> {
-    let (context, rx) = new_op();
-    let options = sys::EOS_Lobby_UpdateLobbyOptions {
-        ApiVersion:              sys::EOS_LOBBY_UPDATELOBBY_API_LATEST as i32,
-        LobbyModificationHandle: modification,
-    };
-    unsafe { sys::EOS_Lobby_UpdateLobby(lobby, &options, context, Some(on_update)) };
-    pump_until_outcome(platform, rx).map(|_| ())
+/// Both attributes go into ONE modification: a lobby that advertised its code but not
+/// its mode would be joinable yet untitled, and there is no reason to pay two updates.
+fn advertise(platform: &RawPlatform, target: LobbyRef, setup: LobbySetup) -> Result<(), String> {
+    modify_lobby(platform, target, /*writeCodeAndMode=*/ |modification| {
+        add_string_attribute(modification, ROOM_CODE_KEY, setup.code)?;
+        add_string_attribute(modification, MODE_KEY, setup.mode)
+    })
 }
diff --git a/src-tauri/src/eos/lobby/details.rs b/src-tauri/src/eos/lobby/details.rs
new file mode 100644
index 00000000..c033b9d4
--- /dev/null
+++ b/src-tauri/src/eos/lobby/details.rs
@@ -0,0 +1,75 @@
+// @Architecture(descriptionShort="LobbyDetails access shared by the member list and the attribute readers: copy a details handle from inside the lobby, and read one public string attribute by key.")
+//! `EOS_HLobbyDetails` is the read side of a lobby. Every reader needs the same
+//! handle, so copying (and releasing) it lives here rather than in each caller.
+
+use std::ffi::{CStr, CString};
+
+use eos_rs::sys;
+
+use super::LobbyRef;
+
+/// Copy a details handle for a lobby the local user is **already in**. The caller
+/// owns the handle and must `EOS_LobbyDetails_Release` it.
+pub(super) fn copy_details_handle(target: LobbyRef) -> Result<sys::EOS_HLobbyDetails, String> {
+    let id_cstr = CString::new(target.lobby_id).map_err(|e| format!("bad lobby id: {e}"))?;
+    let options = sys::EOS_Lobby_CopyLobbyDetailsHandleOptions {
+        ApiVersion:  sys::EOS_LOBBY_COPYLOBBYDETAILSHANDLE_API_LATEST as i32,
+        LobbyId:     id_cstr.as_ptr(),
+        LocalUserId: target.local(),
+    };
+    let mut details: sys::EOS_HLobbyDetails = std::ptr::null_mut();
+    let res = unsafe { sys::EOS_Lobby_CopyLobbyDetailsHandle(target.lobby(), &options, &mut details) };
+    if res != sys::EOS_EResult_EOS_Success {
+        return Err(format!("EOS_Lobby_CopyLobbyDetailsHandle failed: result={res:?}"));
+    }
+    Ok(details)
+}
+
+/// Read one public string attribute off `target`. A key the lobby never carried is
+/// `Ok(None)`, not an error: a lobby created by an older client has no `MODE`, and
+/// the caller decides what to fall back to.
+pub(super) fn read_string_attribute(target: LobbyRef, key: &str) -> Result<Option<String>, String> {
+    let details = copy_details_handle(target)?;
+    let value = copy_string_attribute(details, key);
+    unsafe { sys::EOS_LobbyDetails_Release(details) };
+    value
+}
+
+fn copy_string_attribute(
+    details: sys::EOS_HLobbyDetails,
+    key:     &str,
+) -> Result<Option<String>, String> {
+    let key_cstr = CString::new(key).map_err(|e| format!("bad attribute key {key}: {e}"))?;
+    let options = sys::EOS_LobbyDetails_CopyAttributeByKeyOptions {
+        ApiVersion: sys::EOS_LOBBYDETAILS_COPYATTRIBUTEBYKEY_API_LATEST as i32,
+        AttrKey:    key_cstr.as_ptr(),
+    };
+    let mut attribute: *mut sys::EOS_Lobby_Attribute = std::ptr::null_mut();
+    let res = unsafe { sys::EOS_LobbyDetails_CopyAttributeByKey(details, &options, &mut attribute) };
+    if res == sys::EOS_EResult_EOS_NotFound {
+        return Ok(None);
+    }
+    if res != sys::EOS_EResult_EOS_Success {
+        return Err(format!("EOS_LobbyDetails_CopyAttributeByKey({key}) failed: result={res:?}"));
+    }
+    let value = unsafe { utf8_value(attribute) };
+    unsafe { sys::EOS_Lobby_Attribute_Release(attribute) };
+    Ok(value)
+}
+
+/// `None` for any attribute that is not a non-null UTF-8 string — a mistyped
+/// attribute is indistinguishable from an absent one as far as the caller cares.
+unsafe fn utf8_value(attribute: *mut sys::EOS_Lobby_Attribute) -> Option<String> {
+    if attribute.is_null() {
+        return None;
+    }
+    let data = (*attribute).Data;
+    if data.is_null() || (*data).ValueType != sys::EOS_EAttributeType_EOS_AT_STRING {
+        return None;
+    }
+    let raw = (*data).Value.AsUtf8;
+    if raw.is_null() {
+        return None;
+    }
+    Some(CStr::from_ptr(raw).to_string_lossy().into_owned())
+}
diff --git a/src-tauri/src/eos/lobby/join.rs b/src-tauri/src/eos/lobby/join.rs
index 1f390cf8..d08ca3b8 100644
--- a/src-tauri/src/eos/lobby/join.rs
+++ b/src-tauri/src/eos/lobby/join.rs
@@ -8,21 +8,19 @@ use eos_rs::sys;
 use super::super::platform::{pump_until_outcome, RawPlatform};
 use super::attr::make_string_attr;
 use super::async_ops::{new_op, on_find, on_join};
-use super::ROOM_CODE_KEY;
+use super::{LobbyHandle, ROOM_CODE_KEY};
 
 const SEARCH_MAX_RESULTS: u32 = 1;
 
 /// Find the lobby advertising `code` and join it. Returns the EOS lobby id.
-pub fn join_lobby(
-    platform: &RawPlatform,
-    lobby:    sys::EOS_HLobby,
-    local:    sys::EOS_ProductUserId,
-    code:     &str,
-) -> Result<String, String> {
-    let search = create_search(lobby, code)?;
-    let details = find_lobby(platform, search, local);
+///
+/// Like `create_lobby`, this takes a bare `LobbyHandle`: there is no lobby to name until the search
+/// resolves one.
+pub fn join_lobby(platform: &RawPlatform, handle: LobbyHandle, code: &str) -> Result<String, String> {
+    let search = create_search(handle.lobby, code)?;
+    let details = find_lobby(platform, search, handle.local);
     let joined = details.and_then(|details| {
-        let result = submit_join(platform, lobby, local, details);
+        let result = submit_join(platform, handle, details);
         unsafe { sys::EOS_LobbyDetails_Release(details) };
         result
     });
@@ -97,17 +95,16 @@ fn copy_first_result(search: sys::EOS_HLobbySearch) -> Result<sys::EOS_HLobbyDet
 
 fn submit_join(
     platform: &RawPlatform,
-    lobby:    sys::EOS_HLobby,
-    local:    sys::EOS_ProductUserId,
+    handle:   LobbyHandle,
     details:  sys::EOS_HLobbyDetails,
 ) -> Result<String, String> {
     let (context, rx) = new_op();
     let options = sys::EOS_Lobby_JoinLobbyOptions {
         ApiVersion:         sys::EOS_LOBBY_JOINLOBBY_API_LATEST as i32,
         LobbyDetailsHandle: details,
-        LocalUserId:        local,
+        LocalUserId:        handle.local,
         ..Default::default()
     };
-    unsafe { sys::EOS_Lobby_JoinLobby(lobby, &options, context, Some(on_join)) };
+    unsafe { sys::EOS_Lobby_JoinLobby(handle.lobby, &options, context, Some(on_join)) };
     pump_until_outcome(platform, rx)
 }
diff --git a/src-tauri/src/eos/lobby/leave.rs b/src-tauri/src/eos/lobby/leave.rs
index 813f3b83..58173279 100644
--- a/src-tauri/src/eos/lobby/leave.rs
+++ b/src-tauri/src/eos/lobby/leave.rs
@@ -7,20 +7,16 @@ use eos_rs::sys;
 
 use super::super::platform::{pump_until_outcome, RawPlatform};
 use super::async_ops::{new_op, on_leave};
+use super::LobbyRef;
 
-pub fn leave_lobby(
-    platform: &RawPlatform,
-    lobby:    sys::EOS_HLobby,
-    local:    sys::EOS_ProductUserId,
-    lobby_id: &str,
-) -> Result<(), String> {
-    let id_cstr = CString::new(lobby_id).map_err(|e| format!("bad lobby id: {e}"))?;
+pub fn leave_lobby(platform: &RawPlatform, target: LobbyRef) -> Result<(), String> {
+    let id_cstr = CString::new(target.lobby_id).map_err(|e| format!("bad lobby id: {e}"))?;
     let (context, rx) = new_op();
     let options = sys::EOS_Lobby_LeaveLobbyOptions {
         ApiVersion:  sys::EOS_LOBBY_LEAVELOBBY_API_LATEST as i32,
-        LocalUserId: local,
+        LocalUserId: target.local(),
         LobbyId:     id_cstr.as_ptr(),
     };
-    unsafe { sys::EOS_Lobby_LeaveLobby(lobby, &options, context, Some(on_leave)) };
+    unsafe { sys::EOS_Lobby_LeaveLobby(target.lobby(), &options, context, Some(on_leave)) };
     pump_until_outcome(platform, rx).map(|_| ())
 }
diff --git a/src-tauri/src/eos/lobby/members.rs b/src-tauri/src/eos/lobby/members.rs
index e29473e2..daf243e6 100644
--- a/src-tauri/src/eos/lobby/members.rs
+++ b/src-tauri/src/eos/lobby/members.rs
@@ -1,31 +1,23 @@
-// @Architecture(descriptionShort="EOS Lobby member enumeration + owner lookup: copy a LobbyDetails handle and list every member PUID or read the owner PUID. Synchronous, no pump.")
+// @Architecture(descriptionShort="EOS Lobby member enumeration + owner lookup: list every member PUID or read the owner PUID off a LobbyDetails handle. Synchronous, no pump.")
 //! Enumerate the members of a lobby and read its owner.
 
-use std::ffi::CString;
-
 use eos_rs::sys;
 
 use super::super::p2p::puid_to_string;
+use super::details::copy_details_handle;
+use super::LobbyRef;
 
-/// List the PUIDs of every member of `lobby_id` (includes the local user).
-pub fn list_members(
-    lobby:    sys::EOS_HLobby,
-    local:    sys::EOS_ProductUserId,
-    lobby_id: &str,
-) -> Result<Vec<String>, String> {
-    let details = copy_details_handle(lobby, local, lobby_id)?;
+/// List the PUIDs of every member of the lobby (includes the local user).
+pub fn list_members(target: LobbyRef) -> Result<Vec<String>, String> {
+    let details = copy_details_handle(target)?;
     let members = enumerate_members(details);
     unsafe { sys::EOS_LobbyDetails_Release(details) };
     Ok(members)
 }
 
-/// Read the PUID of the current owner of `lobby_id`.
-pub fn get_lobby_owner(
-    lobby:    sys::EOS_HLobby,
-    local:    sys::EOS_ProductUserId,
-    lobby_id: &str,
-) -> Result<String, String> {
-    let details = copy_details_handle(lobby, local, lobby_id)?;
+/// Read the PUID of the lobby's current owner.
+pub fn get_lobby_owner(target: LobbyRef) -> Result<String, String> {
+    let details = copy_details_handle(target)?;
     let options = sys::EOS_LobbyDetails_GetLobbyOwnerOptions {
         ApiVersion: sys::EOS_LOBBYDETAILS_GETLOBBYOWNER_API_LATEST as i32,
     };
@@ -37,25 +29,6 @@ pub fn get_lobby_owner(
     Ok(puid_to_string(owner))
 }
 
-fn copy_details_handle(
-    lobby:    sys::EOS_HLobby,
-    local:    sys::EOS_ProductUserId,
-    lobby_id: &str,
-) -> Result<sys::EOS_HLobbyDetails, String> {
-    let id_cstr = CString::new(lobby_id).map_err(|e| format!("bad lobby id: {e}"))?;
-    let options = sys::EOS_Lobby_CopyLobbyDetailsHandleOptions {
-        ApiVersion:  sys::EOS_LOBBY_COPYLOBBYDETAILSHANDLE_API_LATEST as i32,
-        LobbyId:     id_cstr.as_ptr(),
-        LocalUserId: local,
-    };
-    let mut details: sys::EOS_HLobbyDetails = std::ptr::null_mut();
-    let res = unsafe { sys::EOS_Lobby_CopyLobbyDetailsHandle(lobby, &options, &mut details) };
-    if res != sys::EOS_EResult_EOS_Success {
-        return Err(format!("EOS_Lobby_CopyLobbyDetailsHandle failed: result={res:?}"));
-    }
-    Ok(details)
-}
-
 fn enumerate_members(details: sys::EOS_HLobbyDetails) -> Vec<String> {
     let count_options = sys::EOS_LobbyDetails_GetMemberCountOptions {
         ApiVersion: sys::EOS_LOBBYDETAILS_GETMEMBERCOUNT_API_LATEST as i32,
diff --git a/src-tauri/src/eos/lobby/mod.rs b/src-tauri/src/eos/lobby/mod.rs
index fca0fc0c..3c08e6ea 100644
--- a/src-tauri/src/eos/lobby/mod.rs
+++ b/src-tauri/src/eos/lobby/mod.rs
@@ -1,4 +1,4 @@
-// @Architecture(descriptionShort="Facade of the EOS Lobby deep module: re-exports create/join/leave/members + member-status notifications over raw FFI. Private submodules run only on the EOS thread.")
+// @Architecture(descriptionShort="Facade of the EOS Lobby deep module: re-exports create/join/leave/members/mode + member-status and lobby-update notifications over raw FFI. Private submodules run only on the EOS thread.")
 //! EOS Lobby Interface over raw FFI via `eos_rs::sys`.
 //!
 //! `eos-rs` v0.1.1 exposes no typed Lobby wrapper, so this mirrors the raw-FFI
@@ -12,23 +12,77 @@
 //! resolves it to a `LobbyDetails` handle, then `JoinLobby`. Membership changes
 //! surface through `register_member_status_notify` → drained by the event loop.
 //!
+//! Lobby mode: a second public attribute, `MODE` (`public`/`private`), written beside
+//! `CODE` at creation and re-written by the owner afterwards. Changes surface through
+//! `register_lobby_update_notify`. See `mode.rs` for why it is an attribute and not
+//! `EOS_ELobbyPermissionLevel`.
+//!
 //! This module is a deep module inside the `eos` deep module: `mod.rs` is the only
 //! public interface. The submodules below are private and split along the concerns
 //! that used to be horizontal-rule sections of a single file.
 
+use eos_rs::sys;
+
 mod async_ops;
 mod attr;
 mod create;
+mod details;
 mod join;
 mod leave;
 mod members;
+mod mode;
+mod modify;
 mod notify;
 
 pub use create::create_lobby;
 pub use join::join_lobby;
 pub use leave::leave_lobby;
 pub use members::{get_lobby_owner, list_members};
-pub use notify::{register_member_status_notify, MemberChange, MEMBER_CHANGED_EVENT};
+pub use mode::{get_lobby_mode, set_lobby_mode};
+pub use notify::{
+    register_lobby_update_notify, register_member_status_notify,
+    LobbyUpdate, MemberChange, LOBBY_UPDATED_EVENT, MEMBER_CHANGED_EVENT,
+};
 
 /// Public attribute key advertising the room code on a lobby; shared by create + join.
 const ROOM_CODE_KEY: &str = "CODE";
+
+/// Public attribute key carrying the lobby's mode (`public`/`private`).
+const MODE_KEY: &str = "MODE";
+
+/// Who is acting, through which interface — everything a lobby call needs *before* a lobby
+/// exists. `create_lobby` is the only operation in that position; every other one names an
+/// existing lobby and takes a `LobbyRef`.
+#[derive(Clone, Copy)]
+pub struct LobbyHandle {
+    pub lobby: sys::EOS_HLobby,
+    pub local: sys::EOS_ProductUserId,
+}
+
+impl LobbyHandle {
+    /// Name an existing lobby through this handle.
+    pub fn in_lobby(self, lobby_id: &str) -> LobbyRef<'_> {
+        LobbyRef { handle: self, lobby_id }
+    }
+}
+
+/// The identity of a lobby the local user is already in — what every read (`details`, `members`,
+/// `mode`) and every write (`modify`, `leave`) operates on. A real concept, not a lint dodge: five
+/// submodules take exactly this and nothing else.
+#[derive(Clone, Copy)]
+pub struct LobbyRef<'a> {
+    pub handle:   LobbyHandle,
+    pub lobby_id: &'a str,
+}
+
+impl LobbyRef<'_> {
+    pub fn lobby(&self) -> sys::EOS_HLobby { self.handle.lobby }
+    pub fn local(&self) -> sys::EOS_ProductUserId { self.handle.local }
+}
+
+/// What a brand-new lobby advertises about itself.
+#[derive(Clone, Copy)]
+pub struct LobbySetup<'a> {
+    pub code: &'a str,
+    pub mode: &'a str,
+}
diff --git a/src-tauri/src/eos/lobby/mode.rs b/src-tauri/src/eos/lobby/mode.rs
new file mode 100644
index 00000000..da01d4bd
--- /dev/null
+++ b/src-tauri/src/eos/lobby/mode.rs
@@ -0,0 +1,26 @@
+// @Architecture(descriptionShort="The MODE lobby attribute (public|private): written next to CODE at creation, re-written by the host on a switch, read back by any member.")
+//! The lobby's own idea of whether it is public or private.
+//!
+//! Deliberately an **attribute**, not `EOS_ELobbyPermissionLevel`: joining is a lobby
+//! *search* over `CODE` (`join.rs`), so a lobby that stopped being `PUBLICADVERTISED`
+//! would stop being joinable by its own room code. Mode is therefore a label every
+//! member can read, not an EOS access restriction.
+
+use super::super::platform::RawPlatform;
+use super::details::read_string_attribute;
+use super::modify::{add_string_attribute, modify_lobby};
+use super::{LobbyRef, MODE_KEY};
+
+/// Re-write `MODE` on a lobby that already exists. Only the owner may do this — EOS
+/// rejects an `UpdateLobby` from a non-owner, so the guard is enforced twice: once in
+/// the UI (guests are shown no tabs) and once here by the SDK.
+pub fn set_lobby_mode(platform: &RawPlatform, target: LobbyRef, mode: &str) -> Result<(), String> {
+    modify_lobby(platform, target, /*writeMode=*/ |modification| {
+        add_string_attribute(modification, MODE_KEY, mode)
+    })
+}
+
+/// Read `MODE` back. `Ok(None)` means the lobby carries no such attribute.
+pub fn get_lobby_mode(target: LobbyRef) -> Result<Option<String>, String> {
+    read_string_attribute(target, MODE_KEY)
+}
diff --git a/src-tauri/src/eos/lobby/modify.rs b/src-tauri/src/eos/lobby/modify.rs
new file mode 100644
index 00000000..d55b3f8e
--- /dev/null
+++ b/src-tauri/src/eos/lobby/modify.rs
@@ -0,0 +1,82 @@
+// @Architecture(descriptionShort="Lobby modification plumbing shared by create and mode changes: open a modification, add string attributes, submit it.")
+//! Open → mutate → submit, the three steps every lobby write shares.
+//!
+//! Extracted from `create.rs` once the `MODE` attribute gained a *post-creation*
+//! writer: creating and re-titling a lobby differ only in which attributes they add.
+
+use std::ffi::CString;
+
+use eos_rs::sys;
+
+use super::super::platform::{pump_until_outcome, RawPlatform};
+use super::async_ops::{new_op, on_update};
+use super::attr::make_string_attr;
+use super::LobbyRef;
+
+fn begin_modification(target: LobbyRef) -> Result<sys::EOS_HLobbyModification, String> {
+    let id_cstr = CString::new(target.lobby_id).map_err(|e| format!("bad lobby id: {e}"))?;
+    let options = sys::EOS_Lobby_UpdateLobbyModificationOptions {
+        ApiVersion:  sys::EOS_LOBBY_UPDATELOBBYMODIFICATION_API_LATEST as i32,
+        LocalUserId: target.local(),
+        LobbyId:     id_cstr.as_ptr(),
+    };
+    let mut handle: sys::EOS_HLobbyModification = std::ptr::null_mut();
+    let res = unsafe { sys::EOS_Lobby_UpdateLobbyModification(target.lobby(), &options, &mut handle) };
+    if res != sys::EOS_EResult_EOS_Success {
+        return Err(format!("EOS_Lobby_UpdateLobbyModification failed: result={res:?}"));
+    }
+    Ok(handle)
+}
+
+/// Add (or replace) a public string attribute. EOS overwrites an existing key rather
+/// than rejecting it, which is what makes a mode switch a plain re-add.
+pub(super) fn add_string_attribute(
+    modification: sys::EOS_HLobbyModification,
+    key:          &str,
+    value:        &str,
+) -> Result<(), String> {
+    let key_cstr = CString::new(key).map_err(|e| format!("bad attribute key {key}: {e}"))?;
+    let value_cstr = CString::new(value).map_err(|e| format!("bad value for {key}: {e}"))?;
+    let attribute = make_string_attr(&key_cstr, &value_cstr);
+    let options = sys::EOS_LobbyModification_AddAttributeOptions {
+        ApiVersion: sys::EOS_LOBBYMODIFICATION_ADDATTRIBUTE_API_LATEST as i32,
+        Attribute:  &attribute,
+        Visibility: sys::EOS_ELobbyAttributeVisibility_EOS_LAT_PUBLIC,
+    };
+    let res = unsafe { sys::EOS_LobbyModification_AddAttribute(modification, &options) };
+    if res != sys::EOS_EResult_EOS_Success {
+        return Err(format!("EOS_LobbyModification_AddAttribute({key}) failed: result={res:?}"));
+    }
+    Ok(())
+}
+
+fn submit_update(
+    platform:     &RawPlatform,
+    lobby:        sys::EOS_HLobby,
+    modification: sys::EOS_HLobbyModification,
+) -> Result<(), String> {
+    let (context, rx) = new_op();
+    let options = sys::EOS_Lobby_UpdateLobbyOptions {
+        ApiVersion:              sys::EOS_LOBBY_UPDATELOBBY_API_LATEST as i32,
+        LobbyModificationHandle: modification,
+    };
+    unsafe { sys::EOS_Lobby_UpdateLobby(lobby, &options, context, Some(on_update)) };
+    pump_until_outcome(platform, rx).map(|_| ())
+}
+
+/// Open a modification, let `write` fill it, submit it, and release the handle
+/// whatever happened — the one place that owns the handle's lifetime.
+///
+/// `begin_modification` and `submit_update` are deliberately private to this file: handing a raw
+/// `EOS_HLobbyModification` to another module would let a caller skip the `Release` below, which is
+/// the leak this module was extracted to make impossible.
+pub(super) fn modify_lobby(
+    platform: &RawPlatform,
+    target:   LobbyRef,
+    write:    impl FnOnce(sys::EOS_HLobbyModification) -> Result<(), String>,
+) -> Result<(), String> {
+    let modification = begin_modification(target)?;
+    let result = write(modification).and_then(|_| submit_update(platform, target.lobby(), modification));
+    unsafe { sys::EOS_LobbyModification_Release(modification) };
+    result
+}
diff --git a/src-tauri/src/eos/lobby/notify.rs b/src-tauri/src/eos/lobby/notify.rs
index 7b9cc167..f04eac81 100644
--- a/src-tauri/src/eos/lobby/notify.rs
+++ b/src-tauri/src/eos/lobby/notify.rs
@@ -1,5 +1,5 @@
-// @Architecture(descriptionShort="EOS Lobby member-status notifications: MemberChange type + a once-registered callback whose Sender is leaked; the event loop drains the receiver into a Tauri event.")
-//! Member status notifications (join/leave/disconnect/…).
+// @Architecture(descriptionShort="EOS Lobby notifications: member-status changes and lobby-data updates, each a once-registered callback whose Sender is leaked; the event loop drains both receivers into Tauri events.")
+//! Member status notifications (join/leave/disconnect/…) and lobby-data updates.
 
 use std::ffi::c_void;
 use std::sync::mpsc;
@@ -12,6 +12,17 @@ use super::attr::lobby_id_to_string;
 /// Tauri event emitted for every lobby member status change (join/leave/…).
 pub const MEMBER_CHANGED_EVENT: &str = "eos_lobby_member_changed";
 
+/// Tauri event emitted whenever the lobby's own data changes — today that means the
+/// host re-wrote the `MODE` attribute, which every member has to re-read.
+pub const LOBBY_UPDATED_EVENT: &str = "eos_lobby_updated";
+
+/// A lobby-data update. It carries no payload beyond the lobby it happened to: EOS
+/// reports *that* the lobby changed, never which attribute, so the receiver re-reads.
+#[derive(serde::Serialize, Clone)]
+pub struct LobbyUpdate {
+    pub lobby_id: String,
+}
+
 /// A lobby member status change, drained from the notify callback by the event loop.
 #[derive(serde::Serialize, Clone)]
 pub struct MemberChange {
@@ -65,6 +76,33 @@ pub fn register_member_status_notify(lobby: sys::EOS_HLobby) -> mpsc::Receiver<M
     receiver
 }
 
+unsafe extern "C" fn on_lobby_update(data: *const sys::EOS_Lobby_LobbyUpdateReceivedCallbackInfo) {
+    let info = &*data;
+    // Same leaked-Sender contract as on_member_status above.
+    let transmitter = &*(info.ClientData as *const mpsc::Sender<LobbyUpdate>);
+    let _ = transmitter.send(LobbyUpdate { lobby_id: lobby_id_to_string(info.LobbyId) });
+}
+
+/// Register the lobby-data notification once, on the same terms as the member-status
+/// one. Without it a guest's window would keep the mode it read at join time, and a
+/// host toggling public↔private would be invisible to everyone else in the room.
+pub fn register_lobby_update_notify(lobby: sys::EOS_HLobby) -> mpsc::Receiver<LobbyUpdate> {
+    let (transmitter, receiver) = mpsc::channel::<LobbyUpdate>();
+    let transmitter_ptr = Box::into_raw(Box::new(transmitter));
+    let options = sys::EOS_Lobby_AddNotifyLobbyUpdateReceivedOptions {
+        ApiVersion: sys::EOS_LOBBY_ADDNOTIFYLOBBYUPDATERECEIVED_API_LATEST as i32,
+    };
+    unsafe {
+        sys::EOS_Lobby_AddNotifyLobbyUpdateReceived(
+            lobby,
+            &options,
+            transmitter_ptr as *mut c_void,
+            Some(on_lobby_update),
+        );
+    }
+    receiver
+}
+
 #[cfg(test)]
 mod tests {
     use super::*;
diff --git a/src-tauri/src/eos/mod.rs b/src-tauri/src/eos/mod.rs
index e3b058b3..2739cf03 100644
--- a/src-tauri/src/eos/mod.rs
+++ b/src-tauri/src/eos/mod.rs
@@ -155,14 +155,32 @@ pub async fn eos_connect_epic_dev_auth(
     .await
 }
 
-/// Create a public lobby advertising `code` as its room code. Returns the EOS
-/// lobby id. Requires a real EOS login (a local PUID).
+/// Create a lobby advertising `code` as its room code and `mode` (`public`/`private`)
+/// as its lobby mode. Returns the EOS lobby id. Requires a real EOS login (a local PUID).
 #[tauri::command]
 pub async fn eos_create_lobby(
     code: String,
+    mode: String,
     eos:  State<'_, EosThread>,
 ) -> Result<String, String> {
-    eos_await(&eos, |reply_transmitter| EosRequest::CreateLobby { code, reply_transmitter }, LOBBY_REPLY_TIMEOUT_SECS).await
+    eos_await(&eos, |reply_transmitter| EosRequest::CreateLobby { code, mode, reply_transmitter }, LOBBY_REPLY_TIMEOUT_SECS).await
+}
+
+/// Re-write the current lobby's `MODE` attribute. Only the lobby owner may do this —
+/// EOS rejects an `UpdateLobby` from anyone else.
+#[tauri::command]
+pub async fn eos_set_lobby_mode(
+    mode: String,
+    eos:  State<'_, EosThread>,
+) -> Result<(), String> {
+    eos_await(&eos, |reply_transmitter| EosRequest::SetLobbyMode { mode, reply_transmitter }, LOBBY_REPLY_TIMEOUT_SECS).await
+}
+
+/// Read the current lobby's `MODE` attribute. `None` when the lobby carries none —
+/// the caller decides what an untitled lobby should read as.
+#[tauri::command]
+pub async fn eos_get_lobby_mode(eos: State<'_, EosThread>) -> Result<Option<String>, String> {
+    eos_await(&eos, |reply_transmitter| EosRequest::GetLobbyMode { reply_transmitter }, REPLY_TIMEOUT_SECS).await
 }
 
 /// Join the lobby advertising `code`. Returns the EOS lobby id.
diff --git a/src-tauri/src/eos/thread.rs b/src-tauri/src/eos/thread.rs
index d7c5ba8b..5a3907f1 100644
--- a/src-tauri/src/eos/thread.rs
+++ b/src-tauri/src/eos/thread.rs
@@ -44,8 +44,16 @@ pub enum EosRequest {
     },
     CreateLobby {
         code:     String,
+        mode:     String,
         reply_transmitter: oneshot::Sender<Result<String, String>>,
     },
+    SetLobbyMode {
+        mode:     String,
+        reply_transmitter: oneshot::Sender<Result<(), String>>,
+    },
+    GetLobbyMode {
+        reply_transmitter: oneshot::Sender<Result<Option<String>, String>>,
+    },
     JoinLobby {
         code:     String,
         reply_transmitter: oneshot::Sender<Result<String, String>>,
@@ -72,6 +80,7 @@ struct EosSession {
     local:            Option<sys::EOS_ProductUserId>,
     current_lobby_id: Option<String>,
     member_receiver:        mpsc::Receiver<lobby::MemberChange>,
+    lobby_update_receiver:  mpsc::Receiver<lobby::LobbyUpdate>,
 }
 
 pub struct EosThread {
@@ -137,12 +146,14 @@ fn eos_thread_main(
     let p2p = unsafe { sys::EOS_Platform_GetP2PInterface(platform.raw_handle()) };
     let lobby_handle = platform.lobby_handle();
     let member_receiver = lobby::register_member_status_notify(lobby_handle);
+    let lobby_update_receiver = lobby::register_lobby_update_notify(lobby_handle);
     let mut session = EosSession {
         p2p,
         lobby: lobby_handle,
         local: None,
         current_lobby_id: None,
         member_receiver,
+        lobby_update_receiver,
     };
     run_event_loop(&platform, &receiver, &app, &mut session);
 
@@ -168,6 +179,7 @@ fn run_event_loop(
         }
         emit_received_packets(app, session);
         emit_member_changes(app, session);
+        emit_lobby_updates(app, session);
         std::thread::sleep(std::time::Duration::from_millis(TICK_INTERVAL_MS));
     }
 }
@@ -214,8 +226,14 @@ fn handle_request(platform: &RawPlatform, session: &mut EosSession, req: EosRequ
         EosRequest::SendP2PBatch { remote_puid, packets, reply_transmitter } => {
             let _ = reply_transmitter.send(send_p2p_batch(session, &remote_puid, &packets));
         }
-        EosRequest::CreateLobby { code, reply_transmitter } => {
-            let _ = reply_transmitter.send(create_lobby(platform, session, &code));
+        EosRequest::CreateLobby { code, mode, reply_transmitter } => {
+            let _ = reply_transmitter.send(create_lobby(platform, session, lobby::LobbySetup { code: &code, mode: &mode }));
+        }
+        EosRequest::SetLobbyMode { mode, reply_transmitter } => {
+            let _ = reply_transmitter.send(set_lobby_mode(platform, session, &mode));
+        }
+        EosRequest::GetLobbyMode { reply_transmitter } => {
+            let _ = reply_transmitter.send(lobby_mode(session));
         }
         EosRequest::JoinLobby { code, reply_transmitter } => {
             let _ = reply_transmitter.send(join_lobby(platform, session, &code));
@@ -262,39 +280,53 @@ fn require_local(session: &EosSession) -> Result<sys::EOS_ProductUserId, String>
     session.local.ok_or_else(|| "EOS not logged in — no local PUID".to_string())
 }
 
-fn create_lobby(platform: &RawPlatform, session: &mut EosSession, code: &str) -> Result<String, String> {
-    let local = require_local(session)?;
-    let lobby_id = lobby::create_lobby(platform, session.lobby, local, code)?;
+/// Who we are acting as, through the lobby interface — the starting point of every lobby call,
+/// including the two (create/join) that have no lobby to name yet.
+fn lobby_handle(session: &EosSession) -> Result<lobby::LobbyHandle, String> {
+    Ok(lobby::LobbyHandle { lobby: session.lobby, local: require_local(session)? })
+}
+
+/// The handle plus the *current* lobby's id, or the reason there is no such lobby. Bundling them
+/// keeps each lobby helper at one parameter.
+fn lobby_ref(session: &EosSession) -> Result<lobby::LobbyRef<'_>, String> {
+    let handle = lobby_handle(session)?;
+    let lobby_id = session.current_lobby_id.as_deref().ok_or_else(|| "Not currently in a lobby".to_string())?;
+    Ok(handle.in_lobby(lobby_id))
+}
+
+fn create_lobby(platform: &RawPlatform, session: &mut EosSession, setup: lobby::LobbySetup) -> Result<String, String> {
+    let lobby_id = lobby::create_lobby(platform, lobby_handle(session)?, setup)?;
     session.current_lobby_id = Some(lobby_id.clone());
     Ok(lobby_id)
 }
 
+fn set_lobby_mode(platform: &RawPlatform, session: &EosSession, mode: &str) -> Result<(), String> {
+    lobby::set_lobby_mode(platform, lobby_ref(session)?, mode)
+}
+
+fn lobby_mode(session: &EosSession) -> Result<Option<String>, String> {
+    lobby::get_lobby_mode(lobby_ref(session)?)
+}
+
 fn join_lobby(platform: &RawPlatform, session: &mut EosSession, code: &str) -> Result<String, String> {
-    let local = require_local(session)?;
-    let lobby_id = lobby::join_lobby(platform, session.lobby, local, code)?;
+    let lobby_id = lobby::join_lobby(platform, lobby_handle(session)?, code)?;
     session.current_lobby_id = Some(lobby_id.clone());
     Ok(lobby_id)
 }
 
 fn leave_lobby(platform: &RawPlatform, session: &mut EosSession) -> Result<(), String> {
-    let local = require_local(session)?;
-    let lobby_id = session.current_lobby_id.clone().ok_or_else(|| "Not currently in a lobby".to_string())?;
     // Clear the id only after the leave succeeds, so a failed leave can be retried.
-    lobby::leave_lobby(platform, session.lobby, local, &lobby_id)?;
+    lobby::leave_lobby(platform, lobby_ref(session)?)?;
     session.current_lobby_id = None;
     Ok(())
 }
 
 fn lobby_members(session: &EosSession) -> Result<Vec<String>, String> {
-    let local = require_local(session)?;
-    let lobby_id = session.current_lobby_id.as_deref().ok_or_else(|| "Not currently in a lobby".to_string())?;
-    lobby::list_members(session.lobby, local, lobby_id)
+    lobby::list_members(lobby_ref(session)?)
 }
 
 fn lobby_owner(session: &EosSession) -> Result<String, String> {
-    let local = require_local(session)?;
-    let lobby_id = session.current_lobby_id.as_deref().ok_or_else(|| "Not currently in a lobby".to_string())?;
-    lobby::get_lobby_owner(session.lobby, local, lobby_id)
+    lobby::get_lobby_owner(lobby_ref(session)?)
 }
 
 fn emit_member_changes(app: &AppHandle, session: &EosSession) {
@@ -303,6 +335,12 @@ fn emit_member_changes(app: &AppHandle, session: &EosSession) {
     }
 }
 
+fn emit_lobby_updates(app: &AppHandle, session: &EosSession) {
+    while let Ok(update) = session.lobby_update_receiver.try_recv() {
+        let _ = app.emit(lobby::LOBBY_UPDATED_EVENT, update);
+    }
+}
+
 fn adopt_local_puid(session: &mut EosSession, result: &Result<EosConnectResult, String>) {
     let Ok(connect_result) = result else { return; };
     match p2p::puid_from_str(&connect_result.product_user_id) {
diff --git a/src-tauri/src/lib.rs b/src-tauri/src/lib.rs
index 859fa552..9833a210 100644
--- a/src-tauri/src/lib.rs
+++ b/src-tauri/src/lib.rs
@@ -262,6 +262,8 @@ pub fn run() {
             eos::eos_p2p_send,
             eos::eos_p2p_send_batch,
             eos::eos_create_lobby,
+            eos::eos_set_lobby_mode,
+            eos::eos_get_lobby_mode,
             eos::eos_join_lobby,
             eos::eos_leave_lobby,
             eos::eos_get_lobby_members,
diff --git a/src/__tests__/EosLobbyBridge.test.ts b/src/__tests__/EosLobbyBridge.test.ts
index 2ecef44b..f151db14 100644
--- a/src/__tests__/EosLobbyBridge.test.ts
+++ b/src/__tests__/EosLobbyBridge.test.ts
@@ -2,7 +2,7 @@ import mitt, { Emitter } from "mitt";
 
 import { EosLobbyBridge, LobbyManager } from "../network";
 import type { GameEvents } from "../bus/bus";
-import type { LobbyPort, LobbyMemberChange } from "../network";
+import type { LobbyPort, LobbyMemberChange, LobbyUpdate } from "../network";
 import { RoomCode } from "../network";
 
 // In-memory LobbyPort fake — no Tauri. Records the last code and lets a test
@@ -17,14 +17,22 @@ class FakeLobbyPort implements LobbyPort {
   ownerQueryFails = false;
   memberQueries = 0;
   membersQueue: string[][] = [];
+  /** What the lobby's MODE attribute currently says. `null` reproduces a lobby created by a build
+   *  that predates the attribute. */
+  lobbyMode: string | null = "public";
+  writtenModes: string[] = [];
+  modeQueries = 0;
+  modeQueryFails = false;
   private lobbyId = "";
   private handler: ((change: LobbyMemberChange) => void) | null = null;
+  private updateHandler: ((update: LobbyUpdate) => void) | null = null;
 
-  createLobby(code: string): Promise<string> {
+  createLobby(code: string, mode: string): Promise<string> {
     this.maybeFail();
     this.lastCreatedCode = code;
     this.members = ["self_puid"];
     this.owner = "self_puid";
+    this.lobbyMode = mode;
     this.lobbyId = `lobby_of_${code}`;
     return Promise.resolve(this.lobbyId);
   }
@@ -55,15 +63,34 @@ class FakeLobbyPort implements LobbyPort {
     if (this.ownerQueryFails) return Promise.reject(new Error("owner query failed"));
     return Promise.resolve(this.owner);
   }
+  getLobbyMode(): Promise<string | null> {
+    this.modeQueries += 1;
+    if (this.modeQueryFails) return Promise.reject(new Error("mode query failed"));
+    return Promise.resolve(this.lobbyMode);
+  }
+  setLobbyMode(mode: string): Promise<void> {
+    this.maybeFail();
+    this.writtenModes.push(mode);
+    this.lobbyMode = mode;
+    return Promise.resolve();
+  }
   onMemberChanged(handler: (change: LobbyMemberChange) => void): () => void {
     this.handler = handler;
     return () => { this.handler = null; };
   }
+  onLobbyUpdated(handler: (update: LobbyUpdate) => void): () => void {
+    this.updateHandler = handler;
+    return () => { this.updateHandler = null; };
+  }
 
   /** Defaults to the lobby we are actually in — the bridge drops changes for any other. */
   fireMemberChange(change: Partial<LobbyMemberChange> = {}): void {
     this.handler?.({ lobby_id: this.lobbyId, member_puid: "new_puid", status: "joined", ...change });
   }
+  /** Same defaulting: EOS's lobby-update notify is process-wide, so the bridge filters by id. */
+  fireLobbyUpdated(update: Partial<LobbyUpdate> = {}): void {
+    this.updateHandler?.({ lobby_id: this.lobbyId, ...update });
+  }
   hasListener(): boolean { return this.handler !== null; }
 
   private maybeFail(): void {
@@ -91,7 +118,7 @@ describe("EosLobbyBridge", () => {
     const events: Array<{ roomCode: string; lobbyId: string }> = [];
     bus.on("lobbyCreated", (e) => events.push(e));
 
-    const code = await bridge.create();
+    const code = await bridge.create("public");
 
     expect(RoomCode.isValid(code)).toBe(true);
     expect(port.lastCreatedCode).toBe(code);
@@ -146,7 +173,7 @@ describe("EosLobbyBridge", () => {
 
   it("start() refreshes membership whenever a member-change event fires", async () => {
     const { port, lobby, bridge } = setup();
-    await bridge.create();
+    await bridge.create("public");
     bridge.start();
     expect(port.hasListener()).toBe(true);
 
@@ -159,7 +186,7 @@ describe("EosLobbyBridge", () => {
 
   it("reports a failed live member refresh as lobbyError instead of an unhandled rejection", async () => {
     const { port, bus, bridge } = setup();
-    await bridge.create();
+    await bridge.create("public");
     bridge.start();
     const errors: Array<{ operation: string; message: string }> = [];
     bus.on("lobbyError", (e) => errors.push(e));
@@ -184,7 +211,7 @@ describe("EosLobbyBridge", () => {
     bus.on("lobbyError", (e) => errors.push(e));
     port.failNext = "no local PUID";
 
-    await expect(bridge.create()).rejects.toThrow("no local PUID");
+    await expect(bridge.create("public")).rejects.toThrow("no local PUID");
     expect(errors).toEqual([{ operation: "create", message: "no local PUID" }]);
   });
 
@@ -204,7 +231,7 @@ describe("EosLobbyBridge", () => {
   it("create() records us as the owner, for the host's own member table", async () => {
     const { bridge } = setup();
 
-    await bridge.create();
+    await bridge.create("public");
 
     expect(bridge.getOwnerPuid()).toBe("self_puid");
   });
@@ -227,6 +254,121 @@ describe("EosLobbyBridge", () => {
   });
 });
 
+describe("EosLobbyBridge lobby mode", () => {
+  it("starts offline and adopts the mode it created the lobby with", async () => {
+    const { port, bridge } = setup();
+    expect(bridge.getMode()).toBe("offline");
+
+    await bridge.create("private");
+
+    expect(bridge.getMode()).toBe("private");
+    expect(port.lobbyMode).toBe("private");
+  });
+
+  // The guest never picks a mode: whichever kind of room it joined is what its window must say.
+  it("join() reads the mode off the lobby instead of assuming one", async () => {
+    const { port, bridge } = setup();
+    port.lobbyMode = "private";
+
+    await bridge.join("ABC123");
+
+    expect(bridge.getMode()).toBe("private");
+  });
+
+  // A lobby created before MODE existed carries none. Reading that as "public" would tell its
+  // members a room is more open than its owner ever chose, so the absent case reads private.
+  it("titles a lobby with no MODE attribute as private", async () => {
+    const { port, bridge } = setup();
+    port.lobbyMode = null;
+
+    await bridge.join("ABC123");
+
+    expect(bridge.getMode()).toBe("private");
+  });
+
+  it("setMode() writes the attribute and announces the new mode once", async () => {
+    const { port, bus, bridge } = setup();
+    await bridge.create("public");
+    const modes: string[] = [];
+    bus.on("lobbyModeChanged", (m) => modes.push(m));
+
+    await bridge.setMode("private");
+
+    expect(port.writtenModes).toEqual(["private"]);
+    expect(modes).toEqual(["private"]);
+  });
+
+  // Guests are shown no mode tabs at all, so reaching this is already a wiring bug — it has to be
+  // loud rather than silently sending EOS a write it will reject.
+  it("refuses setMode() for a guest and reports it", async () => {
+    const { port, bus, bridge } = setup();
+    await bridge.join("ABC123");
+    const errors: Array<{ operation: string; message: string }> = [];
+    bus.on("lobbyError", (e) => errors.push(e));
+
+    await expect(bridge.setMode("public")).rejects.toThrow("only the host can change the lobby mode");
+    expect(port.writtenModes).toEqual([]);
+    expect(errors).toEqual([{ operation: "setMode", message: "only the host can change the lobby mode" }]);
+  });
+
+  // The whole point of the EOS lobby-update notify: a guest has no other way to learn that its
+  // host re-labelled the room.
+  it("re-reads the mode when the lobby-update notify fires", async () => {
+    const { port, bus, bridge } = setup();
+    await bridge.join("ABC123");
+    bridge.start();
+    const modes: string[] = [];
+    bus.on("lobbyModeChanged", (m) => modes.push(m));
+
+    port.lobbyMode = "private";
+    port.fireLobbyUpdated();
+    await flushAsyncWork();
+
+    expect(bridge.getMode()).toBe("private");
+    expect(modes).toEqual(["private"]);
+  });
+
+  // The EOS notify is process-wide and never filtered, exactly like the member-status one.
+  it("ignores a lobby-update event for a lobby we are not in", async () => {
+    const { port, bridge } = setup();
+    await bridge.join("ABC123");
+    bridge.start();
+    const queriesAfterJoin = port.modeQueries;
+
+    port.lobbyMode = "private";
+    port.fireLobbyUpdated({ lobby_id: "lobby_of_SOMEONE_ELSE" });
+    await flushAsyncWork();
+
+    expect(port.modeQueries).toBe(queriesAfterJoin);
+    expect(bridge.getMode()).toBe("public");
+  });
+
+  it("goes back offline on leave, so the window cannot claim a room we left", async () => {
+    const { bus, bridge } = setup();
+    await bridge.create("public");
+    const modes: string[] = [];
+    bus.on("lobbyModeChanged", (m) => modes.push(m));
+
+    await bridge.leave();
+
+    expect(bridge.getMode()).toBe("offline");
+    expect(modes).toEqual(["offline"]);
+  });
+
+  // A stale label beats a window that claims to be offline while the player is still in a room.
+  it("keeps the last known mode when the mode query fails", async () => {
+    const { port, bridge } = setup();
+    await bridge.create("public");
+    bridge.start();
+
+    port.modeQueryFails = true;
+    port.fireLobbyUpdated();
+    await flushAsyncWork();
+
+    expect(bridge.getMode()).toBe("public");
+  });
+});
+
 // Regression: when the host quit, the guest stayed a guest in a dead battle forever —
 // nothing inspected the member-change payload and nothing emitted lobbyLeft, the single
 // signal the role revert (useGameRole) and the relay reset (RelayClient) both hang off.
@@ -281,7 +423,7 @@ describe("EosLobbyBridge host-loss fallback", () => {
 
   it("does not eject the host when one of its own guests leaves", async () => {
     const { port, lobby, bus, bridge } = setup();
-    await bridge.create();
+    await bridge.create("public");
     bridge.start();
     const events = recordFallback(bus);
 
diff --git a/src/__tests__/lobbyCommands.test.ts b/src/__tests__/lobbyCommands.test.ts
index 291d57eb..3c005c87 100644
--- a/src/__tests__/lobbyCommands.test.ts
+++ b/src/__tests__/lobbyCommands.test.ts
@@ -1,8 +1,8 @@
 import mitt, { Emitter } from "mitt";
 
-import { wireLobbyCommands, type LobbyBridgeApi } from "../app/hooks/lobbyCommands";
+import { lobbyModeCommand, wireLobbyCommands, type LobbyBridgeApi } from "../app/hooks/lobbyCommands";
 import { LobbyManager } from "../network";
-import type { GameEvents } from "../bus/bus";
+import type { GameEvents, LobbyMode } from "../bus/bus";
 
 // In-memory stand-in for EosLobbyBridge — records calls, no Tauri/EOS. `failNext` reproduces the
 // real bridge's contract: its runGuarded reports the failure on the bus AND rethrows, and since
@@ -11,27 +11,42 @@ class FakeLobbyBridge implements LobbyBridgeApi {
   static readonly CreatedCode = "ABC234";
   static readonly SelfPuid    = "self_puid";
   static readonly HostPuid    = "host_puid";
+  static readonly JoinedMode: LobbyMode = "private";
   createCalls = 0;
   leaveCalls  = 0;
+  createdModes: LobbyMode[] = [];
+  setModes: LobbyMode[] = [];
   joinedCodes: string[] = [];
   roomCode = "";
   ownerPuid: string | null = null;
+  mode: LobbyMode = "offline";
   failNext: string | null = null;
 
-  create(): Promise<string> {
+  create(mode: LobbyMode): Promise<string> {
     const failure = this.takeFailure();
     if (failure) return failure as Promise<string>;
     this.createCalls += 1;
+    this.createdModes.push(mode);
     this.roomCode = FakeLobbyBridge.CreatedCode;
+    this.mode = mode;
     // The real bridge asks EOS who owns the lobby even when it just created it — that answer is us.
     this.ownerPuid = FakeLobbyBridge.SelfPuid;
     return Promise.resolve(this.roomCode);
   }
+  setMode(mode: LobbyMode): Promise<void> {
+    const failure = this.takeFailure();
+    if (failure) return failure;
+    this.setModes.push(mode);
+    this.mode = mode;
+    return Promise.resolve();
+  }
   join(rawCode: string): Promise<void> {
     const failure = this.takeFailure();
     if (failure) return failure;
     this.joinedCodes.push(rawCode);
     this.ownerPuid = FakeLobbyBridge.HostPuid;
+    // The real bridge reads the joined lobby's MODE attribute; a joined lobby always has one.
+    this.mode = FakeLobbyBridge.JoinedMode;
     return Promise.resolve();
   }
   leave(): Promise<void> {
@@ -40,10 +55,12 @@ class FakeLobbyBridge implements LobbyBridgeApi {
     this.leaveCalls += 1;
     this.roomCode = "";
     this.ownerPuid = null;
+    this.mode = "offline";
     return Promise.resolve();
   }
   getRoomCode(): string { return this.roomCode; }
   getOwnerPuid(): string | null { return this.ownerPuid; }
+  getMode(): LobbyMode { return this.mode; }
 
   private takeFailure(): Promise<never> | null {
     if (!this.failNext) return null;
@@ -70,21 +87,47 @@ function setup(hasSession = true) {
 
 const flushPendingPromises = () => new Promise(resolve => setTimeout(resolve, /*delayInMs=*/0));
 
+describe("lobbyModeCommand", () => {
+  it("creates from offline, and re-labels between the two lobby modes", () => {
+    expect(lobbyModeCommand("offline", "public")).toBe("create");
+    expect(lobbyModeCommand("offline", "private")).toBe("create");
+    expect(lobbyModeCommand("public", "private")).toBe("relabel");
+    expect(lobbyModeCommand("private", "public")).toBe("relabel");
+  });
+
+  // A redundant re-label is not free: it costs a backend UpdateLobby plus a LobbyUpdateReceived
+  // fan-out that makes every other member re-read an attribute that did not change.
+  it("swallows a re-click of the lobby mode already active", () => {
+    expect(lobbyModeCommand("public", "public")).toBe("none");
+    expect(lobbyModeCommand("private", "private")).toBe("none");
+  });
+
+  // The escape hatch must never be guarded. The mode is a LABEL the client can hold wrongly — a
+  // failed MODE read on join leaves the tracker saying "offline" while the player is really in a
+  // lobby — so treating offline→offline as a no-op would stand between them and leaving.
+  it("always leaves on the offline tab, even when it already believes it is offline", () => {
+    expect(lobbyModeCommand("public", "offline")).toBe("leave");
+    expect(lobbyModeCommand("private", "offline")).toBe("leave");
+    expect(lobbyModeCommand("offline", "offline")).toBe("leave");
+  });
+});
+
 describe("wireLobbyCommands", () => {
-  it("creates a lobby when the EOS session is available", async () => {
+  it("creates a lobby in the picked mode when the EOS session is available", async () => {
     const { bridge, bus, errors } = setup(/*hasSession=*/true);
 
-    bus.emit("ui_createLobby", undefined);
+    bus.emit("ui_setLobbyMode", "public");
     await flushPendingPromises();
 
     expect(bridge.createCalls).toBe(1);
+    expect(bridge.createdModes).toEqual(["public"]);
     expect(errors).toEqual([]);
   });
 
   it("refuses to create without an EOS session and says so on the bus", async () => {
     const { bridge, bus, errors } = setup(/*hasSession=*/false);
 
-    bus.emit("ui_createLobby", undefined);
+    bus.emit("ui_setLobbyMode", "private");
     await flushPendingPromises();
 
     expect(bridge.createCalls).toBe(0);
@@ -92,6 +135,47 @@ describe("wireLobbyCommands", () => {
     expect(errors[0].operation).toBe("create");
   });
 
+  // The three tabs are one command, so which of create/re-label/leave a click means is decided
+  // HERE from the mode we are already in — the window only ever says which tab was pressed.
+  it("re-labels an existing lobby instead of creating a second one", async () => {
+    const { bridge, bus, errors } = setup();
+    bus.emit("ui_setLobbyMode", "public");
+    await flushPendingPromises();
+
+    bus.emit("ui_setLobbyMode", "private");
+    await flushPendingPromises();
+
+    expect(bridge.createCalls).toBe(1);
+    expect(bridge.setModes).toEqual(["private"]);
+    expect(bridge.getMode()).toBe("private");
+    expect(errors).toEqual([]);
+  });
+
+  it("treats the offline tab as leaving, not as a mode to write", async () => {
+    const { bridge, bus } = setup();
+    bus.emit("ui_setLobbyMode", "public");
+    await flushPendingPromises();
+
+    bus.emit("ui_setLobbyMode", "offline");
+    await flushPendingPromises();
+
+    expect(bridge.leaveCalls).toBe(1);
+    expect(bridge.setModes).toEqual([]);
+    expect(bridge.createCalls).toBe(1);
+  });
+
+  // Leaving must stay ungated (see the leave test below), and routing it through the mode command
+  // would be the easy place to accidentally re-introduce the session check.
+  it("does not ask for an EOS session when the offline tab is pressed", async () => {
+    const { bridge, bus, sessionAsked } = setup(/*hasSession=*/false);
+
+    bus.emit("ui_setLobbyMode", "offline");
+    await flushPendingPromises();
+
+    expect(bridge.leaveCalls).toBe(1);
+    expect(sessionAsked()).toBe(0);
+  });
+
   it("passes the typed code straight to the bridge (which normalizes it)", async () => {
     const { bridge, bus } = setup();
 
@@ -125,7 +209,7 @@ describe("wireLobbyCommands", () => {
 
   it("answers a snapshot request with the live room code and roster", async () => {
     const { bridge, lobby, bus } = setup();
-    bus.emit("ui_createLobby", undefined);
+    bus.emit("ui_setLobbyMode", "public");
     await flushPendingPromises();
     lobby.setMembers(["self_puid", "guest_puid"]);
     const snapshots: GameEvents["lobbySnapshot"][] = [];
@@ -135,7 +219,7 @@ describe("wireLobbyCommands", () => {
 
     expect(snapshots).toEqual([{
       roomCode: bridge.getRoomCode(), members: ["self_puid", "guest_puid"],
-      hostPuid: "self_puid", localPuid: LOCAL_PUID,
+      hostPuid: "self_puid", localPuid: LOCAL_PUID, mode: "public",
     }]);
   });
 
@@ -143,7 +227,7 @@ describe("wireLobbyCommands", () => {
   // even on the create path — the bridge's guest-only flag cannot answer it.
   it("names the lobby owner even when we are the one hosting", async () => {
     const { bus } = setup();
-    bus.emit("ui_createLobby", undefined);
+    bus.emit("ui_setLobbyMode", "public");
     await flushPendingPromises();
     const snapshots: GameEvents["lobbySnapshot"][] = [];
     bus.on("lobbySnapshot", (s) => snapshots.push(s));
@@ -174,16 +258,17 @@ describe("wireLobbyCommands", () => {
 
     bus.emit("lobbySnapshotRequest", undefined);
 
-    expect(snapshots).toEqual([{ roomCode: "", members: [], hostPuid: null, localPuid: LOCAL_PUID }]);
+    expect(snapshots).toEqual([{ roomCode: "", members: [], hostPuid: null, localPuid: LOCAL_PUID, mode: "offline" }]);
   });
 
   // Each one-shot event is individually incomplete — `lobbyCreated` names the code but not the
   // owner, `lobbyJoined` names neither, `lobbyLeft` nothing at all — so this module republishes the
-  // whole snapshot on all three rather than leaving every consumer to work out which of them
-  // obliges it to re-request.
-  it("republishes the snapshot on every membership-changing event", async () => {
+  // whole snapshot on all of them rather than leaving every consumer to work out which one
+  // obliges it to re-request. `lobbyModeChanged` is on the list because a guest learns its host
+  // re-labelled the lobby ONLY through that event; nothing else fires for it.
+  it("republishes the snapshot on every membership- or mode-changing event", async () => {
     const { bridge, bus } = setup();
-    bus.emit("ui_createLobby", undefined);
+    bus.emit("ui_setLobbyMode", "public");
     await flushPendingPromises();
     const snapshots: GameEvents["lobbySnapshot"][] = [];
     bus.on("lobbySnapshot", (s) => snapshots.push(s));
@@ -191,12 +276,13 @@ describe("wireLobbyCommands", () => {
     bus.emit("lobbyCreated", { roomCode: bridge.getRoomCode(), lobbyId: "lobby-1" });
     bus.emit("lobbyJoined", { lobbyId: "lobby-1" });
     bus.emit("lobbyLeft", undefined);
+    bus.emit("lobbyModeChanged", "public");
 
     const expected = {
       roomCode: bridge.getRoomCode(), members: [],
-      hostPuid: "self_puid", localPuid: LOCAL_PUID,
+      hostPuid: "self_puid", localPuid: LOCAL_PUID, mode: "public",
     };
-    expect(snapshots).toEqual([expected, expected, expected]);
+    expect(snapshots).toEqual([expected, expected, expected, expected]);
   });
 
   // The PUID arrives with the EOS login, which can land after the app booted — reading it per
@@ -227,7 +313,7 @@ describe("wireLobbyCommands", () => {
     process.on("unhandledRejection", onUnhandled);
     bridge.failNext = "EOS not logged in — no local PUID";
 
-    bus.emit("ui_createLobby", undefined);
+    bus.emit("ui_setLobbyMode", "public");
     await flushPendingPromises();
     process.off("unhandledRejection", onUnhandled);
 
@@ -246,7 +332,7 @@ describe("wireLobbyCommands", () => {
       getLocalPuid: () => LOCAL_PUID,
     });
 
-    bus.emit("ui_createLobby", undefined);
+    bus.emit("ui_setLobbyMode", "public");
     await flushPendingPromises();
 
     expect(bridge.createCalls).toBe(0);
@@ -257,7 +343,7 @@ describe("wireLobbyCommands", () => {
     const { bridge, bus, unwire } = setup();
 
     unwire();
-    bus.emit("ui_createLobby", undefined);
+    bus.emit("ui_setLobbyMode", "public");
     bus.emit("ui_leaveLobby", undefined);
     await flushPendingPromises();
 
diff --git a/src/__tests__/lobbyMemberRows.test.ts b/src/__tests__/lobbyMemberRows.test.ts
index 1bf9c224..db79c1ae 100644
--- a/src/__tests__/lobbyMemberRows.test.ts
+++ b/src/__tests__/lobbyMemberRows.test.ts
@@ -1,4 +1,4 @@
-import { buildLobbyMemberRows, memberCountLabel, shortPuid, LobbyCapacity } from "../ui/components/HUD/inventory/views/lobbyMemberRows";
+import { buildLobbyMemberRows, memberCountLabel, shortPuid, LobbyCapacity } from "../ui/components/HUD/lobby/lobbyMemberRows";
 import type { PartyRoster, RosterMember } from "../ui/hooks/usePartyRoster";
 
 const HOST: RosterMember  = { id: "host_puid",  name: "Aldric", className: "Paladin" };
diff --git a/src/__tests__/lobbyMode.test.ts b/src/__tests__/lobbyMode.test.ts
new file mode 100644
index 00000000..ce98935a
--- /dev/null
+++ b/src/__tests__/lobbyMode.test.ts
@@ -0,0 +1,87 @@
+import { isLobbyHost, lobbyTitle, tabSprites, LobbyModeTabs } from "../ui/components/HUD/lobby/lobbyMode";
+import type { LobbyMode } from "../bus/bus";
+
+describe("lobbyTitle", () => {
+  it("names the room in the two lobby modes and the state when there is no room", () => {
+    expect(lobbyTitle("public")).toBe("PUBLIC LOBBY");
+    expect(lobbyTitle("private")).toBe("PRIVATE LOBBY");
+    expect(lobbyTitle("offline")).toBe("LOBBY (OFFLINE)");
+  });
+});
+
+describe("LobbyModeTabs", () => {
+  // The order IS the design (Figma 1411:2053 / 1413:3056 / 1411:1927): which tab lights up is how a
+  // player reads the mode, so a reordering here silently mislabels every lobby.
+  it("lists the three modes in design order", () => {
+    expect(LobbyModeTabs.map(tab => tab.mode)).toEqual<LobbyMode[]>(["public", "private", "offline"]);
+  });
+
+  it("gives every tab a distinct idle and active glyph", () => {
+    for (const tab of LobbyModeTabs) {
+      expect(tab.icon).not.toBe(tab.activeIcon);
+    }
+    const glyphs = LobbyModeTabs.flatMap(tab => [tab.icon, tab.activeIcon]);
+    expect(new Set(glyphs).size).toBe(glyphs.length);
+  });
+
+  // The two lobby modes are the same kind of thing and wear the same green plate; `offline` is the
+  // way out and wears the neutral brown one, so it never reads as a third kind of lobby.
+  it("plates the two lobby modes alike and offline differently", () => {
+    const [publicTab, privateTab, offlineTab] = LobbyModeTabs;
+    expect(publicTab.capIdle).toBe(privateTab.capIdle);
+    expect(publicTab.fillIdle).toBe(privateTab.fillIdle);
+    expect(offlineTab.fillIdle).not.toBe(publicTab.fillIdle);
+  });
+
+  // Tiling a body sprite at anything but its native slice width smears the bevel baked into it.
+  it("carries each idle body's own tile width", () => {
+    const [publicTab, , offlineTab] = LobbyModeTabs;
+    expect(publicTab.fillIdleWidth).toBe(5);
+    expect(offlineTab.fillIdleWidth).toBe(3);
+  });
+
+  it("explains every tab in words, since a 30px glyph does not", () => {
+    for (const tab of LobbyModeTabs) {
+      expect(tab.tooltip.length).toBeGreaterThan(0);
+    }
+  });
+});
+
+describe("tabSprites", () => {
+  it("hands back the tab's own idle plate, body width and glyph when it is not current", () => {
+    for (const tab of LobbyModeTabs) {
+      expect(tabSprites(tab, /*isActive=*/false))
+        .toEqual({ cap: tab.capIdle, fill: tab.fillIdle, fillWidth: tab.fillIdleWidth, glyph: tab.icon });
+    }
+  });
+
+  // The active look is one concept — gold plate, gold body, dark glyph. Picking those separately at
+  // the render site is how a tab ends up gold with the idle glyph smudged onto it.
+  it("swaps the whole active set together, and identically for every mode", () => {
+    const [publicActive, privateActive, offlineActive] = LobbyModeTabs.map(tab => tabSprites(tab, /*isActive=*/true));
+    expect(publicActive.cap).toBe(privateActive.cap);
+    expect(publicActive.cap).toBe(offlineActive.cap);
+    expect(publicActive.fill).toBe(privateActive.fill);
+    expect(publicActive.fillWidth).toBe(privateActive.fillWidth);
+    for (const [index, tab] of LobbyModeTabs.entries()) {
+      expect(tabSprites(tab, /*isActive=*/true).glyph).toBe(tab.activeIcon);
+      expect(tabSprites(tab, /*isActive=*/true).cap).not.toBe(LobbyModeTabs[index].capIdle);
+    }
+  });
+});
+
+describe("isLobbyHost", () => {
+  it("is true only when both PUIDs are known and equal", () => {
+    expect(isLobbyHost("puid_a", "puid_a")).toBe(true);
+    expect(isLobbyHost("puid_a", "puid_b")).toBe(false);
+  });
+
+  // The dangerous case: outside a lobby BOTH are null, and `null === null` would crown the local
+  // player as host of a lobby that does not exist — which would then show the mode tabs to a guest
+  // whose own PUID has not landed yet.
+  it("is false when either PUID is unknown, including when both are", () => {
+    expect(isLobbyHost(null, null)).toBe(false);
+    expect(isLobbyHost(null, "puid_a")).toBe(false);
+    expect(isLobbyHost("puid_a", null)).toBe(false);
+  });
+});
diff --git a/src/__tests__/partyLeaveAnnounce.test.ts b/src/__tests__/partyLeaveAnnounce.test.ts
index b840540f..ec5bb850 100644
--- a/src/__tests__/partyLeaveAnnounce.test.ts
+++ b/src/__tests__/partyLeaveAnnounce.test.ts
@@ -6,7 +6,7 @@ import { EosLobbyBridge, LobbyManager, RelayClient } from "../network";
 import { InMemoryTransport } from "../network/private/InMemoryTransport";
 import { PatchesRpc } from "../network/private/PatchesRpc";
 import { LeavePartyRpc, PartyClosedRpc } from "../data/managers/PartyRpcContracts";
-import type { LobbyMemberChange, LobbyPort, P2pReceived, RelayPort } from "../network";
+import type { LobbyMemberChange, LobbyPort, LobbyUpdate, P2pReceived, RelayPort } from "../network";
 
 const LOCAL = "puid_local";
 const HOST = "puid_host";
@@ -25,12 +25,15 @@ class FakeRelayPort implements RelayPort {
 }
 
 class FakeLobbyPort implements LobbyPort {
-  createLobby(_code: string): Promise<string> { return Promise.resolve(LOBBY_ID); }
+  createLobby(_code: string, _mode: string): Promise<string> { return Promise.resolve(LOBBY_ID); }
   joinLobby(_code: string): Promise<string> { return Promise.resolve(LOBBY_ID); }
   leaveLobby(): Promise<void> { return Promise.resolve(); }
   getMembers(): Promise<string[]> { return Promise.resolve([HOST, LOCAL]); }
   getOwner(): Promise<string> { return Promise.resolve(HOST); }
+  getLobbyMode(): Promise<string | null> { return Promise.resolve("public"); }
+  setLobbyMode(_mode: string): Promise<void> { return Promise.resolve(); }
   onMemberChanged(_handler: (change: LobbyMemberChange) => void): () => void { return () => {}; }
+  onLobbyUpdated(_handler: (update: LobbyUpdate) => void): () => void { return () => {}; }
 }
 
 /**
@@ -88,7 +91,7 @@ describe("party departure announces", () => {
     // so on lobbyLeft it never reached the guests either and they only recovered later via
     // their own watchdog.
     const { bus, relay, relayPort, bridge } = setupGuestInParty();
-    await bridge.create();
+    await bridge.create("public");
     await flushAsyncWork();
     bus.on("lobbyLeaving", /*announceDisband*/ () => {
       relay.hostToGuest.send(PartyClosedRpc.name, { guest_id: HOST, payload: { hostId: LOCAL } });
diff --git a/src/__tests__/roomCodeDisplay.test.ts b/src/__tests__/roomCodeDisplay.test.ts
index ea4ecef0..ba672656 100644
--- a/src/__tests__/roomCodeDisplay.test.ts
+++ b/src/__tests__/roomCodeDisplay.test.ts
@@ -1,5 +1,5 @@
 /// <reference types="jest" />
-import { roomCodeCells, RoomCodeText } from "../ui/components/HUD/inventory/views/roomCodeDisplay";
+import { roomCodeCells, RoomCodeText } from "../ui/components/HUD/lobby/roomCodeDisplay";
 
 const charsOf = (cells: ReturnType<typeof roomCodeCells>) => cells.map(cell => cell.char).join("");
 
diff --git a/src/app/hooks/lobbyCommands.ts b/src/app/hooks/lobbyCommands.ts
index 7efe6721..0f8564f0 100644
--- a/src/app/hooks/lobbyCommands.ts
+++ b/src/app/hooks/lobbyCommands.ts
@@ -1,15 +1,17 @@
-// @Architecture(descriptionShort="Bridges the HUD lobby tab's ui_* bus commands to the EOS lobby bridge behind the per-process EOS-session gate.")
+// @Architecture(descriptionShort="Bridges the lobby window's ui_* bus commands to the EOS lobby bridge behind the per-process EOS-session gate; owns the mode-tab routing (offline leaves, a mode while offline creates, a mode while hosting re-labels).")
 import type { Emitter } from "mitt";
-import type { GameEvents } from "@/bus/bus";
+import type { GameEvents, LobbyMode } from "@/bus/bus";
 
 // Structural view of EosLobbyBridge — keeps this module (and its tests) free of the
 // concrete class, so a fake needs no Tauri.
 export interface LobbyBridgeApi {
-  create(): Promise<string>;
+  create(mode: LobbyMode): Promise<string>;
+  setMode(mode: LobbyMode): Promise<void>;
   join(rawCode: string): Promise<void>;
   leave(): Promise<void>;
   getRoomCode(): string;
   getOwnerPuid(): string | null;
+  getMode(): LobbyMode;
 }
 
 // Structural view of LobbyManager (the live roster the bridge writes into).
@@ -58,16 +60,43 @@ async function eosSessionError(ensureSession: () => Promise<boolean>): Promise<s
 // `lobbyCreated` names the code but not the owner, `lobbyJoined` names neither, `lobbyLeft` nothing
 // — so the snapshot is republished after all of them rather than leaving each consumer to work out
 // which one obliges it to re-request.
-const SNAPSHOT_TRIGGERS = ["lobbySnapshotRequest", "lobbyCreated", "lobbyJoined", "lobbyLeft"] as const;
+const SNAPSHOT_TRIGGERS = ["lobbySnapshotRequest", "lobbyCreated", "lobbyJoined", "lobbyLeft", "lobbyModeChanged"] as const;
 
 function publishSnapshotOn(bus: Emitter<GameEvents>, emitSnapshot: () => void): () => void {
   SNAPSHOT_TRIGGERS.forEach(event => bus.on(event, emitSnapshot));
   return () => SNAPSHOT_TRIGGERS.forEach(event => bus.off(event, emitSnapshot));
 }
 
+/** What a mode-tab click actually asks for. The window's three tabs are ONE command, so the decision
+ *  lives here rather than in the UI, which renders a snapshot and would otherwise have to re-derive
+ *  "am I in a lobby" from roomCode-emptiness. */
+export type LobbyModeCommand = "none" | "leave" | "create" | "relabel";
+
 /**
- * Wires the lobby tab's UI→game commands to the lobby bridge for the app's lifetime.
- * Lives in the app layer because `create`/`join` must first pass the EOS-session gate
+ * Route a tab click from the mode the client is already in.
+ *
+ * `none` exists to swallow a re-click of the tab already active: a redundant `relabel` costs a
+ * backend `UpdateLobby` plus a `LobbyUpdateReceived` fan-out that makes every other member re-read
+ * the attribute, for a value that did not change.
+ *
+ * **The offline tab is deliberately exempt from that guard** — it always means `leave`, even when
+ * we already believe we are offline. The mode is a *label* the client may hold wrongly: if the
+ * `MODE` read fails on join, `LobbyModeTracker` keeps the value it had (`offline`) while the player
+ * is really in a lobby, and a guard here would leave them with no way out. A redundant leave costs
+ * one rejected IPC; a swallowed one strands the player.
+ *
+ * Pure, so the whole table is unit-testable.
+ */
+export function lobbyModeCommand(current: LobbyMode, target: LobbyMode): LobbyModeCommand {
+  if (target === "offline")  return "leave";
+  if (target === current)    return "none";
+  if (current === "offline") return "create";
+  return "relabel";
+}
+
+/**
+ * Wires the lobby window's UI→game commands to the lobby bridge for the app's lifetime.
+ * Lives in the app layer because `create`/`join`/`setMode` must first pass the EOS-session gate
  * (`authManager.ensureEosSession()`): the EOS SDK session is per-process and nothing
  * restores it on startup, so a hydrated token makes the app look logged in while the
  * EOS thread holds no PUID. `network/lobby` must not import the auth layer, and
@@ -84,8 +113,6 @@ export function wireLobbyCommands({ bridge, lobby, bus, ensureSession, getLocalP
     await runReported(run);
   };
 
-  const onCreate = () => { void runGated("create", /*createLobby*/ () => bridge.create()); };
-
   const onJoin = (rawCode: string) => {
     if (!rawCode.trim()) { fail("join", LobbyCommandMessages.NoCode); return; }
     void runGated("join", /*joinLobby*/ () => bridge.join(rawCode));
@@ -94,6 +121,17 @@ export function wireLobbyCommands({ bridge, lobby, bus, ensureSession, getLocalP
   // No session gate: leaving a lobby we are already in cannot need a fresh login.
   const onLeave = () => { void runReported(/*leaveLobby*/ () => bridge.leave()); };
 
+  // The lobby window's three mode tabs are the whole lobby control surface, so ONE command covers
+  // what used to be create, leave, and a feature that did not exist — see `lobbyModeCommand`.
+  const onSetMode = (target: LobbyMode) => {
+    switch (lobbyModeCommand(bridge.getMode(), target)) {
+      case "none":    return;
+      case "leave":   onLeave(); return;
+      case "create":  void runGated("create", /*createLobby*/ () => bridge.create(target)); return;
+      case "relabel": void runGated("setMode", /*switchLobbyMode*/ () => bridge.setMode(target));
+    }
+  };
+
   // Publishing lives HERE, not in the view: this is the only module that can read the bridge.
   const emitSnapshot = () => {
     bus.emit("lobbySnapshot", {
@@ -101,15 +139,16 @@ export function wireLobbyCommands({ bridge, lobby, bus, ensureSession, getLocalP
       members:   [...lobby.getFriends()],
       hostPuid:  bridge.getOwnerPuid(),
       localPuid: getLocalPuid(),
+      mode:      bridge.getMode(),
     });
   };
 
   const unpublish = publishSnapshotOn(bus, emitSnapshot);
-  bus.on("ui_createLobby", onCreate);
+  bus.on("ui_setLobbyMode", onSetMode);
   bus.on("ui_joinLobby", onJoin);
   bus.on("ui_leaveLobby", onLeave);
   return () => {
-    bus.off("ui_createLobby", onCreate);
+    bus.off("ui_setLobbyMode", onSetMode);
     bus.off("ui_joinLobby", onJoin);
     bus.off("ui_leaveLobby", onLeave);
     unpublish();
diff --git a/src/bus/bus.ts b/src/bus/bus.ts
index 59a8f29c..8e457878 100644
--- a/src/bus/bus.ts
+++ b/src/bus/bus.ts
@@ -17,6 +17,15 @@ export interface GearNetState {
   trinket?: string;
 }
 
+/**
+ * What the lobby window's three tabs select, and what the lobby itself remembers.
+ *
+ * `public` and `private` are the two values of the lobby's `MODE` EOS attribute and behave
+ * identically today — the label is what differs. `offline` is NOT stored anywhere: it is the
+ * absence of a lobby, which is why leaving and never having joined look the same.
+ */
+export type LobbyMode = "public" | "private" | "offline";
+
 export interface PlayerNetState {
   playerId:       string;
   characterName:  string;
@@ -112,6 +121,9 @@ export type GameEvents = {
   // Lobby (emitted by EosLobbyBridge translating EOS lobby Tauri events)
   lobbyCreated:          { roomCode: string; lobbyId: string };
   lobbyJoined:           { lobbyId: string };
+  // The lobby's public/private label changed — the host re-wrote it, or we just read it off a
+  // lobby we joined. `offline` rides this too, so a leave and a mode switch look alike downstream.
+  lobbyModeChanged:      LobbyMode;
   // About to leave: the LAST moment a packet can still reach the party. Both rosters and the
   // relay's cached owner PUID are intact here and gone by lobbyLeft, so every departure
   // announce (guest LEAVE_PARTY, host PARTY_CLOSED) must ride this one, not lobbyLeft.
@@ -122,7 +134,7 @@ export type GameEvents = {
   // Answer to lobbySnapshotRequest. The member table marks its host row from `hostPuid` (the lobby
   // OWNER, set while hosting too) and its own row from `localPuid`; either is null outside a lobby,
   // or when EOS refused to name the owner / the EOS login has not landed yet.
-  lobbySnapshot:         { roomCode: string; members: string[]; hostPuid: string | null; localPuid: string | null };
+  lobbySnapshot:         { roomCode: string; members: string[]; hostPuid: string | null; localPuid: string | null; mode: LobbyMode };
   hostLost:              void;   // guest generation received PARTY_CLOSED; asks the bridge to fall back
   partyEnded:            void;   // bridge confirmed the fallback to solo; drives the HUD notice
 
@@ -145,10 +157,13 @@ export type GameEvents = {
   // UI → game commands
   ui_equipItem:             { slot: GearSlot; itemId: string };
   ui_unequipItem:           GearSlot;
-  ui_createLobby:        void;
+  // The lobby-mode tabs are the ONE lobby control: `offline` leaves, a mode chosen while offline
+  // creates, and a mode chosen while hosting re-writes the lobby's attribute. There is no separate
+  // "create lobby" command — see app/hooks/lobbyCommands.ts.
+  ui_setLobbyMode:       LobbyMode;
   ui_joinLobby:          string;   // raw room code; the bridge normalizes it
   ui_leaveLobby:         void;
-  lobbySnapshotRequest:  void;     // UI asks for the current room code + members (lobby tab mount)
+  lobbySnapshotRequest:  void;     // UI asks for the current room code + members (lobby window mount)
   travelToZone:          string;   // zoneId; resets to first battler
   zonesSnapshotRequest:  void;     // UI asks ZoneManager to re-emit zonesSnapshot
   uiSnapshotRequest:     void;     // UI asks ZoneManager to re-emit character/gear/inventory snapshots
diff --git a/src/network/index.ts b/src/network/index.ts
index 0319aa9b..3af8baa2 100644
--- a/src/network/index.ts
+++ b/src/network/index.ts
@@ -5,7 +5,7 @@ export {PlayerNetState} from "./schema/PlayerNetState";
 export {GearNetState} from "./schema/GearNetState";
 export {LobbyManager} from "./LobbyManager";
 export {EosLobbyBridge, TauriLobbyPort, RoomCode, lobbyBridge, lobbyRoster} from "./lobby";
-export type {LobbyPort, LobbyMemberChange} from "./lobby";
+export type {LobbyPort, LobbyMemberChange, LobbyUpdate} from "./lobby";
 export {RelayClient, TauriRelayPort} from "./relay";
 export type {RelayPort, P2pReceived} from "./relay";
 export {GuestNetworkManager} from "./GuestNetworkManager";
diff --git a/src/network/lobby/EosLobbyBridge.ts b/src/network/lobby/EosLobbyBridge.ts
index 2e2510ac..6d1cd3e1 100644
--- a/src/network/lobby/EosLobbyBridge.ts
+++ b/src/network/lobby/EosLobbyBridge.ts
@@ -1,8 +1,9 @@
 import type { Emitter } from "mitt";
 
-import type { GameEvents } from "../../bus/bus";
+import type { GameEvents, LobbyMode } from "../../bus/bus";
 import type { LobbyManager } from "../LobbyManager";
 import type { LobbyPort } from "./LobbyPort";
+import { LobbyModeTracker } from "./LobbyModeTracker";
 import { RoomCode } from "./roomCode";
 
 interface BridgeDeps {
@@ -45,16 +46,23 @@ export class EosLobbyBridge {
   // Id of the lobby we are in, so a member event queued for a lobby we already left cannot
   // end the party we are in now (the EOS notify is process-wide and never filtered).
   private lobbyId = "";
+  // The public/private label, and the EOS lobby-update subscription that keeps it fresh.
+  private readonly modeTracker: LobbyModeTracker;
   private unsubscribe: (() => void) | null = null;
 
   constructor({ port, lobby, bus }: BridgeDeps) {
     this.port = port;
     this.lobby = lobby;
     this.bus = bus;
+    this.modeTracker = new LobbyModeTracker({
+      port, bus,
+      isCurrentLobby: /*matchOurLobby*/ (lobbyId) => lobbyId === this.lobbyId,
+    });
   }
 
   start(): void {
     if (this.unsubscribe) return;
+    const onLobbyUpdated = this.modeTracker.watch();
     const onMemberChanged = this.port.onMemberChanged(
       /*refreshOrFallBackOnMemberChange*/ (change) => {
         if (change.lobby_id !== this.lobbyId) return;
@@ -67,6 +75,7 @@ export class EosLobbyBridge {
     this.bus.on("hostLost", onHostLost);
     this.unsubscribe = () => {
       onMemberChanged();
+      onLobbyUpdated();
       this.bus.off("hostLost", onHostLost);
     };
   }
@@ -86,14 +95,18 @@ export class EosLobbyBridge {
    *  Set while hosting too — the UI needs it to mark the host on every client. */
   getOwnerPuid(): string | null { return this.ownerPuid; }
 
-  async create(): Promise<string> {
+  /** `offline` outside a lobby; inside one, whatever its `MODE` attribute says. */
+  getMode(): LobbyMode { return this.modeTracker.get(); }
+
+  async create(mode: LobbyMode): Promise<string> {
     const code = RoomCode.generate();
     const lobbyId = await this.runGuarded("create", /*createThenAdoptRoster*/ async () => {
-      const id = await this.port.createLobby(code);
+      const id = await this.port.createLobby(code, mode);
       this.joinedAsGuest = false;   // we ARE the host
       this.ownerPuid = await this.readOwner();
       this.lobbyId = id;
       this.adoptRoomCode(code);
+      this.modeTracker.adopt(mode);
       await this.refreshMembers();
       return id;
     });
@@ -109,12 +122,26 @@ export class EosLobbyBridge {
       this.ownerPuid = await this.readOwner();
       this.lobbyId = id;
       this.adoptRoomCode(code);
+      // AFTER lobbyId: the tracker filters lobby-update events against it, and the pull below
+      // is the one that decides what the guest's window is titled.
+      await this.modeTracker.pull();
       await this.refreshMembers();
       return id;
     });
     this.bus.emit("lobbyJoined", { lobbyId });
   }
 
+  /** Re-label the lobby we host. Refused locally for a guest so the operation never reaches
+   *  EOS (which would reject it anyway) — a guest is shown no mode tabs, so arriving here at
+   *  all means something is wired wrong, and a `lobbyError` says so out loud. */
+  async setMode(mode: LobbyMode): Promise<void> {
+    await this.runGuarded("setMode", /*writeLobbyMode*/ async () => {
+      if (this.joinedAsGuest) throw new Error("only the host can change the lobby mode");
+      await this.port.setLobbyMode(mode);
+      this.modeTracker.adopt(mode);
+    });
+  }
+
   /**
    * Local state is cleared in `finally`: EOS rejects a leave against an already-destroyed
    * lobby, and without this the player stayed a guest of a host that no longer exists with
@@ -185,6 +212,7 @@ export class EosLobbyBridge {
     this.ownerPuid = null;
     this.lobbyId = "";
     this.adoptRoomCode("");
+    this.modeTracker.reset();
     this.lobby.setMembers([]);
   }
 
diff --git a/src/network/lobby/LobbyModeTracker.ts b/src/network/lobby/LobbyModeTracker.ts
new file mode 100644
index 00000000..5343df99
--- /dev/null
+++ b/src/network/lobby/LobbyModeTracker.ts
@@ -0,0 +1,81 @@
+import type { Emitter } from "mitt";
+
+import type { GameEvents, LobbyMode } from "../../bus/bus";
+import type { LobbyPort } from "./LobbyPort";
+
+interface TrackerDeps {
+  port: LobbyPort;
+  bus:  Emitter<GameEvents>;
+  /** Whether an incoming lobby-update event names the lobby we are actually in. The EOS
+   *  notify is process-wide, so an event for a lobby we already left must not retitle us. */
+  isCurrentLobby: (lobbyId: string) => boolean;
+}
+
+/** What a lobby with no `MODE` attribute reads as. It is the *conservative* label, not the
+ *  historically accurate one: every such lobby predates this feature and was in fact openly
+ *  advertised, but showing "PUBLIC" for a room whose owner never chose that would overstate
+ *  how open it is, and understating is the harmless direction. */
+const UnlabelledLobbyMode: LobbyMode = "private";
+
+/** Narrow whatever the `MODE` attribute held into the two values a *joined* lobby can have.
+ *  `offline` is deliberately unreachable here: it means "no lobby", and we are in one.
+ *  Module-private — the tracker is the only thing that ever sees a raw attribute. */
+function toLobbyMode(raw: string | null): LobbyMode {
+  return raw === "public" || raw === "private" ? raw : UnlabelledLobbyMode;
+}
+
+/**
+ * @Architecture(descriptionShort="Owns the lobby's public/private label for EosLobbyBridge: the local copy, the read-back from the MODE attribute, and the EOS lobby-update subscription that keeps a guest in sync with its host.")
+ *
+ * Split out of `EosLobbyBridge` because the mode has a whole lifecycle of its own — adopted on
+ * create, pulled on join, re-pulled on every lobby-data update, cleared on leave — and none of
+ * it interacts with the roster or the host-loss fallback the bridge otherwise deals in.
+ *
+ * `lobbyModeChanged` fires only on an actual change: the host's own `setLobbyMode` write comes
+ * back to it as a lobby-update notification, so an unconditional emit would republish the lobby
+ * snapshot twice for one click.
+ */
+export class LobbyModeTracker {
+  private readonly port: LobbyPort;
+  private readonly bus:  Emitter<GameEvents>;
+  private readonly isCurrentLobby: (lobbyId: string) => boolean;
+  private mode: LobbyMode = "offline";
+
+  constructor({ port, bus, isCurrentLobby }: TrackerDeps) {
+    this.port = port;
+    this.bus = bus;
+    this.isCurrentLobby = isCurrentLobby;
+  }
+
+  get(): LobbyMode { return this.mode; }
+
+  /** Adopt a mode we already know is live — right after creating a lobby with it, or after a
+   *  `setLobbyMode` the SDK accepted. */
+  adopt(mode: LobbyMode): void {
+    if (this.mode === mode) return;
+    this.mode = mode;
+    this.bus.emit("lobbyModeChanged", mode);
+  }
+
+  /** Back to "no lobby". Called from the bridge's leave path. */
+  reset(): void { this.adopt("offline"); }
+
+  /** Read the mode off the lobby we are in. A failed read leaves the previous value standing:
+   *  a stale label is better than a window that silently claims to be offline while in a room. */
+  async pull(): Promise<void> {
+    try {
+      this.adopt(toLobbyMode(await this.port.getLobbyMode()));
+    } catch (error) {
+      console.warn("[LobbyModeTracker] mode query failed — the window keeps the label it had", error);
+    }
+  }
+
+  /** Subscribe to EOS lobby-data updates. Without this a guest would keep the mode it read at
+   *  join time and never see the host switch public↔private. Returns the unsubscribe thunk. */
+  watch(): () => void {
+    return this.port.onLobbyUpdated(/*rereadModeOnLobbyUpdate*/ (update) => {
+      if (!this.isCurrentLobby(update.lobby_id)) return;
+      void this.pull();
+    });
+  }
+}
diff --git a/src/network/lobby/LobbyPort.ts b/src/network/lobby/LobbyPort.ts
index d5b5c27e..97b1221f 100644
--- a/src/network/lobby/LobbyPort.ts
+++ b/src/network/lobby/LobbyPort.ts
@@ -8,39 +8,60 @@ export interface LobbyMemberChange {
   status:      string;
 }
 
+/** Payload of the `eos_lobby_updated` Tauri event. EOS reports only THAT the lobby's own
+ *  data changed, never which attribute, so a listener has to re-read what it cares about. */
+export interface LobbyUpdate {
+  lobby_id: string;
+}
+
 /**
- * @Architecture(descriptionShort="Tauri↔bridge seam for lobby IPC: interface + TauriLobbyPort (real EOS create/join/leave/members/owner commands + the member-changed event); a fake stands in for tests.")
+ * @Architecture(descriptionShort="Tauri↔bridge seam for lobby IPC: interface + TauriLobbyPort (real EOS create/join/leave/members/owner/mode commands + the member-changed and lobby-updated events); a fake stands in for tests.")
  *
  * The backend surface `EosLobbyBridge` depends on. Abstracts the Tauri IPC so the
  * bridge can be unit-tested against a fake without the desktop runtime.
  */
 export interface LobbyPort {
-  createLobby(code: string): Promise<string>;   // resolves to the EOS lobby id
+  createLobby(code: string, mode: string): Promise<string>;   // resolves to the EOS lobby id
   joinLobby(code: string):  Promise<string>;    // resolves to the EOS lobby id
   leaveLobby(): Promise<void>;
   getMembers(): Promise<string[]>;              // member PUIDs (includes local)
   getOwner(): Promise<string>;                  // owner (host) PUID — the bridge's host-loss watchdog
+  /** The lobby's `MODE` attribute, or null when it carries none (a lobby made by an older build). */
+  getLobbyMode(): Promise<string | null>;
+  /** Re-write `MODE`. EOS rejects this from anyone but the lobby owner. */
+  setLobbyMode(mode: string): Promise<void>;
   onMemberChanged(handler: (change: LobbyMemberChange) => void): () => void;
+  onLobbyUpdated(handler: (update: LobbyUpdate) => void): () => void;
 }
 
 const MEMBER_CHANGED_EVENT = "eos_lobby_member_changed";
+const LOBBY_UPDATED_EVENT  = "eos_lobby_updated";
 
 /** Production `LobbyPort` backed by the Tauri Rust EOS lobby commands/events. */
 export class TauriLobbyPort implements LobbyPort {
   // Callers must hold a live EOS session first (`AuthManager.ensureEosSession`) —
   // both commands reject with "no local PUID" otherwise. The gate lives in the app
   // layer so this module stays free of the auth layer.
-  createLobby(code: string): Promise<string> { return invoke<string>("eos_create_lobby", { code }); }
+  createLobby(code: string, mode: string): Promise<string> { return invoke<string>("eos_create_lobby", { code, mode }); }
   joinLobby(code: string):  Promise<string>  { return invoke<string>("eos_join_lobby", { code }); }
   leaveLobby(): Promise<void>                 { return invoke<void>("eos_leave_lobby"); }
   getMembers(): Promise<string[]>             { return invoke<string[]>("eos_get_lobby_members"); }
   getOwner(): Promise<string>                 { return invoke<string>("eos_get_lobby_owner"); }
+  getLobbyMode(): Promise<string | null>      { return invoke<string | null>("eos_get_lobby_mode"); }
+  setLobbyMode(mode: string): Promise<void>   { return invoke<void>("eos_set_lobby_mode", { mode }); }
 
   onMemberChanged(handler: (change: LobbyMemberChange) => void): () => void {
-    const unlistenPromise = listen<LobbyMemberChange>(
-      MEMBER_CHANGED_EVENT,
-      /*forwardPayload*/ (event) => handler(event.payload),
-    );
-    return () => { void unlistenPromise.then(unlisten => unlisten()); };
+    return subscribe<LobbyMemberChange>(MEMBER_CHANGED_EVENT, handler);
+  }
+
+  onLobbyUpdated(handler: (update: LobbyUpdate) => void): () => void {
+    return subscribe<LobbyUpdate>(LOBBY_UPDATED_EVENT, handler);
   }
 }
+
+/** `listen` resolves to its own unlisten thunk, so every subscription here has to hand
+ *  back a synchronous canceller over an unresolved promise. */
+function subscribe<T>(event: string, handler: (payload: T) => void): () => void {
+  const unlistenPromise = listen<T>(event, /*forwardPayload*/ (fired) => handler(fired.payload));
+  return () => { void unlistenPromise.then(unlisten => unlisten()); };
+}
diff --git a/src/network/lobby/index.ts b/src/network/lobby/index.ts
index 1440143d..61671ff5 100644
--- a/src/network/lobby/index.ts
+++ b/src/network/lobby/index.ts
@@ -1,6 +1,6 @@
 // @Architecture(descriptionShort="Facade for the nested lobby deep module (re-exported by network/index.ts; unreachable directly from outside the network module).")
 export { EosLobbyBridge } from "./EosLobbyBridge";
 export { TauriLobbyPort } from "./LobbyPort";
-export type { LobbyPort, LobbyMemberChange } from "./LobbyPort";
+export type { LobbyPort, LobbyMemberChange, LobbyUpdate } from "./LobbyPort";
 export { RoomCode } from "./roomCode";
 export { lobbyBridge, lobbyRoster } from "./lobbyBridge";
diff --git a/src/ui/components/HUD/HUD.tsx b/src/ui/components/HUD/HUD.tsx
index 36a89676..febfb8de 100644
--- a/src/ui/components/HUD/HUD.tsx
+++ b/src/ui/components/HUD/HUD.tsx
@@ -1,7 +1,8 @@
 import { useState } from "react";
 import type { MouseEvent as ReactMouseEvent } from "react";
 import { HUDMenu } from "./HUDMenu";
-import { InventoryMenu, LootRevealWindow, useUnrevealedLoot, ZoneInfoCard, LobbyPopover, selectZoneInfo, type EquipFromLootDeps } from "./inventory"; // inventory menu (backpack/F9) + loot-reveal window (star) + zone-info card ("i") + lobby panel
+import { InventoryMenu, LootRevealWindow, useUnrevealedLoot, ZoneInfoCard, selectZoneInfo, type EquipFromLootDeps } from "./inventory"; // inventory menu (backpack/F9) + loot-reveal window (star) + zone-info card ("i")
+import { LobbyPopover } from "./lobby"; // the lobby window, floated by the HUD row's leftmost button
 import { bus } from "@/bus/bus";
 import { useHudOverlays, type HudOverlay } from "./useHudOverlays";
 import { VersionBadge } from "../VersionBadge";
diff --git a/src/ui/components/HUD/hudFonts.ts b/src/ui/components/HUD/hudFonts.ts
new file mode 100644
index 00000000..49e5ff83
--- /dev/null
+++ b/src/ui/components/HUD/hudFonts.ts
@@ -0,0 +1,17 @@
+// @Architecture(type=Module, descriptionShort="The HUD's font families — the one declaration of the app's three faces, shared by every HUD window's own theme.")
+
+/** The three faces every HUD window draws with. They live at HUD level rather than inside one
+ *  window's theme because a font family is not per-window chrome: the inventory window, the lobby
+ *  window and the loot popup all render the same two bundled webfaces, and a second declaration
+ *  would silently keep a dangling family when one is renamed or the fallback stack is corrected.
+ *
+ *  A window's own theme still owns its COLOURS (`InvTheme`, `LobbyPalette`, `LootRevealColors`) —
+ *  those genuinely differ per surface. Only the faces are shared.
+ *
+ *  Inter (body) + New Amsterdam (display) get bundled in F4; until then the display role falls back
+ *  to a condensed system stack so labels don't overflow their pixel frames. */
+export const HudFont = {
+  display: "'New Amsterdam', 'Oswald', 'Arial Narrow', system-ui, sans-serif",
+  body:    "'Inter', system-ui, sans-serif",
+  pixel:   "'Jersey 25', monospace",   // blocky pixel face for tab labels and headings (matches Figma)
+} as const;
diff --git a/src/ui/components/HUD/hudScrollbar.css b/src/ui/components/HUD/hudScrollbar.css
new file mode 100644
index 00000000..7aa37879
--- /dev/null
+++ b/src/ui/components/HUD/hudScrollbar.css
@@ -0,0 +1,46 @@
+/* The HUD's scrollbar. Every scrollable area in every HUD window wears `.hud-scroll` so they can't
+   drift apart — the bag grid, the loot-reveal grid, the category dropdown, the lobby member list and
+   each inventory tab's body. Lives in CSS because `::-webkit-scrollbar` is unreachable from inline
+   styles.
+
+   Square corners and a hard 1px outline, deliberately: a rounded pill thumb reads as OS chrome next to
+   this pixel-art frame. The thumb is `InvTheme.tanDim` (the panel-frame tan) rather than `gold` so it
+   sits in the chrome instead of competing with the active tab; hovering lifts it to gold, which is the
+   only place in this UI where gold means "you are touching this".
+
+   Width comes from `--hud-scroll-w` so a consumer whose layout arithmetic depends on it can override the
+   default — the loot-reveal grid pins 4px because its content column has to add up to the Figma frame's
+   617px (asserted in lootRevealArt.test.ts), and the lobby member list pins 4px to keep its row plate at
+   a native 214px. */
+.hud-scroll {
+  --hud-scroll-w: 8px;
+  scrollbar-width: thin;                        /* Firefox fallback: no ::-webkit-* there */
+  scrollbar-color: #caa86a #2a1808;             /* thumb track — InvTheme.tanDim / InvTheme.ink */
+}
+
+.hud-scroll::-webkit-scrollbar {
+  width: var(--hud-scroll-w);
+  height: var(--hud-scroll-w);
+}
+
+.hud-scroll::-webkit-scrollbar-track {
+  background: #2a1808;                          /* InvTheme.ink — a dark channel cut into the panel */
+  box-shadow: inset 1px 0 0 rgba(0, 0, 0, 0.6);
+}
+
+.hud-scroll::-webkit-scrollbar-thumb {
+  background: #caa86a;                          /* InvTheme.tanDim */
+  border: 1px solid #2a1808;                    /* InvTheme.ink, so the thumb reads as a separate piece */
+  border-radius: 0;
+  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);   /* the same 1px bevel the badges use */
+}
+
+.hud-scroll::-webkit-scrollbar-thumb:hover {
+  background: #f2d98a;                          /* InvTheme.gold */
+}
+
+/* The stepper arrows and the corner square are OS chrome with no pixel-art equivalent. */
+.hud-scroll::-webkit-scrollbar-button,
+.hud-scroll::-webkit-scrollbar-corner {
+  display: none;
+}
diff --git a/src/ui/components/HUD/hudScrollbar.ts b/src/ui/components/HUD/hudScrollbar.ts
new file mode 100644
index 00000000..cec0839c
--- /dev/null
+++ b/src/ui/components/HUD/hudScrollbar.ts
@@ -0,0 +1,22 @@
+// @Architecture(type=Module, descriptionShort="The shared pixel-art scrollbar: one class name for every scrollable area in any HUD window, plus the per-consumer width override")
+import type { CSSProperties } from "react";
+import "./hudScrollbar.css";
+
+/** Put this on any scrollable element in any HUD window. Importing it pulls `hudScrollbar.css` in as
+ *  a side effect, so a consumer never has to remember the stylesheet separately.
+ *
+ *  Lives at HUD level, not inside the inventory window: the bar is one global stylesheet keyed by one
+ *  class name, and the inventory window, the loot popup and the lobby window all wear it. Owning it
+ *  from `inventory/` meant the lobby had to import the inventory's facade for a widget that has
+ *  nothing to do with inventory — and the `Inv*` prefix taught every reader the bar was inventory's,
+ *  which is how a third consumer ends up copying it instead. */
+export const HudScrollClass = "hud-scroll";
+
+/** Overrides the scrollbar's width for one element. Only needed where the layout arithmetic depends on it
+ *  (the loot-reveal grid pins 4px so its content column still sums to the Figma frame's 617px; the lobby
+ *  member list pins 4px so its row plate stays at a native 214px); everything else takes the default from
+ *  the stylesheet. A CSS custom property rather than a second class, so the look stays defined in exactly
+ *  one place. */
+export function hudScrollWidth(px: number): CSSProperties {
+  return { "--hud-scroll-w": `${px}px` } as CSSProperties;
+}
diff --git a/src/ui/components/HUD/inventory/grid/ItemGrid.tsx b/src/ui/components/HUD/inventory/grid/ItemGrid.tsx
index af918710..1bb42d46 100644
--- a/src/ui/components/HUD/inventory/grid/ItemGrid.tsx
+++ b/src/ui/components/HUD/inventory/grid/ItemGrid.tsx
@@ -1,5 +1,6 @@
 import { GridCell } from "./GridCell";
-import { InvScrollClass, type Rarity } from "../support";
+import { type Rarity } from "../support";
+import { HudScrollClass } from "../../hudScrollbar";
 import type { GearSlot, Item } from "@typerlords/shared/types/item";
 import type { Modifier } from "@typerlords/shared/types/ability";
 
@@ -32,7 +33,7 @@ interface ItemGridProps { items: GridItem[]; onItemClick?: (id: string) => void;
 export function ItemGrid({ items, onItemClick }: ItemGridProps) {
   const rows = Math.ceil(items.length / GridLayout.Cols);
   return (
-    <div className={InvScrollClass} style={Clip}>
+    <div className={HudScrollClass} style={Clip}>
       <div style={{ ...Inner, height: rows * GridLayout.RowStep }}>
         {items.map((item, i) => (
           <GridCell
diff --git a/src/ui/components/HUD/inventory/index.ts b/src/ui/components/HUD/inventory/index.ts
index a3511ac5..aab31421 100644
--- a/src/ui/components/HUD/inventory/index.ts
+++ b/src/ui/components/HUD/inventory/index.ts
@@ -3,7 +3,6 @@
 export { InventoryMenu, type InventoryMenuSettings } from "./shell";
 export { useUnrevealedLoot } from "./shell";
 export { LootRevealWindow, type EquipFromLootDeps } from "./loot-reveal";
-export { LobbyPopover } from "./views";
 export { ZoneInfoCard } from "./zone-info";
 export { ZoneHoverTooltip } from "./zone-info";
 export { selectZoneInfo, type ZoneInfo } from "./zone-info";
diff --git a/src/ui/components/HUD/inventory/loot-reveal/LootGrid.tsx b/src/ui/components/HUD/inventory/loot-reveal/LootGrid.tsx
index b4da2e57..4eb824a8 100644
--- a/src/ui/components/HUD/inventory/loot-reveal/LootGrid.tsx
+++ b/src/ui/components/HUD/inventory/loot-reveal/LootGrid.tsx
@@ -9,7 +9,8 @@ import { toLootCells, type LootCell } from "./lootOrder";
 import { buildEquipIntent, type EquipFromLootDeps } from "./lootEquip";
 import { LootRevealLayout } from "./lootReveal";
 import { suffixNamesOf, finalModsOf } from "../grid";
-import { InvScrollClass, invScrollWidth, wornItem } from "../support";
+import { wornItem } from "../support";
+import { HudScrollClass, hudScrollWidth } from "../../hudScrollbar";
 
 const L = LootRevealLayout;
 const GridWpx = L.Columns * L.CellSizePx + (L.Columns - 1) * L.ColGapPx;
@@ -24,7 +25,7 @@ const viewportStyle: CSSProperties = {
   paddingTop: L.TopOverflowPx,   // room for a top-row reveal burst to overflow above the grid without clipping
   // Narrower than the module default: this column has to sum to the Figma frame's ContentWpx (see
   // lootRevealArt.test.ts), and `ScrollWpx` is one of the terms.
-  ...invScrollWidth(L.ScrollWpx),
+  ...hudScrollWidth(L.ScrollWpx),
 };
 const gridStyle: CSSProperties = {
   display: "grid", width: GridWpx,
@@ -112,7 +113,7 @@ export function LootGrid({ batches, itemCatalog, suffixCatalog, revealing, onRev
   }, [focusKey, scroll, cells, instantScroll] /*Inputs for autoScrollToFocusedReveal*/);
 
   return (
-    <div ref={viewportRef} className={InvScrollClass} style={{ ...viewportStyle, ...overflow }}>
+    <div ref={viewportRef} className={HudScrollClass} style={{ ...viewportStyle, ...overflow }}>
       <div style={gridStyle}>
         {cells.map(cell => (
           <GridLootBox key={cell.key} cell={cell} itemCatalog={itemCatalog} suffixCatalog={suffixCatalog}
diff --git a/src/ui/components/HUD/inventory/loot-reveal/lootReveal.ts b/src/ui/components/HUD/inventory/loot-reveal/lootReveal.ts
index 05fd1f25..d5c993d5 100644
--- a/src/ui/components/HUD/inventory/loot-reveal/lootReveal.ts
+++ b/src/ui/components/HUD/inventory/loot-reveal/lootReveal.ts
@@ -152,8 +152,8 @@ export const RevealAllTag: string = "reveal_all";
 export const AfterRevealAllTag: string = "after_reveal";
 
 /** Text colors, mapped to the inventory theme (the ornate chrome comes from the PNGs, not CSS). The
- *  scrollbar's own colors are NOT here — it wears the module-wide `InvScrollClass` (support/scrollbar.css)
- *  so every scrollable area in the window matches; only its width is overridden locally. */
+ *  scrollbar's own colors are NOT here — it wears the HUD-wide `HudScrollClass` (HUD/hudScrollbar.css)
+ *  so every scrollable area in every window matches; only its width is overridden locally. */
 export class LootRevealColors {
   static readonly tabText     = "#424242";      // dark text on the gold "NEW LOOT!" tab (Figma)
   static readonly buttonText  = InvTheme.gold;  // "CLAIM LOOT!" / "SKIP" action button
diff --git a/src/ui/components/HUD/inventory/shell/InventoryMenu.tsx b/src/ui/components/HUD/inventory/shell/InventoryMenu.tsx
index 8253c5d3..9fac0182 100644
--- a/src/ui/components/HUD/inventory/shell/InventoryMenu.tsx
+++ b/src/ui/components/HUD/inventory/shell/InventoryMenu.tsx
@@ -5,7 +5,6 @@ import { CharacterPanel } from "../character";
 import { InventoryPanel } from "./InventoryPanel";
 import { AbilitiesView } from "../views";
 import { ZoneView } from "../views";
-import { LobbyView } from "../views";
 import { ComingSoonView } from "../views";
 import { SettingsView, type SettingsViewProps } from "../views";
 import { orderGridIds, toGridItems, type GridItem } from "../grid";
@@ -104,7 +103,6 @@ export function InventoryMenu({ onClose, data, settings, gameRect }: InventoryMe
       {active === "zone" && (
         <ZoneView zones={data.zoneCatalog} currentZoneId={data.currentZoneId} unlockedZoneIds={data.unlockedZoneIds} level={data.level} />
       )}
-      {active === "lobby"    && <LobbyView party={data.partyRoster} />}
       {active === "store"    && <ComingSoonView label="Store" />}
       {active === "settings" && <SettingsView {...settings} onClose={onClose} itemCatalog={data.itemCatalog} />}
     </InventoryWindow>
diff --git a/src/ui/components/HUD/inventory/shell/InventoryTabBar.tsx b/src/ui/components/HUD/inventory/shell/InventoryTabBar.tsx
index 72ae3422..e22d0156 100644
--- a/src/ui/components/HUD/inventory/shell/InventoryTabBar.tsx
+++ b/src/ui/components/HUD/inventory/shell/InventoryTabBar.tsx
@@ -45,12 +45,13 @@ interface TabBarProps {
   onSelect: (id: InvTabId) => void;
 }
 
-/** The six top tabs of the inventory window, positioned at their native Figma offsets. */
+/** The top tabs of the inventory window, positioned at their native Figma offsets. */
 export function InventoryTabBar({ active, onSelect }: TabBarProps) {
   return (
     <>
-      {InventoryLayout.Tabs.map(tab => (
-        <button key={tab.id} onClick={() => onSelect(tab.id)} style={tabStyle(tab.x, active === tab.id)}>
+      {InventoryLayout.Tabs.map((tab, index) => (
+        <button key={tab.id} onClick={() => onSelect(tab.id)}
+          style={tabStyle(InventoryLayout.tabLeft(index), active === tab.id)}>
           {tab.label}
         </button>
       ))}
diff --git a/src/ui/components/HUD/inventory/support/constants.ts b/src/ui/components/HUD/inventory/support/constants.ts
index 8642104b..53f8de9d 100644
--- a/src/ui/components/HUD/inventory/support/constants.ts
+++ b/src/ui/components/HUD/inventory/support/constants.ts
@@ -11,16 +11,28 @@ export class InventoryLayout {
   static readonly TabH = 36;
   static readonly TabY = 0;
 
-  /** Top tab strip. `id` drives content; `x` is the native left offset inside the window. */
+  /** The tab strip's own geometry. The tabs are free-standing sprites over the window art, not wells
+   *  painted into it, so a tab's left offset is derived — `TabStartX + index * TabStride` — and never
+   *  stored per row. That is load-bearing: the LOBBY tab that used to sit fourth is gone (the lobby is
+   *  its own window now, `HUD/lobby/`, opened from the HUD button row), and with the offsets written
+   *  out per tab, removing it meant hand-editing every literal after it. */
+  static readonly TabStartX = 86;
+  static readonly TabStride = 150;
+
+  /** Top tab strip, in draw order. `id` drives content; `tabLeft(index)` gives the offset. */
   static readonly Tabs = [
-    { id: "inventory", label: "INVENTORY", x: 86 },
-    { id: "abilities", label: "ABILITIES", x: 236 },
-    { id: "zone",      label: "ZONE",      x: 386 },
-    { id: "lobby",     label: "LOBBY",     x: 536 },
-    { id: "store",     label: "STORE",     x: 686 },
-    { id: "settings",  label: "SETTINGS",  x: 836 },
+    { id: "inventory", label: "INVENTORY" },
+    { id: "abilities", label: "ABILITIES" },
+    { id: "zone",      label: "ZONE"      },
+    { id: "store",     label: "STORE"     },
+    { id: "settings",  label: "SETTINGS"  },
   ] as const;
 
+  /** Native left offset of the tab at `index` in `Tabs`. */
+  static tabLeft(index: number): number {
+    return InventoryLayout.TabStartX + index * InventoryLayout.TabStride;
+  }
+
   /** Major sub-panels (filled in detail during F2/F3). */
   static readonly LeftPanel  = { x: 50,  y: 58, w: 530, h: 574 } as const;
   static readonly RightPanel = { x: 607, y: 58, w: 407, h: 570 } as const;
diff --git a/src/ui/components/HUD/inventory/support/index.ts b/src/ui/components/HUD/inventory/support/index.ts
index 62976fcd..e9e4fae4 100644
--- a/src/ui/components/HUD/inventory/support/index.ts
+++ b/src/ui/components/HUD/inventory/support/index.ts
@@ -4,7 +4,9 @@ export { InventoryLayout, InventoryFeatures } from "./constants";
 export { InvTheme, RarityFill, RarityGradient, RarityTextColor, TextStyles, type Rarity } from "./theme";
 // `RARITY_ORDER` stays off the facade — only `rarity.ts` itself needs the list; tests deep-import.
 export { DEFAULT_RARITY, rarityRank } from "./rarity";
-export { InvScrollClass, invScrollWidth } from "./scrollbar";
+// The pixel-art scrollbar moved up to `HUD/hudScrollbar.ts`: it is worn by the lobby window too, so
+// owning it here forced a sibling module to import this window's facade for it. Consumers import
+// `HudScrollClass`/`hudScrollWidth` from there directly.
 export { wornItem, isItemEquipped } from "./wornItem";
 // `useFitScale`/`useGameMonitorRect` are gone from the facade: `useCenteredWindow` now owns the whole
 // fit-scale + monitor-centering + drag sequence, so a window no longer assembles it from parts.
diff --git a/src/ui/components/HUD/inventory/support/scrollbar.css b/src/ui/components/HUD/inventory/support/scrollbar.css
deleted file mode 100644
index b089c0b8..00000000
--- a/src/ui/components/HUD/inventory/support/scrollbar.css
+++ /dev/null
@@ -1,44 +0,0 @@
-/* The inventory window's scrollbar. Every scrollable area in the module wears `.inv-scroll` so they can't
-   drift apart — the bag grid, the loot-reveal grid, the category dropdown, the lobby member list and each
-   tab's body. Lives in CSS because `::-webkit-scrollbar` is unreachable from inline styles.
-
-   Square corners and a hard 1px outline, deliberately: a rounded pill thumb reads as OS chrome next to
-   this pixel-art frame. The thumb is `InvTheme.tanDim` (the panel-frame tan) rather than `gold` so it
-   sits in the chrome instead of competing with the active tab; hovering lifts it to gold, which is the
-   only place in this UI where gold means "you are touching this".
-
-   Width comes from `--inv-scroll-w` so a consumer whose layout arithmetic depends on it can override the
-   default — the loot-reveal grid pins 4px because its content column has to add up to the Figma frame's
-   617px (asserted in lootRevealArt.test.ts). */
-.inv-scroll {
-  --inv-scroll-w: 8px;
-  scrollbar-width: thin;                        /* Firefox fallback: no ::-webkit-* there */
-  scrollbar-color: #caa86a #2a1808;             /* thumb track — InvTheme.tanDim / InvTheme.ink */
-}
-
-.inv-scroll::-webkit-scrollbar {
-  width: var(--inv-scroll-w);
-  height: var(--inv-scroll-w);
-}
-
-.inv-scroll::-webkit-scrollbar-track {
-  background: #2a1808;                          /* InvTheme.ink — a dark channel cut into the panel */
-  box-shadow: inset 1px 0 0 rgba(0, 0, 0, 0.6);
-}
-
-.inv-scroll::-webkit-scrollbar-thumb {
-  background: #caa86a;                          /* InvTheme.tanDim */
-  border: 1px solid #2a1808;                    /* InvTheme.ink, so the thumb reads as a separate piece */
-  border-radius: 0;
-  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);   /* the same 1px bevel the badges use */
-}
-
-.inv-scroll::-webkit-scrollbar-thumb:hover {
-  background: #f2d98a;                          /* InvTheme.gold */
-}
-
-/* The stepper arrows and the corner square are OS chrome with no pixel-art equivalent. */
-.inv-scroll::-webkit-scrollbar-button,
-.inv-scroll::-webkit-scrollbar-corner {
-  display: none;
-}
diff --git a/src/ui/components/HUD/inventory/support/scrollbar.ts b/src/ui/components/HUD/inventory/support/scrollbar.ts
deleted file mode 100644
index 970514c5..00000000
--- a/src/ui/components/HUD/inventory/support/scrollbar.ts
+++ /dev/null
@@ -1,15 +0,0 @@
-// @Architecture(type=Module, descriptionShort="The shared pixel-art scrollbar: one class name for every scrollable area in the inventory window, plus the per-consumer width override")
-import type { CSSProperties } from "react";
-import "./scrollbar.css";
-
-/** Put this on any scrollable element inside the inventory window. Importing it pulls `scrollbar.css` in
- *  as a side effect, so a consumer never has to remember the stylesheet separately. */
-export const InvScrollClass = "inv-scroll";
-
-/** Overrides the scrollbar's width for one element. Only needed where the layout arithmetic depends on it
- *  (the loot-reveal grid pins 4px so its content column still sums to the Figma frame's 617px); everything
- *  else takes the default from the stylesheet. A CSS custom property rather than a second class, so the
- *  look stays defined in exactly one place. */
-export function invScrollWidth(px: number): CSSProperties {
-  return { "--inv-scroll-w": `${px}px` } as CSSProperties;
-}
diff --git a/src/ui/components/HUD/inventory/support/theme.ts b/src/ui/components/HUD/inventory/support/theme.ts
index 29b3f4c2..5805db3d 100644
--- a/src/ui/components/HUD/inventory/support/theme.ts
+++ b/src/ui/components/HUD/inventory/support/theme.ts
@@ -1,10 +1,12 @@
+import { HudFont } from "../../hudFonts";
+
 /** Shared visual tokens for the inventory window (sampled from the Figma pixel-art chrome).
- *  Fonts: Inter (body) + New Amsterdam (display) get bundled in F4; until then the display role
- *  falls back to a condensed system stack so labels don't overflow their pixel frames. */
+ *  The three font families come from `HudFont` — they are shared with every other HUD window, so
+ *  they are declared once at HUD level; only the colours below are this window's own. */
 export const InvTheme = {
-  display:    "'New Amsterdam', 'Oswald', 'Arial Narrow', system-ui, sans-serif",
-  body:       "'Inter', system-ui, sans-serif",
-  pixel:      "'Jersey 25', monospace",   // blocky pixel face for tab labels (matches Figma)
+  display:    HudFont.display,
+  body:       HudFont.body,
+  pixel:      HudFont.pixel,
   gold:       "#f2d98a",
   tan:        "#e8c878",
   tanDim:     "#caa86a",
diff --git a/src/ui/components/HUD/inventory/views/Dropdown.tsx b/src/ui/components/HUD/inventory/views/Dropdown.tsx
index baf2fc53..a34f5383 100644
--- a/src/ui/components/HUD/inventory/views/Dropdown.tsx
+++ b/src/ui/components/HUD/inventory/views/Dropdown.tsx
@@ -1,5 +1,6 @@
 import { useEffect, useRef, useState, type CSSProperties } from "react";
-import { InvScrollClass, InvTheme } from "../support";
+import { InvTheme } from "../support";
+import { HudScrollClass } from "../../hudScrollbar";
 
 export interface DropdownOption<T extends string> { value: T; label: string }
 
@@ -48,7 +49,7 @@ export function Dropdown<T extends string>({ value, options, onChange }: Dropdow
     <div ref={ref} style={{ position: "absolute", inset: 0 }}>
       <button type="button" style={Trigger} onClick={() => setOpen(o => !o)}>{currentLabel}</button>
       {open && (
-        <div className={InvScrollClass} style={List}>
+        <div className={HudScrollClass} style={List}>
           {options.map(o => {
             const active = hovered === o.value || (hovered === null && o.value === value);
             return (
diff --git a/src/ui/components/HUD/inventory/views/LobbyButton.tsx b/src/ui/components/HUD/inventory/views/LobbyButton.tsx
deleted file mode 100644
index 12d29906..00000000
--- a/src/ui/components/HUD/inventory/views/LobbyButton.tsx
+++ /dev/null
@@ -1,73 +0,0 @@
-// @Architecture(descriptionShort="The lobby's two sprite buttons: a full-width labelled plate (Leave lobby) and a 30x30 icon button, both three-sliced from Figma's 5px end caps and a tiled body so they stretch without blurring the pixel art.")
-import type { CSSProperties, ReactNode } from "react";
-import { LobbyAsset } from "./lobbyAssets";
-import { LobbyHeadingStyle, LobbyLayout, LobbyPalette } from "./lobbyTheme";
-
-// Three-slice, not one stretched sprite: the caps carry the bevelled corners at a fixed 5px and
-// only the flat body tiles, so a button is crisp at any width.
-const ButtonBase: CSSProperties = {
-  display: "flex", alignItems: "center", height: LobbyLayout.ButtonHeight,
-  background: "none", border: "none", padding: 0, cursor: "pointer",
-};
-const Cap: CSSProperties = {
-  width: LobbyLayout.ButtonCapWidth, height: LobbyLayout.ButtonHeight,
-  flex: "0 0 auto", imageRendering: "pixelated", display: "block",
-};
-const MirroredCap: CSSProperties = { ...Cap, transform: "scaleX(-1)" };
-const Label: CSSProperties = { ...LobbyHeadingStyle, whiteSpace: "nowrap" };
-const Disabled: CSSProperties = { opacity: 0.35, cursor: "not-allowed" };
-
-function bodyStyle(fillUrl: string): CSSProperties {
-  return {
-    flex: "1 1 auto", minWidth: 0, height: LobbyLayout.ButtonHeight,
-    display: "flex", alignItems: "center", justifyContent: "center",
-    backgroundImage: `url(${fillUrl})`, backgroundRepeat: "repeat-x",
-    backgroundSize: `${LobbyLayout.ButtonFillWidth}px ${LobbyLayout.ButtonHeight}px`,
-    imageRendering: "pixelated",
-  };
-}
-
-interface LobbyButtonProps { label: string; onClick: () => void; disabled?: boolean }
-
-/** The orange full-width action plate (Leave lobby). Its two caps are distinct exports rather than
- *  one mirrored image — the design draws a different highlight on each end. */
-export function LobbyButton({ label, onClick, disabled }: LobbyButtonProps) {
-  return (
-    <button type="button" onClick={onClick} disabled={disabled}
-      style={{ ...ButtonBase, width: "100%", ...(disabled ? Disabled : null) }}>
-      <img src={LobbyAsset.leaveCapLeft} alt="" style={Cap} />
-      <span style={bodyStyle(LobbyAsset.leaveFill)}><span style={Label}>{label}</span></span>
-      <img src={LobbyAsset.leaveCapRight} alt="" style={Cap} />
-    </button>
-  );
-}
-
-const IconButtonBase: CSSProperties = {
-  ...ButtonBase, position: "relative", width: LobbyLayout.IconButtonSize, flex: "0 0 auto",
-};
-// The glyph is a full 30x30 sprite laid over the whole button, exactly as the design composes it.
-const Glyph: CSSProperties = {
-  position: "absolute", inset: 0, width: "100%", height: "100%",
-  imageRendering: "pixelated", pointerEvents: "none",
-};
-
-interface LobbyIconButtonProps { icon: string; tooltip: string; onClick: () => void; disabled?: boolean }
-
-/** A 30×30 brown icon button. `tooltip` is mandatory — an icon never explains itself — and doubles
- *  as the hover label and the accessible name. */
-export function LobbyIconButton({ icon, tooltip, onClick, disabled }: LobbyIconButtonProps) {
-  return (
-    <button type="button" onClick={onClick} disabled={disabled} aria-label={tooltip} title={tooltip}
-      style={{ ...IconButtonBase, ...(disabled ? Disabled : null) }}>
-      <img src={LobbyAsset.iconButtonCap} alt="" style={Cap} />
-      <span style={bodyStyle(LobbyAsset.iconButtonFill)} />
-      <img src={LobbyAsset.iconButtonCap} alt="" style={MirroredCap} />
-      <img src={icon} alt="" style={Glyph} />
-    </button>
-  );
-}
-
-/** The 3px rule the design draws between sections and under the host row. */
-export function LobbySeparator(): ReactNode {
-  return <div style={{ width: "100%", height: LobbyLayout.SeparatorHeight, background: LobbyPalette.separator, flex: "0 0 auto" }} />;
-}
diff --git a/src/ui/components/HUD/inventory/views/LobbyMemberList.tsx b/src/ui/components/HUD/inventory/views/LobbyMemberList.tsx
deleted file mode 100644
index 431f65f9..00000000
--- a/src/ui/components/HUD/inventory/views/LobbyMemberList.tsx
+++ /dev/null
@@ -1,108 +0,0 @@
-// @Architecture(descriptionShort="The lobby tab's member list: a MEMBERS N/max header over one 214x34 sprite plate per EOS lobby member, with the catalog class icon and the owner's crown laid over it, the green plate for the local player, and a 3px rule under the host row.")
-import { Fragment, useMemo, type CSSProperties } from "react";
-import { LobbySeparator } from "./LobbyButton";
-import { LobbyAsset } from "./lobbyAssets";
-import { buildLobbyMemberRows, memberCountLabel, type LobbyMemberRow } from "./lobbyMemberRows";
-import { LobbyHeadingStyle, LobbyLayout, LobbyPalette } from "./lobbyTheme";
-import { useClassIconMap } from "@/ui/hooks/useClassIconMap";
-import type { PartyRoster } from "@/ui/hooks/usePartyRoster";
-import { InvScrollClass, invScrollWidth, InvTheme } from "../support";
-
-class MemberRowArt {
-  static readonly PendingOpacity = 0.55;
-}
-
-const HeaderRow: CSSProperties = {
-  ...LobbyHeadingStyle, display: "flex", justifyContent: "space-between",
-  alignItems: "center", marginBottom: LobbyLayout.LabelGap,
-};
-// The shared `.inv-scroll` bar, pinned to the design's 4px so `RowWidth + ScrollbarWidth` still
-// equals `ContentWidth`.
-const ScrollList: CSSProperties = {
-  ...invScrollWidth(LobbyLayout.ScrollbarWidth),
-  display: "flex", flexDirection: "column", gap: LobbyLayout.RowGap,
-  width: LobbyLayout.ContentWidth, maxHeight: LobbyLayout.ListMaxHeight, overflowY: "auto",
-};
-// The plate is one 214x34 export with the belt ornament and the class-icon well already painted in,
-// so a row is a positioning context over that image, not a stack of CSS boxes.
-const MemberRowBase: CSSProperties = {
-  position: "relative", flex: "0 0 auto",
-  width: LobbyLayout.RowWidth, height: LobbyLayout.RowHeight,
-  backgroundRepeat: "no-repeat", backgroundSize: `${LobbyLayout.RowWidth}px ${LobbyLayout.RowHeight}px`,
-  imageRendering: "pixelated",
-};
-const ClassIcon: CSSProperties = {
-  position: "absolute", left: LobbyLayout.ClassIconLeft, top: LobbyLayout.ClassIconTop,
-  width: LobbyLayout.ClassIconSize, height: LobbyLayout.ClassIconSize, imageRendering: "pixelated",
-};
-const NameGroup: CSSProperties = {
-  position: "absolute", left: LobbyLayout.NameGroupLeft, top: 0, right: 0, height: "100%",
-  display: "flex", alignItems: "center", gap: LobbyLayout.NameGroupGap, minWidth: 0,
-};
-const Crown: CSSProperties = {
-  width: LobbyLayout.CrownWidth, height: LobbyLayout.CrownHeight,
-  flex: "0 0 auto", imageRendering: "pixelated",
-};
-const MemberName: CSSProperties = {
-  fontFamily: InvTheme.body, fontSize: LobbyLayout.NameFontSize, color: LobbyPalette.text,
-  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
-};
-const EmptyStateLine: CSSProperties = { ...MemberName, whiteSpace: "normal" };
-
-// Dim the whole pending row, not just its missing parts, or it reads as a member with a broken class.
-function memberRowStyle(row: LobbyMemberRow): CSSProperties {
-  return {
-    ...MemberRowBase,
-    backgroundImage: `url(${row.isLocal ? LobbyAsset.rowLocal : LobbyAsset.rowIdle})`,
-    opacity: row.isPending ? MemberRowArt.PendingOpacity : 1,
-  };
-}
-
-function MemberRow({ row, classIconUrl }: { row: LobbyMemberRow; classIconUrl: string | undefined }) {
-  return (
-    <div style={memberRowStyle(row)} title={row.isPending ? "In the lobby — not in the battle party yet" : undefined}>
-      <img src={classIconUrl ?? LobbyAsset.classUnknown} alt="" style={ClassIcon} />
-      <div style={NameGroup}>
-        {row.isHost && <img src={LobbyAsset.crown} alt="" style={Crown} />}
-        <span style={MemberName}>{row.name}</span>
-      </div>
-    </div>
-  );
-}
-
-export interface LobbyMemberListProps {
-  members:   string[];
-  party:     PartyRoster;
-  hostPuid:  string | null;
-  localPuid: string | null;
-}
-
-/** The lobby roster: rows come from the EOS member list and are enriched from the battle party —
- *  see `buildLobbyMemberRows` for why that direction is load-bearing. */
-export function LobbyMemberList({ members, party, hostPuid, localPuid }: LobbyMemberListProps) {
-  const classIcons = useClassIconMap();
-  const rows = useMemo(/* buildMemberRows */ () => buildLobbyMemberRows({ members, party, hostPuid, localPuid }),
-    [members, party, hostPuid, localPuid] /*Inputs for buildMemberRows*/);
-
-  return (
-    <div>
-      <div style={HeaderRow}>
-        <span>Members</span>
-        <span>{memberCountLabel(members.length)}</span>
-      </div>
-      {rows.length === 0
-        ? <div style={EmptyStateLine}>Not in a lobby yet — create one, or join with a friend&apos;s code.</div>
-        : (
-          <div className={InvScrollClass} style={ScrollList}>
-            {rows.map((row, index) => (
-              <Fragment key={row.puid}>
-                <MemberRow row={row} classIconUrl={classIcons.get(row.className.toLowerCase())} />
-                {/* Splits the owner from the guests — not a per-row divider. */}
-                {row.isHost && index < rows.length - 1 && <LobbySeparator />}
-              </Fragment>
-            ))}
-          </div>
-        )}
-    </div>
-  );
-}
diff --git a/src/ui/components/HUD/inventory/views/LobbyPopover.tsx b/src/ui/components/HUD/inventory/views/LobbyPopover.tsx
deleted file mode 100644
index 5e31edf7..00000000
--- a/src/ui/components/HUD/inventory/views/LobbyPopover.tsx
+++ /dev/null
@@ -1,46 +0,0 @@
-// @Architecture(type=Component, descriptionShort="Floating container that mounts the bare LobbyPanel over the game for the HUD lobby button, without opening the inventory window.", descriptionLong="Provisional chrome only: it closes the panel's open top/bottom edges and anchors it above the HUD button row. The designed window (title bar, lobby-type tabs, ornate footer — Figma 1409:1552) is not ported yet, so this deliberately reuses the tab's panel unchanged.")
-import { type CSSProperties } from "react";
-import type { PartyRoster } from "@/ui/hooks/usePartyRoster";
-import { LobbyPanel } from "./LobbyView";
-import { LobbyLayout, LobbyPalette } from "./lobbyTheme";
-
-class PopoverLayout {
-  static readonly ZIndex      = 10_000;
-  /** Between the HUD button row and the panel's bottom edge — matches the zone-info card's gap. */
-  static readonly GapAboveRow = 6;
-  static readonly Shadow      = "0 4px 16px rgba(0,0,0,0.6)";
-}
-
-const backdropStyle: CSSProperties = { position: "fixed", inset: 0, zIndex: PopoverLayout.ZIndex, pointerEvents: "auto" };
-
-interface LobbyPopoverProps {
-  party:   PartyRoster;
-  /** The HUD button row's top-RIGHT corner; the panel opens up and to the left from there. */
-  anchor:  { left: number; top: number };
-  onClose: () => void;
-}
-
-/** The lobby panel as a standalone floating surface, opened by the HUD's lobby button — the same panel
- *  the LOBBY tab shows, without the inventory window around it. Dismisses on backdrop click, on a
- *  second click of the button, or on Escape (`useHudOverlays` owns that binding for every overlay).
- *
- *  The panel paints only its own left/right borders (in the tab it sits inside the window frame), so
- *  this wrapper supplies the matching top/bottom edges rather than the panel growing chrome it would
- *  have to hide again inside the tab. */
-export function LobbyPopover({ party, anchor, onClose }: LobbyPopoverProps) {
-  const panelStyle: CSSProperties = {
-    position: "absolute", left: anchor.left, top: anchor.top - PopoverLayout.GapAboveRow,
-    transform: "translate(-100%, -100%)", width: LobbyLayout.ColumnWidth,
-    borderTop:    `${LobbyLayout.PanelBorder}px solid ${LobbyPalette.panelEdge}`,
-    borderBottom: `${LobbyLayout.PanelBorder}px solid ${LobbyPalette.panelEdge}`,
-    boxSizing: "border-box", background: LobbyPalette.panelBg,
-    imageRendering: "pixelated", boxShadow: PopoverLayout.Shadow, pointerEvents: "auto",
-  };
-  return (
-    <div style={backdropStyle} onClick={/*closeOnOutsideClick*/ onClose}>
-      <div style={panelStyle} onClick={/*keepOpenInsidePanel*/ (e) => e.stopPropagation()}>
-        <LobbyPanel party={party} />
-      </div>
-    </div>
-  );
-}
diff --git a/src/ui/components/HUD/inventory/views/LobbyView.tsx b/src/ui/components/HUD/inventory/views/LobbyView.tsx
deleted file mode 100644
index 82670c28..00000000
--- a/src/ui/components/HUD/inventory/views/LobbyView.tsx
+++ /dev/null
@@ -1,180 +0,0 @@
-// @Architecture(descriptionShort="The Figma Lobby Window panel (node 1413:3678) minus its title bar — room code with sprite reveal/copy buttons, the live member list, and create/join-by-code or leave depending on lobby state, driven purely by bus commands.", descriptionLong="Exports the bare panel (LobbyPanel) and the tab that frames it (LobbyView); the HUD lobby button's popover mounts the same bare panel, so the tab and the popover cannot drift.")
-import { useEffect, useState, type CSSProperties, type KeyboardEvent } from "react";
-import { bus } from "@/bus/bus";
-import { useBus } from "@/ui/hooks/useBus";
-import { TabFrame, Btn } from "./TabScaffold";
-import { LobbyButton, LobbyIconButton } from "./LobbyButton";
-import { LobbyAsset } from "./lobbyAssets";
-import { roomCodeCells, RoomCodeText, type RoomCodeCell } from "./roomCodeDisplay";
-import { LobbyMemberList } from "./LobbyMemberList";
-import { LobbyHeadingStyle, LobbyLayout, LobbyPalette } from "./lobbyTheme";
-import type { PartyRoster } from "@/ui/hooks/usePartyRoster";
-import { InvTheme } from "../support";
-
-// The design is a 250px window, so it is centered in the 964px tab area rather than stretched across
-// it. The 4px left/right edges are the window's own borders; its title bar and footer are NOT ported
-// (the title carries the unimplemented public/private lobby-type feature).
-const Column: CSSProperties = {
-  width: LobbyLayout.ColumnWidth, margin: "0 auto", boxSizing: "border-box",
-  display: "flex", flexDirection: "column", gap: LobbyLayout.SectionGap,
-  background: LobbyPalette.panelBg,
-  borderLeft:  `${LobbyLayout.PanelBorder}px solid ${LobbyPalette.panelEdge}`,
-  borderRight: `${LobbyLayout.PanelBorder}px solid ${LobbyPalette.panelEdge}`,
-  padding: `${LobbyLayout.PanelPaddingY}px ${LobbyLayout.PanelPaddingX}px`,
-};
-// The heading takes no bottom margin here — the design stacks the code straight beneath it and the
-// 30px button row supplies the breathing room.
-const CodeRow: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: LobbyLayout.IconGap };
-const IconGroup: CSSProperties = { display: "flex", alignItems: "center", gap: LobbyLayout.IconGap };
-const CodeText: CSSProperties = {
-  display: "flex", fontFamily: InvTheme.pixel, fontSize: LobbyLayout.TitleFontSize,
-  letterSpacing: 2, color: LobbyPalette.code, lineHeight: 1,
-};
-// The masked character keeps its place in the layout and the dot is painted over it, so the readout
-// holds the real code's width in both states and the icon buttons never shift.
-const CodeCell: CSSProperties           = { position: "relative", display: "inline-block" };
-const CodeCellHiddenChar: CSSProperties = { visibility: "hidden" };
-const CodeCellMask: CSSProperties = {
-  position: "absolute", inset: 0, letterSpacing: 0,
-  display: "flex", alignItems: "center", justifyContent: "center",
-};
-const BodyText: CSSProperties  = { fontFamily: InvTheme.body, fontSize: LobbyLayout.NameFontSize, lineHeight: 1.4 };
-const ErrorLine: CSSProperties = { ...BodyText, color: InvTheme.malus };
-const JoinRow: CSSProperties   = { display: "flex", alignItems: "center", gap: LobbyLayout.IconGap };
-const JoinLabel: CSSProperties = { ...LobbyHeadingStyle, marginBottom: LobbyLayout.LabelGap };
-const CreateRow: CSSProperties = { ...JoinRow, marginTop: LobbyLayout.SectionGap };
-const CodeInput: CSSProperties = {
-  flex: "1 1 auto", minWidth: 0, boxSizing: "border-box", padding: "5px 8px",
-  background: "rgba(20,12,4,0.85)", border: `2px solid ${InvTheme.frameOuter}`, outline: "none",
-  fontFamily: InvTheme.pixel, fontSize: LobbyLayout.TitleFontSize, letterSpacing: 3, color: LobbyPalette.text,
-};
-
-// The tab remounts on every menu open, long after the one-shot lobbyCreated/lobbyJoined fired, so it
-// asks for a snapshot instead of assuming it witnessed them. `lobbySnapshot` is the ONLY writer of
-// the lobby's own fields — `wireLobbyCommands` republishes it after create/join/leave — so this view
-// never has to know which one-shot event carries which field; they only clear the stale error line.
-function useLobbyViewState() {
-  const [roomCode,  setRoomCode]  = useState("");
-  const [members,   setMembers]   = useState<string[]>([]);
-  const [hostPuid,  setHostPuid]  = useState<string | null>(null);
-  const [localPuid, setLocalPuid] = useState<string | null>(null);
-  const [error,     setError]     = useState("");
-
-  useBus("lobbySnapshot", snapshot => {
-    setRoomCode(snapshot.roomCode);
-    setMembers(snapshot.members);
-    setHostPuid(snapshot.hostPuid);
-    setLocalPuid(snapshot.localPuid);
-  });
-  const clearError = () => setError("");
-  useBus("lobbyCreated",        clearError);
-  useBus("lobbyJoined",         clearError);
-  useBus("lobbyLeft",           clearError);
-  useBus("lobbyMembersChanged", changedMembers => setMembers(changedMembers));
-  useBus("lobbyError",          ({ operation, message }) => setError(`${operation}: ${message}`));
-
-  useEffect(/* requestLobbySnapshotOnMount */ () => {
-    bus.emit("lobbySnapshotRequest", undefined);
-  }, [] /*Inputs for requestLobbySnapshotOnMount — stable*/);
-
-  return { roomCode, members, hostPuid, localPuid, error };
-}
-
-/** One span per character, the masked ones drawn as a dot over the hidden glyph: a dot is narrower
- *  than a letter in the pixel font, so substituting the text would drag the buttons beside it. */
-function RoomCodeReadout({ cells }: { cells: RoomCodeCell[] }) {
-  return (
-    <div style={CodeText}>
-      {cells.map((cell, index) => (
-        <span key={index} style={CodeCell}>
-          <span style={cell.masked ? CodeCellHiddenChar : undefined}>{cell.char}</span>
-          {cell.masked && <span style={CodeCellMask}>{RoomCodeText.MaskChar}</span>}
-        </span>
-      ))}
-    </div>
-  );
-}
-
-/** The "ROOM CODE" heading, its reveal/copy controls and the code itself. Starts masked and re-masks
- *  on every menu reopen (the tab remounts): the overlay sits on top of whatever the player is doing,
- *  and a code left on screen survives any screenshare. Copy stays enabled while masked — sending a
- *  friend the code never needs it visible. The design ships ONE eye sprite, so both toggle states
- *  wear it and the readout itself — dots vs digits — carries the state. */
-function RoomCodeSection({ roomCode }: { roomCode: string }) {
-  const [revealed, setRevealed] = useState(false);
-  const inLobby = roomCode !== "";
-  const copyCode = () => { if (inLobby) void navigator.clipboard.writeText(roomCode); };
-  return (
-    <div>
-      <div style={LobbyHeadingStyle}>Room code</div>
-      <div style={CodeRow}>
-        <RoomCodeReadout cells={roomCodeCells(roomCode, revealed)} />
-        <div style={IconGroup}>
-          <LobbyIconButton icon={LobbyAsset.iconEye} disabled={!inLobby}
-            tooltip={revealed ? "Hide the room code" : "Show the room code"}
-            onClick={/*toggleCodeVisibility*/ () => setRevealed(previous => !previous)} />
-          <LobbyIconButton icon={LobbyAsset.iconClipboard} tooltip="Copy the room code"
-            onClick={copyCode} disabled={!inLobby} />
-        </div>
-      </div>
-    </div>
-  );
-}
-
-/** Create-or-join, shown only OUTSIDE a lobby: the design draws just "Leave lobby" because it depicts
- *  a joined lobby, and the two states share the one narrow column. */
-function CreateOrJoinSection() {
-  const [code, setCode] = useState("");
-  const join = () => bus.emit("ui_joinLobby", code);
-  const joinOnEnter = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter") join(); };
-  return (
-    <div>
-      <div style={JoinLabel}>Join with a code</div>
-      <div style={JoinRow}>
-        <input style={CodeInput} value={code} placeholder="CODE" maxLength={RoomCodeText.Length}
-          onChange={event => setCode(event.target.value.toUpperCase())} onKeyDown={joinOnEnter} />
-        <Btn label="Join" onClick={join} />
-      </div>
-      <div style={CreateRow}>
-        <Btn label="Create lobby" onClick={() => bus.emit("ui_createLobby", undefined)} />
-      </div>
-    </div>
-  );
-}
-
-/** The lobby panel on its own — room code + reveal/copy, the member list, and create/join-by-code or
- *  leave — with no tab chrome around it. Emits `ui_createLobby`/`ui_joinLobby`/`ui_leaveLobby`; the app
- *  layer owns the EOS-session gate and the bridge (`app/hooks/lobbyCommands.ts`), so this view imports
- *  no network code. A successful join re-inits the game generation as a guest and unmounts whatever is
- *  hosting this panel — reopening it rehydrates from `lobbySnapshot`.
- *
- *  Rendered by BOTH the LOBBY tab and the HUD lobby button's popover (`LobbyPopover`), so the two
- *  surfaces cannot drift: each mounts its own `useLobbyViewState`, and every field in it comes from a
- *  bus snapshot requested on mount, so a second mounting point needs no shared state.
- *
- *  `party` is a PROP, not a hook call: it accumulates `playerJoined`, which fires at battle start,
- *  whereas this panel mounts only when the player opens a surface. Owning that subscription here would
- *  leave the list permanently empty, so it comes from the always-mounted `useHUDMenuData`. */
-export function LobbyPanel({ party }: { party: PartyRoster }) {
-  const { roomCode, members, hostPuid, localPuid, error } = useLobbyViewState();
-  const inLobby = roomCode !== "";
-  return (
-    <div style={Column}>
-      <RoomCodeSection roomCode={roomCode} />
-      <LobbyMemberList members={members} party={party} hostPuid={hostPuid} localPuid={localPuid} />
-      {inLobby
-        ? <LobbyButton label="Leave lobby" onClick={() => bus.emit("ui_leaveLobby", undefined)} />
-        : <CreateOrJoinSection />}
-      {error !== "" && <div style={ErrorLine}>{error}</div>}
-    </div>
-  );
-}
-
-/** Lobby tab: the panel above, inside the standard tab frame. */
-export function LobbyView({ party }: { party: PartyRoster }) {
-  return (
-    <TabFrame title="Lobby">
-      <LobbyPanel party={party} />
-    </TabFrame>
-  );
-}
diff --git a/src/ui/components/HUD/inventory/views/TabScaffold.tsx b/src/ui/components/HUD/inventory/views/TabScaffold.tsx
index 5b54c8da..417b069f 100644
--- a/src/ui/components/HUD/inventory/views/TabScaffold.tsx
+++ b/src/ui/components/HUD/inventory/views/TabScaffold.tsx
@@ -1,5 +1,6 @@
 import { type ReactNode } from "react";
-import { InvScrollClass, InvTheme } from "../support";
+import { InvTheme } from "../support";
+import { HudScrollClass } from "../../hudScrollbar";
 
 // Content region inside the window frame, below the tab strip (above the ornate bottom emblem).
 const Area = {
@@ -17,7 +18,7 @@ export function TabFrame({ title, children }: { title: string; children: ReactNo
   return (
     <div style={Area}>
       <div style={TitleRow}>{title}</div>
-      <div className={InvScrollClass} style={Body}>{children}</div>
+      <div className={HudScrollClass} style={Body}>{children}</div>
     </div>
   );
 }
diff --git a/src/ui/components/HUD/inventory/views/index.ts b/src/ui/components/HUD/inventory/views/index.ts
index 15552a5f..76a64e64 100644
--- a/src/ui/components/HUD/inventory/views/index.ts
+++ b/src/ui/components/HUD/inventory/views/index.ts
@@ -1,9 +1,7 @@
-// Public interface of the views subgroup (per-tab content panels, plus the one panel the HUD can also
-// float on its own — the lobby).
+// Public interface of the views subgroup (per-tab content panels). The lobby used to live here as a
+// tab; it is now its own window under `HUD/lobby/`.
 export { AbilitiesView } from "./AbilitiesView";
 export { ZoneView } from "./ZoneView";
-export { LobbyView } from "./LobbyView";
-export { LobbyPopover } from "./LobbyPopover";
 export { SettingsView, type SettingsViewProps } from "./SettingsView";
 export { ComingSoonView } from "./ComingSoonView";
 export { Filters } from "./Filters";
diff --git a/src/ui/components/HUD/inventory/views/lobbyAssets.ts b/src/ui/components/HUD/inventory/views/lobbyAssets.ts
deleted file mode 100644
index a2d46515..00000000
--- a/src/ui/components/HUD/inventory/views/lobbyAssets.ts
+++ /dev/null
@@ -1,29 +0,0 @@
-/** Public URLs for the lobby chrome sprites exported from Figma (node 1413:3678 "Lobby Window"),
- *  served by Vite from `public/assets/ui/lobby/`. All pixel-art → `image-rendering: pixelated`.
- *  Class icons are NOT here (they come from the catalog via `useClassIconMap`); only the grey
- *  "unknown class" shield is. Same shape as `support/assets.ts`, kept separate because the lobby is
- *  slated to move into its own window frame. */
-const LobbyAssetFolder = "/assets/ui/lobby";
-
-export const LobbyAsset = {
-  /** 214×34 member-row plate. The belt ornament and the dark class-icon well are baked in. */
-  rowIdle:            `${LobbyAssetFolder}/row-idle.png`,
-  /** 214×34 plate for the local player's row (green). */
-  rowLocal:           `${LobbyAssetFolder}/row-local.png`,
-  /** 16×9, drawn at 32×18 — the host marker. */
-  crown:              `${LobbyAssetFolder}/crown.png`,
-  /** 28×28 grey shield, shown when the class is unknown (a member the party has not accepted yet). */
-  classUnknown:       `${LobbyAssetFolder}/class-unknown.png`,
-  /** 5×30 brown icon-button end cap; mirrored horizontally for the right end. */
-  iconButtonCap:      `${LobbyAssetFolder}/btn-cap.png`,
-  /** 6×60 brown icon-button body, tiled horizontally at half size (3×30). */
-  iconButtonFill:     `${LobbyAssetFolder}/btn-fill.png`,
-  /** 5×30 orange Leave-button caps — left and right are distinct exports, not one mirrored. */
-  leaveCapLeft:       `${LobbyAssetFolder}/leave-cap-left.png`,
-  leaveCapRight:      `${LobbyAssetFolder}/leave-cap-right.png`,
-  /** 3×30 orange Leave-button body, tiled horizontally. */
-  leaveFill:          `${LobbyAssetFolder}/leave-fill.png`,
-  /** 30×30 glyphs that sit on top of a 30×30 icon button. */
-  iconEye:            `${LobbyAssetFolder}/icon-eye.png`,
-  iconClipboard:      `${LobbyAssetFolder}/icon-clipboard.png`,
-} as const;
diff --git a/src/ui/components/HUD/inventory/views/lobbyMemberRows.ts b/src/ui/components/HUD/inventory/views/lobbyMemberRows.ts
deleted file mode 100644
index d34865f5..00000000
--- a/src/ui/components/HUD/inventory/views/lobbyMemberRows.ts
+++ /dev/null
@@ -1,84 +0,0 @@
-// @Architecture(descriptionShort="Joins the EOS lobby roster (puids) against the battle party (names/class) into the lobby tab's member rows, hoists the host to the top, and owns the member-count label.", descriptionLong="DOM-free so the join rule — lobby drives the rows, party only enriches them — the host-first ordering, and the N/max label are all unit-testable without React.")
-import type { PartyRoster, RosterMember } from "@/ui/hooks/usePartyRoster";
-
-class LobbyRowText {
-  static readonly ShortPuidLength  = 6;
-  static readonly UnknownClassName = "—";
-}
-
-/** Mirrors `MAX_LOBBY_MEMBERS` in `src-tauri/src/eos/lobby/create.rs` (host + 3 guests). The mock-up's
- *  `5/6` was placeholder data — 6 is the dev-only fake-party slot count (`PlayerSlots.MaxPartySize`),
- *  which would overstate how many players can actually join. */
-export class LobbyCapacity {
-  static readonly MaxMembers = 4;
-}
-
-/** `N/max` for the MEMBERS header. Not clamped: a dev fake party can exceed the cap, and reading
- *  `5/4` is the honest signal that the roster on screen is not a joinable EOS lobby. */
-export function memberCountLabel(memberCount: number): string {
-  return `${memberCount}/${LobbyCapacity.MaxMembers}`;
-}
-
-export interface LobbyMemberRow {
-  puid:      string;
-  name:      string;
-  className: string;
-  isHost:    boolean;
-  isLocal:   boolean;
-  /** In the lobby, but not (yet) in the battle party — only the id is known. */
-  isPending: boolean;
-}
-
-export interface LobbyMemberRowsInput {
-  members:   ReadonlyArray<string>;
-  party:     PartyRoster;
-  hostPuid:  string | null;
-  localPuid: string | null;
-}
-
-// Lobby membership is keyed by EOS PUID (long opaque ids); shorten one so a row stays readable.
-export function shortPuid(puid: string): string {
-  const max = LobbyRowText.ShortPuidLength;
-  return puid.length > max ? `${puid.slice(0, max)}…` : puid;
-}
-
-function pendingRow(puid: string): Pick<LobbyMemberRow, "name" | "className" | "isPending"> {
-  return { name: shortPuid(puid), className: LobbyRowText.UnknownClassName, isPending: true };
-}
-
-function knownRow(member: RosterMember): Pick<LobbyMemberRow, "name" | "className" | "isPending"> {
-  return { name: member.name, className: member.className, isPending: false };
-}
-
-/**
- * EOS returns members in arbitrary order, but the design crowns the top row and rules a separator
- * beneath it — which only reads as "owner above, guests below" if the owner is actually there.
- * A stable partition rather than a sort: exactly one row moves, so an unrelated join or leave never
- * appears to reshuffle the guests.
- */
-function hostFirst(rows: LobbyMemberRow[]): LobbyMemberRow[] {
-  const hostIndex = rows.findIndex(row => row.isHost);
-  if (hostIndex <= 0) return rows;
-  return [rows[hostIndex], ...rows.slice(0, hostIndex), ...rows.slice(hostIndex + 1)];
-}
-
-/**
- * One row per LOBBY member, never per party member: EOS admits a player immediately, but
- * `RoomSchema.players` only gains them once the join handshake is accepted. Driving off the party
- * would make the list disagree with its own "MEMBERS N/max" count and hide a joining friend for a
- * few seconds, so an unmatched member becomes a placeholder row instead.
- *
- * `className` is the only enrichment: a row draws a class icon and a name, nothing the party's
- * level/hp could fill (the HUD party bars carry those).
- */
-export function buildLobbyMemberRows({ members, party, hostPuid, localPuid }: LobbyMemberRowsInput): LobbyMemberRow[] {
-  return hostFirst(members.map(puid => {
-    const member = party.get(puid);
-    return {
-      puid,
-      isHost:  hostPuid !== null && puid === hostPuid,
-      isLocal: localPuid !== null && puid === localPuid,
-      ...(member ? knownRow(member) : pendingRow(puid)),
-    };
-  }));
-}
diff --git a/src/ui/components/HUD/inventory/views/lobbyTheme.ts b/src/ui/components/HUD/inventory/views/lobbyTheme.ts
deleted file mode 100644
index b0d92506..00000000
--- a/src/ui/components/HUD/inventory/views/lobbyTheme.ts
+++ /dev/null
@@ -1,67 +0,0 @@
-// @Architecture(descriptionShort="Lobby-tab-only palette, geometry and shared heading style, ported 1:1 from the Figma Lobby Window (node 1413:3678).", descriptionLong="Kept out of the shared InvTheme because none of these colours appear elsewhere in the window and the lobby is slated to move into its own frame, so its chrome must be able to drift alone.")
-import type { CSSProperties } from "react";
-import { InvTheme } from "../support";
-
-/** Figma variables from the Lobby Window frame (`Wireframe Colors/*`, `Text Feedback/Success`).
- *  No scrollbar colours: the list wears the shared `.inv-scroll` bar, narrowed by `invScrollWidth`. */
-export const LobbyPalette = {
-  text:         "#e8c878",   // Wireframe Colors/Text and Button
-  code:         "#2bff75",   // Text Feedback/Success — the room code reads green
-  panelBg:      "#2c1d26",   // Content panel behind the whole lobby
-  panelEdge:    "#633a4c",   // 4px left/right window borders
-  separator:    "#5c3a1d",   // 3px rule under the host row
-} as const;
-
-/**
- * A fixed-width column CENTERED in the tab area, not stretched across it: the design is 250px wide
- * against a 964px tab area, and it pre-fits the narrower frame the lobby will move into later.
- *
- * The arithmetic is load-bearing and closes exactly: `ColumnWidth` − 2×`PanelBorder` −
- * 2×`PanelPaddingX` = `ContentWidth` = `RowWidth` + `ScrollbarWidth`. The row sprite must be drawn
- * at its native 214px or the belt baked into it blurs, hence the pinned 4px scrollbar.
- */
-export class LobbyLayout {
-  static readonly ColumnWidth     = 250;
-  static readonly PanelBorder     = 4;
-  static readonly PanelPaddingX   = 12;
-  static readonly PanelPaddingY   = 8;
-  static readonly SectionGap      = 8;
-  /** Between a heading and the content directly under it — tighter than the gap between sections. */
-  static readonly LabelGap        = 6;
-  static readonly SeparatorHeight = 3;
-
-  static readonly RowWidth        = 214;
-  static readonly RowHeight       = 34;
-  static readonly RowGap          = 6;
-  static readonly VisibleRows     = 6;
-  static readonly ListMaxHeight   = LobbyLayout.VisibleRows * (LobbyLayout.RowHeight + LobbyLayout.RowGap);
-  static readonly ScrollbarWidth  = 4;
-  static readonly ContentWidth    = LobbyLayout.RowWidth + LobbyLayout.ScrollbarWidth;
-
-  /** Class icon: 28×28 dropped into the well the row sprite paints at x=19, y=3. */
-  static readonly ClassIconSize   = 28;
-  static readonly ClassIconLeft   = 19;
-  static readonly ClassIconTop    = 3;
-  /** The name group starts past the well, at the sprite's plate edge. */
-  static readonly NameGroupLeft   = 56;
-  static readonly NameGroupGap    = 8;
-  static readonly CrownWidth      = 32;
-  static readonly CrownHeight     = 18;
-
-  static readonly ButtonHeight    = 30;
-  static readonly ButtonCapWidth  = 5;
-  static readonly ButtonFillWidth = 3;
-  static readonly IconButtonSize  = 30;
-  static readonly IconGap         = 8;
-
-  /** Jersey 25 for headings and the code, Inter for member names — straight from the design. */
-  static readonly TitleFontSize   = 17;
-  static readonly NameFontSize    = 14;
-}
-
-/** The one uppercase-heading style the section labels, the MEMBERS header and the button plate's
- *  label share, so the three cannot drift apart. */
-export const LobbyHeadingStyle: CSSProperties = {
-  fontFamily: InvTheme.pixel, fontSize: LobbyLayout.TitleFontSize,
-  color: LobbyPalette.text, textTransform: "uppercase", lineHeight: 1,
-};
diff --git a/src/ui/components/HUD/inventory/views/roomCodeDisplay.ts b/src/ui/components/HUD/inventory/views/roomCodeDisplay.ts
deleted file mode 100644
index 303523f5..00000000
--- a/src/ui/components/HUD/inventory/views/roomCodeDisplay.ts
+++ /dev/null
@@ -1,26 +0,0 @@
-// @Architecture(descriptionShort="Pure cell model for the Lobby tab's room-code readout: one cell per real character, each flagged masked or not, so revealing the code never reflows the row. Extracted from LobbyView so the display states are unit-testable without a DOM.")
-
-export class RoomCodeText {
-  // Mirrors the private RoomCode.Length — a display/typing hint only; the bridge still validates.
-  static readonly Length   = 6;
-  static readonly MaskChar = "•";
-  static readonly Empty    = "—";
-}
-
-export interface RoomCodeCell {
-  char:   string;    // the REAL character — it reserves the cell's width even while masked
-  masked: boolean;   // true ⇒ draw MaskChar over the (hidden) character instead of showing it
-}
-
-/**
- * One cell per rendered character. `char` is always the real glyph because the renderer keeps it in
- * the layout (hidden) and paints the mask on top: a mask character is narrower than a letter in the
- * pixel font, so masking the *text* instead would shrink the readout and shove the adjacent buttons
- * sideways on every toggle. Consequence: the dot count equals the real code's length. That is not a
- * leak worth avoiding — every room code is `RoomCodeText.Length` characters — and it is what keeps
- * the row stable.
- */
-export function roomCodeCells(roomCode: string, revealed: boolean): RoomCodeCell[] {
-  if (roomCode === "") return [{ char: RoomCodeText.Empty, masked: false }];
-  return [...roomCode].map(char => ({ char, masked: !revealed }));
-}
diff --git a/src/ui/components/HUD/inventory/views/views.group.md b/src/ui/components/HUD/inventory/views/views.group.md
index 94f27285..ad7dbaf1 100644
--- a/src/ui/components/HUD/inventory/views/views.group.md
+++ b/src/ui/components/HUD/inventory/views/views.group.md
@@ -7,6 +7,8 @@ facades: ["index.ts"]
 ---
 Per-tab content panels.
 
-The abilities, zone, lobby, settings, and coming-soon tab views, the shared filters bar, `TabScaffold` (the shared `TabFrame`/`Card`/`Btn`/`Toggle` content kit those views are built from), the lobby's own sprite chrome (`LobbyButton`, `lobbyAssets`, `lobbyTheme`, `LobbyMemberList` + the pure `lobbyMemberRows`), the pure `roomCodeDisplay` helper, and the `Dropdown` primitive used by the filters bar.
+The abilities, zone, settings, and coming-soon tab views, the shared filters bar, `TabScaffold` (the shared `TabFrame`/`Card`/`Btn`/`Toggle` content kit those views are built from), and the `Dropdown` primitive used by the filters bar.
 
-Views talk to the game only over the bus (`ui_*` commands out, snapshots/state events in) — `LobbyView` is the strictest case: it drives EOS lobbies without importing `src/network` or the auth layer.
+Views talk to the game only over the bus (`ui_*` commands out, snapshots/state events in), never by importing `src/network` or the auth layer.
+
+The lobby used to be a tab here; it is now its own window under `HUD/lobby/`.
diff --git a/src/ui/components/HUD/lobby/LobbyButton.tsx b/src/ui/components/HUD/lobby/LobbyButton.tsx
new file mode 100644
index 00000000..918d4c35
--- /dev/null
+++ b/src/ui/components/HUD/lobby/LobbyButton.tsx
@@ -0,0 +1,52 @@
+// @Architecture(descriptionShort="The lobby's two sprite buttons: a full-width labelled plate (Leave lobby) and a 30x30 icon button, both built from the shared three-slice plate in spritePlate.ts.")
+import type { CSSProperties, ReactNode } from "react";
+import { LobbyAsset } from "./lobbyAssets";
+import { LobbyHeadingStyle, LobbyLayout, LobbyPalette } from "./lobbyTheme";
+import { PlateBase, PlateCap, PlateCapMirrored, plateBodyStyle } from "./spritePlate";
+
+const Label: CSSProperties = { ...LobbyHeadingStyle, whiteSpace: "nowrap" };
+
+interface LobbyButtonProps { label: string; onClick: () => void }
+
+/** The orange full-width action plate (Leave lobby, Join). Its two caps are distinct exports rather
+ *  than one mirrored image — the design draws a different highlight on each end. */
+export function LobbyButton({ label, onClick }: LobbyButtonProps) {
+  return (
+    <button type="button" onClick={onClick} style={{ ...PlateBase, width: "100%" }}>
+      <img src={LobbyAsset.leaveCapLeft} alt="" style={PlateCap} />
+      <span style={plateBodyStyle(LobbyAsset.leaveFill, LobbyLayout.ButtonFillWidth, /*centerContent=*/true)}>
+        <span style={Label}>{label}</span>
+      </span>
+      <img src={LobbyAsset.leaveCapRight} alt="" style={PlateCap} />
+    </button>
+  );
+}
+
+const IconButtonBase: CSSProperties = {
+  ...PlateBase, position: "relative", width: LobbyLayout.IconButtonSize, flex: "0 0 auto",
+};
+// The glyph is a full 30x30 sprite laid over the whole button, exactly as the design composes it.
+const Glyph: CSSProperties = {
+  position: "absolute", inset: 0, width: "100%", height: "100%",
+  imageRendering: "pixelated", pointerEvents: "none",
+};
+
+interface LobbyIconButtonProps { icon: string; tooltip: string; onClick: () => void }
+
+/** A 30×30 brown icon button. `tooltip` is mandatory — an icon never explains itself — and doubles
+ *  as the hover label and the accessible name. */
+export function LobbyIconButton({ icon, tooltip, onClick }: LobbyIconButtonProps) {
+  return (
+    <button type="button" onClick={onClick} aria-label={tooltip} title={tooltip} style={IconButtonBase}>
+      <img src={LobbyAsset.iconButtonCap} alt="" style={PlateCap} />
+      <span style={plateBodyStyle(LobbyAsset.iconButtonFill, LobbyLayout.ButtonFillWidth)} />
+      <img src={LobbyAsset.iconButtonCap} alt="" style={PlateCapMirrored} />
+      <img src={icon} alt="" style={Glyph} />
+    </button>
+  );
+}
+
+/** The 3px rule the design draws between sections and under the host row. */
+export function LobbySeparator(): ReactNode {
+  return <div style={{ width: "100%", height: LobbyLayout.SeparatorHeight, background: LobbyPalette.separator, flex: "0 0 auto" }} />;
+}
diff --git a/src/ui/components/HUD/lobby/LobbyMemberList.tsx b/src/ui/components/HUD/lobby/LobbyMemberList.tsx
new file mode 100644
index 00000000..a83c4770
--- /dev/null
+++ b/src/ui/components/HUD/lobby/LobbyMemberList.tsx
@@ -0,0 +1,109 @@
+// @Architecture(descriptionShort="The lobby window's member list: a MEMBERS N/max header over one 214x34 sprite plate per EOS lobby member, with the catalog class icon and the owner's crown laid over it, the green plate for the local player, and a 3px rule under the host row.")
+import { Fragment, useMemo, type CSSProperties } from "react";
+import { LobbySeparator } from "./LobbyButton";
+import { LobbyAsset } from "./lobbyAssets";
+import { buildLobbyMemberRows, memberCountLabel, type LobbyMemberRow } from "./lobbyMemberRows";
+import { LobbyHeadingStyle, LobbyLayout, LobbyPalette } from "./lobbyTheme";
+import { useClassIconMap } from "@/ui/hooks/useClassIconMap";
+import type { PartyRoster } from "@/ui/hooks/usePartyRoster";
+import { HudFont } from "../hudFonts";
+import { HudScrollClass, hudScrollWidth } from "../hudScrollbar";
+
+class MemberRowArt {
+  static readonly PendingOpacity = 0.55;
+}
+
+const HeaderRow: CSSProperties = {
+  ...LobbyHeadingStyle, display: "flex", justifyContent: "space-between",
+  alignItems: "center", marginBottom: LobbyLayout.LabelGap,
+};
+// The shared `.hud-scroll` bar, pinned to the design's 4px so `RowWidth + ScrollbarWidth` still
+// equals `ContentWidth`.
+const ScrollList: CSSProperties = {
+  ...hudScrollWidth(LobbyLayout.ScrollbarWidth),
+  display: "flex", flexDirection: "column", gap: LobbyLayout.RowGap,
+  width: LobbyLayout.ContentWidth, maxHeight: LobbyLayout.ListMaxHeight, overflowY: "auto",
+};
+// The plate is one 214x34 export with the belt ornament and the class-icon well already painted in,
+// so a row is a positioning context over that image, not a stack of CSS boxes.
+const MemberRowBase: CSSProperties = {
+  position: "relative", flex: "0 0 auto",
+  width: LobbyLayout.RowWidth, height: LobbyLayout.RowHeight,
+  backgroundRepeat: "no-repeat", backgroundSize: `${LobbyLayout.RowWidth}px ${LobbyLayout.RowHeight}px`,
+  imageRendering: "pixelated",
+};
+const ClassIcon: CSSProperties = {
+  position: "absolute", left: LobbyLayout.ClassIconLeft, top: LobbyLayout.ClassIconTop,
+  width: LobbyLayout.ClassIconSize, height: LobbyLayout.ClassIconSize, imageRendering: "pixelated",
+};
+const NameGroup: CSSProperties = {
+  position: "absolute", left: LobbyLayout.NameGroupLeft, top: 0, right: 0, height: "100%",
+  display: "flex", alignItems: "center", gap: LobbyLayout.NameGroupGap, minWidth: 0,
+};
+const Crown: CSSProperties = {
+  width: LobbyLayout.CrownWidth, height: LobbyLayout.CrownHeight,
+  flex: "0 0 auto", imageRendering: "pixelated",
+};
+const MemberName: CSSProperties = {
+  fontFamily: HudFont.body, fontSize: LobbyLayout.NameFontSize, color: LobbyPalette.text,
+  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
+};
+const EmptyStateLine: CSSProperties = { ...MemberName, whiteSpace: "normal" };
+
+// Dim the whole pending row, not just its missing parts, or it reads as a member with a broken class.
+function memberRowStyle(row: LobbyMemberRow): CSSProperties {
+  return {
+    ...MemberRowBase,
+    backgroundImage: `url(${row.isLocal ? LobbyAsset.rowLocal : LobbyAsset.rowIdle})`,
+    opacity: row.isPending ? MemberRowArt.PendingOpacity : 1,
+  };
+}
+
+function MemberRow({ row, classIconUrl }: { row: LobbyMemberRow; classIconUrl: string | undefined }) {
+  return (
+    <div style={memberRowStyle(row)} title={row.isPending ? "In the lobby — not in the battle party yet" : undefined}>
+      <img src={classIconUrl ?? LobbyAsset.classUnknown} alt="" style={ClassIcon} />
+      <div style={NameGroup}>
+        {row.isHost && <img src={LobbyAsset.crown} alt="" style={Crown} />}
+        <span style={MemberName}>{row.name}</span>
+      </div>
+    </div>
+  );
+}
+
+export interface LobbyMemberListProps {
+  members:   string[];
+  party:     PartyRoster;
+  hostPuid:  string | null;
+  localPuid: string | null;
+}
+
+/** The lobby roster: rows come from the EOS member list and are enriched from the battle party —
+ *  see `buildLobbyMemberRows` for why that direction is load-bearing. */
+export function LobbyMemberList({ members, party, hostPuid, localPuid }: LobbyMemberListProps) {
+  const classIcons = useClassIconMap();
+  const rows = useMemo(/* buildMemberRows */ () => buildLobbyMemberRows({ members, party, hostPuid, localPuid }),
+    [members, party, hostPuid, localPuid] /*Inputs for buildMemberRows*/);
+
+  return (
+    <div>
+      <div style={HeaderRow}>
+        <span>Members</span>
+        <span>{memberCountLabel(members.length)}</span>
+      </div>
+      {rows.length === 0
+        ? <div style={EmptyStateLine}>Waiting for the roster — nobody has joined this lobby yet.</div>
+        : (
+          <div className={HudScrollClass} style={ScrollList}>
+            {rows.map((row, index) => (
+              <Fragment key={row.puid}>
+                <MemberRow row={row} classIconUrl={classIcons.get(row.className.toLowerCase())} />
+                {/* Splits the owner from the guests — not a per-row divider. */}
+                {row.isHost && index < rows.length - 1 && <LobbySeparator />}
+              </Fragment>
+            ))}
+          </div>
+        )}
+    </div>
+  );
+}
diff --git a/src/ui/components/HUD/lobby/LobbyModeTabs.tsx b/src/ui/components/HUD/lobby/LobbyModeTabs.tsx
new file mode 100644
index 00000000..c6ce6f05
--- /dev/null
+++ b/src/ui/components/HUD/lobby/LobbyModeTabs.tsx
@@ -0,0 +1,69 @@
+// @Architecture(type=Component, descriptionShort="The lobby window's three-slice mode tabs (public / private / offline) — the whole lobby control surface for a host; the window draws no tab row at all for a guest.")
+import type { CSSProperties } from "react";
+import { bus } from "@/bus/bus";
+import type { LobbyMode } from "@/bus/bus";
+import { LobbyAsset } from "./lobbyAssets";
+import { LobbyModeTabs as ModeTabs, tabSprites, type LobbyModeTab } from "./lobbyMode";
+import { LobbyLayout } from "./lobbyTheme";
+import { PlateBase, PlateCap, PlateCapMirrored, plateBodyStyle } from "./spritePlate";
+
+const TabRow: CSSProperties = {
+  display: "flex", alignItems: "flex-start", gap: LobbyLayout.TabGap, width: "100%",
+};
+// Each tab is the shared three-slice plate with the glyph laid OVER it, exactly as the design
+// composes it; only the equal-width stretch and the positioning context are the tab's own.
+const TabBase: CSSProperties = {
+  ...PlateBase, position: "relative", flex: "1 1 0", minWidth: 0,
+};
+const Glyph: CSSProperties = {
+  position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)",
+  width: LobbyLayout.TabIconSize, height: LobbyLayout.TabIconSize,
+  imageRendering: "pixelated", pointerEvents: "none",
+};
+// The crown pokes above the plate rather than sitting inside it — there is no room beside a 30px glyph.
+const Crown: CSSProperties = {
+  position: "absolute", left: "50%", top: LobbyLayout.CrownTabTop, transform: "translateX(-50%)",
+  width: LobbyLayout.CrownTabWidth, height: LobbyLayout.CrownTabHeight,
+  imageRendering: "pixelated", pointerEvents: "none",
+};
+
+interface ModeTabProps {
+  tab:      LobbyModeTab;
+  isActive: boolean;
+  /** Only over the ACTIVE tab, and only for the owner — it says "this lobby is yours to re-label". */
+  showCrown: boolean;
+}
+
+function ModeTab({ tab, isActive, showCrown }: ModeTabProps) {
+  const sprites = tabSprites(tab, isActive);
+  return (
+    <button type="button" style={TabBase} aria-pressed={isActive} aria-label={tab.tooltip} title={tab.tooltip}
+      onClick={/*requestLobbyMode*/ () => bus.emit("ui_setLobbyMode", tab.mode)}>
+      <img src={sprites.cap} alt="" style={PlateCap} />
+      <span style={plateBodyStyle(sprites.fill, sprites.fillWidth)} />
+      <img src={sprites.cap} alt="" style={PlateCapMirrored} />
+      <img src={sprites.glyph} alt="" style={Glyph} />
+      {showCrown && <img src={LobbyAsset.crown} alt="" style={Crown} />}
+    </button>
+  );
+}
+
+interface LobbyModeTabsProps {
+  mode:   LobbyMode;
+  /** Draws the crown over the active tab. A guest never reaches this component at all: the design
+   *  draws no tab row for them, so `LobbyWindow` omits the whole header (rule included) rather than
+   *  rendering a row of dead controls that invite a click which can only fail. */
+  isHost: boolean;
+}
+
+/** The mode header: the three tabs, for a host or an offline player. */
+export function LobbyModeTabsRow({ mode, isHost }: LobbyModeTabsProps) {
+  return (
+    <div style={TabRow}>
+      {ModeTabs.map(tab => (
+        <ModeTab key={tab.mode} tab={tab} isActive={tab.mode === mode}
+          showCrown={isHost && tab.mode === mode} />
+      ))}
+    </div>
+  );
+}
diff --git a/src/ui/components/HUD/lobby/LobbyPanel.tsx b/src/ui/components/HUD/lobby/LobbyPanel.tsx
new file mode 100644
index 00000000..234db4f5
--- /dev/null
+++ b/src/ui/components/HUD/lobby/LobbyPanel.tsx
@@ -0,0 +1,174 @@
+// @Architecture(descriptionShort="Body of the Figma Lobby Window (nodes 1411:2053 / 1411:1927 / 1413:3678): room code with sprite reveal/copy buttons, the live member list, and the join-by-code row or the guest's Leave button, driven purely by bus commands.", descriptionLong="Exports the panel and the lobby-state hook the window around it also reads; the mode header lives in LobbyWindow, so the panel never has to know how the player got here.")
+import { useEffect, useState, type CSSProperties, type KeyboardEvent } from "react";
+import { bus } from "@/bus/bus";
+import type { LobbyMode } from "@/bus/bus";
+import { useBus } from "@/ui/hooks/useBus";
+import { LobbyButton, LobbyIconButton } from "./LobbyButton";
+import { LobbyAsset } from "./lobbyAssets";
+import { roomCodeCells, RoomCodeText, type RoomCodeCell } from "./roomCodeDisplay";
+import { LobbyMemberList } from "./LobbyMemberList";
+import { lobbyRole } from "./lobbyMode";
+import { HudFont } from "../hudFonts";
+import { LobbyHeadingStyle, LobbyLayout, LobbyPalette, LobbyPanelColumn } from "./lobbyTheme";
+import type { PartyRoster } from "@/ui/hooks/usePartyRoster";
+// The heading takes no bottom margin here — the design stacks the code straight beneath it and the
+// 30px button row supplies the breathing room.
+const CodeRow: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: LobbyLayout.IconGap };
+const IconGroup: CSSProperties = { display: "flex", alignItems: "center", gap: LobbyLayout.IconGap };
+const CodeText: CSSProperties = {
+  display: "flex", fontFamily: HudFont.pixel, fontSize: LobbyLayout.TitleFontSize,
+  letterSpacing: 2, color: LobbyPalette.code, lineHeight: 1,
+};
+// The masked character keeps its place in the layout and the dot is painted over it, so the readout
+// holds the real code's width in both states and the icon buttons never shift.
+const CodeCell: CSSProperties           = { position: "relative", display: "inline-block" };
+const CodeCellHiddenChar: CSSProperties = { visibility: "hidden" };
+const CodeCellMask: CSSProperties = {
+  position: "absolute", inset: 0, letterSpacing: 0,
+  display: "flex", alignItems: "center", justifyContent: "center",
+};
+const BodyText: CSSProperties  = { fontFamily: HudFont.body, fontSize: LobbyLayout.NameFontSize, lineHeight: 1.4 };
+const ErrorLine: CSSProperties = { ...BodyText, color: LobbyPalette.error };
+const JoinRow: CSSProperties   = { display: "flex", alignItems: "center", gap: LobbyLayout.IconGap };
+const CodeInput: CSSProperties = {
+  flex: "1 1 auto", minWidth: 0, boxSizing: "border-box", padding: "5px 8px",
+  background: LobbyPalette.inputBg, border: `3px solid ${LobbyPalette.separator}`, outline: "none",
+  fontFamily: HudFont.pixel, fontSize: LobbyLayout.TitleFontSize, letterSpacing: 3, color: LobbyPalette.text,
+};
+
+export interface LobbyViewState {
+  roomCode:  string;
+  members:   string[];
+  hostPuid:  string | null;
+  localPuid: string | null;
+  mode:      LobbyMode;
+  error:     string;
+}
+
+// The window remounts on every open, long after the one-shot lobbyCreated/lobbyJoined fired, so it
+// asks for a snapshot instead of assuming it witnessed them. `lobbySnapshot` is the ONLY writer of
+// the lobby's own fields — `wireLobbyCommands` republishes it after create/join/leave/mode change —
+// so this view never has to know which one-shot event carries which field; they only clear the
+// stale error line.
+export function useLobbyViewState(): LobbyViewState {
+  const [roomCode,  setRoomCode]  = useState("");
+  const [members,   setMembers]   = useState<string[]>([]);
+  const [hostPuid,  setHostPuid]  = useState<string | null>(null);
+  const [localPuid, setLocalPuid] = useState<string | null>(null);
+  const [mode,      setMode]      = useState<LobbyMode>("offline");
+  const [error,     setError]     = useState("");
+
+  useBus("lobbySnapshot", snapshot => {
+    setRoomCode(snapshot.roomCode);
+    setMembers(snapshot.members);
+    setHostPuid(snapshot.hostPuid);
+    setLocalPuid(snapshot.localPuid);
+    setMode(snapshot.mode);
+  });
+  const clearError = () => setError("");
+  useBus("lobbyCreated",        clearError);
+  useBus("lobbyJoined",         clearError);
+  useBus("lobbyLeft",           clearError);
+  useBus("lobbyMembersChanged", changedMembers => setMembers(changedMembers));
+  useBus("lobbyError",          ({ operation, message }) => setError(`${operation}: ${message}`));
+
+  useEffect(/* requestLobbySnapshotOnMount */ () => {
+    bus.emit("lobbySnapshotRequest", undefined);
+  }, [] /*Inputs for requestLobbySnapshotOnMount — stable*/);
+
+  return { roomCode, members, hostPuid, localPuid, mode, error };
+}
+
+/** One span per character, the masked ones drawn as a dot over the hidden glyph: a dot is narrower
+ *  than a letter in the pixel font, so substituting the text would drag the buttons beside it. */
+function RoomCodeReadout({ cells }: { cells: RoomCodeCell[] }) {
+  return (
+    <div style={CodeText}>
+      {cells.map((cell, index) => (
+        <span key={index} style={CodeCell}>
+          <span style={cell.masked ? CodeCellHiddenChar : undefined}>{cell.char}</span>
+          {cell.masked && <span style={CodeCellMask}>{RoomCodeText.MaskChar}</span>}
+        </span>
+      ))}
+    </div>
+  );
+}
+
+/** The "ROOM CODE" heading, its reveal/copy controls and the code itself. Starts masked and re-masks
+ *  on every reopen (the window remounts): the overlay sits on top of whatever the player is doing,
+ *  and a code left on screen survives any screenshare. Copy stays enabled while masked — sending a
+ *  friend the code never needs it visible. The design ships ONE eye sprite, so both toggle states
+ *  wear it and the readout itself — dots vs digits — carries the state. */
+function RoomCodeSection({ roomCode }: { roomCode: string }) {
+  const [revealed, setRevealed] = useState(false);
+  const copyCode = () => { void navigator.clipboard.writeText(roomCode); };
+  return (
+    <div>
+      <div style={LobbyHeadingStyle}>Room code</div>
+      <div style={CodeRow}>
+        <RoomCodeReadout cells={roomCodeCells(roomCode, revealed)} />
+        <div style={IconGroup}>
+          <LobbyIconButton icon={LobbyAsset.iconEye}
+            tooltip={revealed ? "Hide the room code" : "Show the room code"}
+            onClick={/*toggleCodeVisibility*/ () => setRevealed(previous => !previous)} />
+          <LobbyIconButton icon={LobbyAsset.iconClipboard} tooltip="Copy the room code" onClick={copyCode} />
+        </div>
+      </div>
+    </div>
+  );
+}
+
+/** Join-by-code, shown only in offline mode — the mode tabs above already cover *creating* a lobby,
+ *  so this row is the one thing they cannot express. */
+function JoinSection() {
+  const [code, setCode] = useState("");
+  const join = () => bus.emit("ui_joinLobby", code);
+  const joinOnEnter = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter") join(); };
+  return (
+    <div style={JoinRow}>
+      <input style={CodeInput} value={code} placeholder="ENTER CODE" maxLength={RoomCodeText.Length}
+        onChange={event => setCode(event.target.value.toUpperCase())} onKeyDown={joinOnEnter} />
+      <LobbyButton label="Join" onClick={join} />
+    </div>
+  );
+}
+
+export interface LobbyPanelProps {
+  party: PartyRoster;
+  state: LobbyViewState;
+}
+
+/**
+ * The lobby window's body. Offline it collapses to the join row alone (Figma 1411:1927, a 139px
+ * window); in a lobby it is the room code, the member list, and — for a guest — Leave.
+ *
+ * Emits `ui_joinLobby`/`ui_leaveLobby` only; the app layer owns the EOS-session gate and the bridge
+ * (`app/hooks/lobbyCommands.ts`), so this view imports no network code. A successful join re-inits
+ * the game generation as a guest and unmounts whatever is hosting this panel — reopening it
+ * rehydrates from `lobbySnapshot`.
+ *
+ * `party` is a PROP, not a hook call: it accumulates `playerJoined`, which fires at battle start,
+ * whereas this panel mounts only when the player opens it. Owning that subscription here would
+ * leave the list permanently empty, so it comes from the always-mounted `useHUDMenuData`.
+ */
+export function LobbyPanel({ party, state }: LobbyPanelProps) {
+  const { roomCode, members, hostPuid, localPuid, error } = state;
+  // Derived here rather than taken as a prop: every input is already in `state`, and the rule lives
+  // in the pure `lobbyMode.ts` beside `isLobbyHost` so the whole guest matrix has one definition.
+  const role = lobbyRole(state);
+  return (
+    <div style={LobbyPanelColumn}>
+      {role === "offline"
+        ? <JoinSection />
+        : (
+          <>
+            <RoomCodeSection roomCode={roomCode} />
+            <LobbyMemberList members={members} party={party} hostPuid={hostPuid} localPuid={localPuid} />
+            {/* Only a guest gets a Leave button: a host leaves through the offline mode tab. */}
+            {role === "guest" && <LobbyButton label="Leave lobby" onClick={() => bus.emit("ui_leaveLobby", undefined)} />}
+          </>
+        )}
+      {error !== "" && <div style={ErrorLine}>{error}</div>}
+    </div>
+  );
+}
diff --git a/src/ui/components/HUD/lobby/LobbyPopover.tsx b/src/ui/components/HUD/lobby/LobbyPopover.tsx
new file mode 100644
index 00000000..41117794
--- /dev/null
+++ b/src/ui/components/HUD/lobby/LobbyPopover.tsx
@@ -0,0 +1,45 @@
+// @Architecture(type=Component, descriptionShort="Floating container that mounts the lobby window over the game for the HUD lobby button; owns only the backdrop, the anchoring and the drop shadow.")
+import { type CSSProperties } from "react";
+import type { PartyRoster } from "@/ui/hooks/usePartyRoster";
+import { LobbyWindow } from "./LobbyWindow";
+import { LobbyLayout } from "./lobbyTheme";
+
+class PopoverLayout {
+  static readonly ZIndex      = 10_000;
+  /** Between the HUD button row and the window's bottom edge — matches the zone-info card's gap. */
+  static readonly GapAboveRow = 6;
+  static readonly Shadow      = "0 4px 16px rgba(0,0,0,0.6)";
+}
+
+const backdropStyle: CSSProperties = { position: "fixed", inset: 0, zIndex: PopoverLayout.ZIndex, pointerEvents: "auto" };
+
+interface LobbyPopoverProps {
+  party:   PartyRoster;
+  /** The HUD button row's top-RIGHT corner; the window opens up and to the left from there. */
+  anchor:  { left: number; top: number };
+  onClose: () => void;
+}
+
+/** The lobby as a standalone floating surface, opened by the HUD's lobby button — the only lobby
+ *  surface there is since the inventory window's LOBBY tab was removed. Dismisses on backdrop click,
+ *  on a second click of the button, or on Escape (`useHudOverlays` owns that binding for every
+ *  overlay).
+ *
+ *  `LobbyWindow` paints all four edges itself now (title-bar and footer textures top and bottom, the
+ *  panel's own borders left and right), so this wrapper contributes no chrome — only where the
+ *  window sits and what dismisses it. */
+export function LobbyPopover({ party, anchor, onClose }: LobbyPopoverProps) {
+  const windowStyle: CSSProperties = {
+    position: "absolute", left: anchor.left, top: anchor.top - PopoverLayout.GapAboveRow,
+    transform: "translate(-100%, -100%)", width: LobbyLayout.ColumnWidth,
+    boxSizing: "border-box",
+    imageRendering: "pixelated", filter: `drop-shadow(${PopoverLayout.Shadow})`, pointerEvents: "auto",
+  };
+  return (
+    <div style={backdropStyle} onClick={/*closeOnOutsideClick*/ onClose}>
+      <div style={windowStyle} onClick={/*keepOpenInsideWindow*/ (e) => e.stopPropagation()}>
+        <LobbyWindow party={party} />
+      </div>
+    </div>
+  );
+}
diff --git a/src/ui/components/HUD/lobby/LobbyWindow.tsx b/src/ui/components/HUD/lobby/LobbyWindow.tsx
new file mode 100644
index 00000000..220aecdc
--- /dev/null
+++ b/src/ui/components/HUD/lobby/LobbyWindow.tsx
@@ -0,0 +1,59 @@
+// @Architecture(type=Component, descriptionShort="The whole Figma lobby window: crimson title bar naming the mode, the host-only mode tabs, the panel body, and the ornate footer.")
+import type { CSSProperties } from "react";
+import type { PartyRoster } from "@/ui/hooks/usePartyRoster";
+import { LobbySeparator } from "./LobbyButton";
+import { LobbyAsset } from "./lobbyAssets";
+import { LobbyPanel, useLobbyViewState } from "./LobbyPanel";
+import { lobbyRole, lobbyTitle } from "./lobbyMode";
+import { LobbyModeTabsRow } from "./LobbyModeTabs";
+import { HudFont } from "../hudFonts";
+import { LobbyLayout, LobbyPalette, LobbyPanelColumn } from "./lobbyTheme";
+
+const Frame: CSSProperties = {
+  width: LobbyLayout.ColumnWidth, display: "flex", flexDirection: "column", alignItems: "center",
+};
+// Both textures are exported at half size and drawn at 2x: `pixelated` doubles the art cleanly,
+// and the source is what the designer authored.
+const TitleBar: CSSProperties = {
+  position: "relative", width: LobbyLayout.ColumnWidth, height: LobbyLayout.TitleBarHeight,
+  backgroundImage: `url(${LobbyAsset.windowTop})`, backgroundSize: "100% 100%",
+  imageRendering: "pixelated", display: "flex", alignItems: "center", justifyContent: "center",
+};
+const TitleText: CSSProperties = {
+  fontFamily: HudFont.pixel, fontSize: LobbyLayout.TitleFontSizeBig,
+  color: LobbyPalette.text, lineHeight: 1, whiteSpace: "nowrap",
+};
+const Footer: CSSProperties = {
+  width: LobbyLayout.ColumnWidth, height: LobbyLayout.FooterHeight,
+  backgroundImage: `url(${LobbyAsset.windowBottom})`, backgroundSize: "100% 100%",
+  imageRendering: "pixelated",
+};
+// The tabs + their rule sit in the SAME column as the panel below (one declaration in lobbyTheme, so
+// the window's side borders cannot seam where the two meet), less the bottom padding — the panel
+// directly under it supplies that gutter.
+const Header: CSSProperties = { ...LobbyPanelColumn, paddingBottom: 0 };
+
+/**
+ * The lobby as the design draws it. The header IS the control surface: the title names the mode and
+ * the three tabs set it — creating, re-labelling or leaving depending on where the lobby is now.
+ *
+ * A guest gets neither tabs nor rule: the mode is not theirs to change, and the title alone already
+ * tells them which kind of room they joined.
+ */
+export function LobbyWindow({ party }: { party: PartyRoster }) {
+  const state = useLobbyViewState();
+  const role = lobbyRole(state);
+  return (
+    <div style={Frame}>
+      <div style={TitleBar}><span style={TitleText}>{lobbyTitle(state.mode)}</span></div>
+      {role !== "guest" && (
+        <div style={Header}>
+          <LobbyModeTabsRow mode={state.mode} isHost={role === "host"} />
+          <LobbySeparator />
+        </div>
+      )}
+      <LobbyPanel party={party} state={state} />
+      <div style={Footer} />
+    </div>
+  );
+}
diff --git a/src/ui/components/HUD/lobby/index.ts b/src/ui/components/HUD/lobby/index.ts
new file mode 100644
index 00000000..85af41ea
--- /dev/null
+++ b/src/ui/components/HUD/lobby/index.ts
@@ -0,0 +1,7 @@
+// Public interface of the lobby deep module (Figma "Lobby Window" — nodes 1411:2053 public,
+// 1413:3056 private, 1411:1927 offline, 1413:3678 / 1413:3836 guest).
+//
+// Only this file may be imported from outside `lobby/`; `HUD.tsx` is the sole consumer. The window
+// used to be a tab of the inventory menu, which is why its files lived under `inventory/views/`
+// until the mode header made it a window of its own.
+export { LobbyPopover } from "./LobbyPopover";
diff --git a/src/ui/components/HUD/lobby/lobby.group.md b/src/ui/components/HUD/lobby/lobby.group.md
new file mode 100644
index 00000000..6b2096f5
--- /dev/null
+++ b/src/ui/components/HUD/lobby/lobby.group.md
@@ -0,0 +1,14 @@
+---
+id: "feat-lobby"
+label: "Lobby"
+color: "#c94f7c"
+icon: "users"
+facades: ["index.ts"]
+---
+The lobby window: room code, member roster, and the public/private/offline mode header.
+
+Opened by the HUD's lobby button as a floating window (`LobbyPopover`). The mode tabs are the whole
+control surface — picking a mode while offline creates a lobby, picking the other one while hosting
+re-labels it, picking offline leaves — and they are hidden entirely from guests. Everything here
+talks to the network only through `ui_*` bus commands answered by `app/hooks/lobbyCommands.ts`;
+nothing in this folder imports `src/network`.
diff --git a/src/ui/components/HUD/lobby/lobbyAssets.ts b/src/ui/components/HUD/lobby/lobbyAssets.ts
new file mode 100644
index 00000000..ce1e7a72
--- /dev/null
+++ b/src/ui/components/HUD/lobby/lobbyAssets.ts
@@ -0,0 +1,49 @@
+/** Public URLs for the lobby chrome sprites exported from Figma (node 1413:3678 "Lobby Window" and
+ *  the three mode frames 1411:2053 / 1413:3056 / 1411:1927), served by Vite from
+ *  `public/assets/ui/lobby/`. All pixel-art → `image-rendering: pixelated`.
+ *  Class icons are NOT here (they come from the catalog via `useClassIconMap`); only the grey
+ *  "unknown class" shield is. Same shape as the inventory's `support/assets.ts`, kept separate
+ *  because the lobby is its own window now. */
+const LobbyAssetFolder = "/assets/ui/lobby";
+
+export const LobbyAsset = {
+  /** 125×15, drawn at 250×30 — the crimson title-bar banner behind the window title. */
+  windowTop:          `${LobbyAssetFolder}/window-top.png`,
+  /** 125×20, drawn at 250×40 — the ornate window footer. */
+  windowBottom:       `${LobbyAssetFolder}/window-bottom.png`,
+  /** 5×30 green mode-tab end cap; mirrored horizontally for the right end. */
+  tabCapIdle:         `${LobbyAssetFolder}/tab-cap-idle.png`,
+  /** 5×30 green mode-tab body, tiled horizontally at its native width. */
+  tabFillIdle:        `${LobbyAssetFolder}/tab-fill-idle.png`,
+  /** 5×30 gold end cap + 3×30 gold body — the tab of the mode the lobby is actually in. */
+  tabCapActive:       `${LobbyAssetFolder}/tab-cap-active.png`,
+  tabFillActive:      `${LobbyAssetFolder}/tab-fill-active.png`,
+  /** 30×30 mode glyphs. The `-active` twin is the SAME silhouette drawn dark: the active plate is
+   *  light gold, and the idle glyph would read as a smudge on it. */
+  tabIconPublic:        `${LobbyAssetFolder}/tab-icon-public.png`,
+  tabIconPublicActive:  `${LobbyAssetFolder}/tab-icon-public-active.png`,
+  tabIconPrivate:       `${LobbyAssetFolder}/tab-icon-private.png`,
+  tabIconPrivateActive: `${LobbyAssetFolder}/tab-icon-private-active.png`,
+  tabIconOffline:       `${LobbyAssetFolder}/tab-icon-offline.png`,
+  tabIconOfflineActive: `${LobbyAssetFolder}/tab-icon-offline-active.png`,
+  /** 214×34 member-row plate. The belt ornament and the dark class-icon well are baked in. */
+  rowIdle:            `${LobbyAssetFolder}/row-idle.png`,
+  /** 214×34 plate for the local player's row (green). */
+  rowLocal:           `${LobbyAssetFolder}/row-local.png`,
+  /** 16×9, drawn at 32×18 — the host marker. */
+  crown:              `${LobbyAssetFolder}/crown.png`,
+  /** 28×28 grey shield, shown when the class is unknown (a member the party has not accepted yet). */
+  classUnknown:       `${LobbyAssetFolder}/class-unknown.png`,
+  /** 5×30 brown icon-button end cap; mirrored horizontally for the right end. */
+  iconButtonCap:      `${LobbyAssetFolder}/btn-cap.png`,
+  /** 6×60 brown icon-button body, tiled horizontally at half size (3×30). */
+  iconButtonFill:     `${LobbyAssetFolder}/btn-fill.png`,
+  /** 5×30 orange Leave-button caps — left and right are distinct exports, not one mirrored. */
+  leaveCapLeft:       `${LobbyAssetFolder}/leave-cap-left.png`,
+  leaveCapRight:      `${LobbyAssetFolder}/leave-cap-right.png`,
+  /** 3×30 orange Leave-button body, tiled horizontally. */
+  leaveFill:          `${LobbyAssetFolder}/leave-fill.png`,
+  /** 30×30 glyphs that sit on top of a 30×30 icon button. */
+  iconEye:            `${LobbyAssetFolder}/icon-eye.png`,
+  iconClipboard:      `${LobbyAssetFolder}/icon-clipboard.png`,
+} as const;
diff --git a/src/ui/components/HUD/lobby/lobbyMemberRows.ts b/src/ui/components/HUD/lobby/lobbyMemberRows.ts
new file mode 100644
index 00000000..d34865f5
--- /dev/null
+++ b/src/ui/components/HUD/lobby/lobbyMemberRows.ts
@@ -0,0 +1,84 @@
+// @Architecture(descriptionShort="Joins the EOS lobby roster (puids) against the battle party (names/class) into the lobby tab's member rows, hoists the host to the top, and owns the member-count label.", descriptionLong="DOM-free so the join rule — lobby drives the rows, party only enriches them — the host-first ordering, and the N/max label are all unit-testable without React.")
+import type { PartyRoster, RosterMember } from "@/ui/hooks/usePartyRoster";
+
+class LobbyRowText {
+  static readonly ShortPuidLength  = 6;
+  static readonly UnknownClassName = "—";
+}
+
+/** Mirrors `MAX_LOBBY_MEMBERS` in `src-tauri/src/eos/lobby/create.rs` (host + 3 guests). The mock-up's
+ *  `5/6` was placeholder data — 6 is the dev-only fake-party slot count (`PlayerSlots.MaxPartySize`),
+ *  which would overstate how many players can actually join. */
+export class LobbyCapacity {
+  static readonly MaxMembers = 4;
+}
+
+/** `N/max` for the MEMBERS header. Not clamped: a dev fake party can exceed the cap, and reading
+ *  `5/4` is the honest signal that the roster on screen is not a joinable EOS lobby. */
+export function memberCountLabel(memberCount: number): string {
+  return `${memberCount}/${LobbyCapacity.MaxMembers}`;
+}
+
+export interface LobbyMemberRow {
+  puid:      string;
+  name:      string;
+  className: string;
+  isHost:    boolean;
+  isLocal:   boolean;
+  /** In the lobby, but not (yet) in the battle party — only the id is known. */
+  isPending: boolean;
+}
+
+export interface LobbyMemberRowsInput {
+  members:   ReadonlyArray<string>;
+  party:     PartyRoster;
+  hostPuid:  string | null;
+  localPuid: string | null;
+}
+
+// Lobby membership is keyed by EOS PUID (long opaque ids); shorten one so a row stays readable.
+export function shortPuid(puid: string): string {
+  const max = LobbyRowText.ShortPuidLength;
+  return puid.length > max ? `${puid.slice(0, max)}…` : puid;
+}
+
+function pendingRow(puid: string): Pick<LobbyMemberRow, "name" | "className" | "isPending"> {
+  return { name: shortPuid(puid), className: LobbyRowText.UnknownClassName, isPending: true };
+}
+
+function knownRow(member: RosterMember): Pick<LobbyMemberRow, "name" | "className" | "isPending"> {
+  return { name: member.name, className: member.className, isPending: false };
+}
+
+/**
+ * EOS returns members in arbitrary order, but the design crowns the top row and rules a separator
+ * beneath it — which only reads as "owner above, guests below" if the owner is actually there.
+ * A stable partition rather than a sort: exactly one row moves, so an unrelated join or leave never
+ * appears to reshuffle the guests.
+ */
+function hostFirst(rows: LobbyMemberRow[]): LobbyMemberRow[] {
+  const hostIndex = rows.findIndex(row => row.isHost);
+  if (hostIndex <= 0) return rows;
+  return [rows[hostIndex], ...rows.slice(0, hostIndex), ...rows.slice(hostIndex + 1)];
+}
+
+/**
+ * One row per LOBBY member, never per party member: EOS admits a player immediately, but
+ * `RoomSchema.players` only gains them once the join handshake is accepted. Driving off the party
+ * would make the list disagree with its own "MEMBERS N/max" count and hide a joining friend for a
+ * few seconds, so an unmatched member becomes a placeholder row instead.
+ *
+ * `className` is the only enrichment: a row draws a class icon and a name, nothing the party's
+ * level/hp could fill (the HUD party bars carry those).
+ */
+export function buildLobbyMemberRows({ members, party, hostPuid, localPuid }: LobbyMemberRowsInput): LobbyMemberRow[] {
+  return hostFirst(members.map(puid => {
+    const member = party.get(puid);
+    return {
+      puid,
+      isHost:  hostPuid !== null && puid === hostPuid,
+      isLocal: localPuid !== null && puid === localPuid,
+      ...(member ? knownRow(member) : pendingRow(puid)),
+    };
+  }));
+}
diff --git a/src/ui/components/HUD/lobby/lobbyMode.ts b/src/ui/components/HUD/lobby/lobbyMode.ts
new file mode 100644
index 00000000..b3b70090
--- /dev/null
+++ b/src/ui/components/HUD/lobby/lobbyMode.ts
@@ -0,0 +1,111 @@
+// @Architecture(descriptionShort="Pure model of the lobby window's mode header: the window title per mode, and the three-tab table (order, glyphs, idle chrome) the tab row renders.")
+import type { LobbyMode } from "@/bus/bus";
+import { LobbyAsset } from "./lobbyAssets";
+import { LobbyLayout } from "./lobbyTheme";
+
+/** What the title bar reads in each mode. `offline` names the *state*, not a lobby, because there
+ *  is no lobby to name — the other two title the room the player is actually in. */
+const LobbyTitles: Record<LobbyMode, string> = {
+  public:  "PUBLIC LOBBY",
+  private: "PRIVATE LOBBY",
+  offline: "LOBBY (OFFLINE)",
+};
+
+export function lobbyTitle(mode: LobbyMode): string {
+  return LobbyTitles[mode];
+}
+
+export interface LobbyModeTab {
+  mode:       LobbyMode;
+  /** Glyph while this tab is NOT the current mode. */
+  icon:       string;
+  /** Glyph while it IS: the same silhouette drawn dark, because the active plate is light gold. */
+  activeIcon: string;
+  /** Idle plate. The two lobby modes share a green plate; `offline` wears the neutral brown one,
+   *  so "leave" never reads as a third thing you could be. */
+  capIdle:    string;
+  fillIdle:   string;
+  /** Native slice width of `fillIdle`. Tiling a body at anything but its own width smears the
+   *  bevel baked into it, and the green plate's slice is wider than the brown one's. */
+  fillIdleWidth: number;
+  /** What the tab does, for the hover title — an icon never explains itself. */
+  tooltip:    string;
+}
+
+/**
+ * The three tabs in design order (Figma 1411:2053 / 1413:3056 / 1411:1927).
+ *
+ * This IS the lobby's whole control surface: picking a mode while offline creates a lobby, picking
+ * the other one while hosting re-labels it, and picking `offline` leaves. The view emits the mode
+ * and nothing else; `app/hooks/lobbyCommands.ts` decides which of the three that means.
+ */
+export const LobbyModeTabs: readonly LobbyModeTab[] = [
+  {
+    mode: "public", icon: LobbyAsset.tabIconPublic, activeIcon: LobbyAsset.tabIconPublicActive,
+    capIdle: LobbyAsset.tabCapIdle, fillIdle: LobbyAsset.tabFillIdle,
+    fillIdleWidth: LobbyLayout.TabFillIdleWidth,
+    tooltip: "Public lobby",
+  },
+  {
+    mode: "private", icon: LobbyAsset.tabIconPrivate, activeIcon: LobbyAsset.tabIconPrivateActive,
+    capIdle: LobbyAsset.tabCapIdle, fillIdle: LobbyAsset.tabFillIdle,
+    fillIdleWidth: LobbyLayout.TabFillIdleWidth,
+    tooltip: "Private lobby",
+  },
+  {
+    mode: "offline", icon: LobbyAsset.tabIconOffline, activeIcon: LobbyAsset.tabIconOfflineActive,
+    capIdle: LobbyAsset.iconButtonCap, fillIdle: LobbyAsset.iconButtonFill,
+    fillIdleWidth: LobbyLayout.ButtonFillWidth,
+    tooltip: "Leave the lobby and play alone",
+  },
+] as const;
+
+export interface LobbyTabSprites {
+  cap:       string;
+  fill:      string;
+  fillWidth: number;
+  glyph:     string;
+}
+
+/** Everything that changes when a tab becomes the current mode, resolved in ONE place. The active
+ *  look is one concept — gold plate, gold body, dark glyph — and picking each of those separately at
+ *  the render site is how they drift apart. */
+export function tabSprites(tab: LobbyModeTab, isActive: boolean): LobbyTabSprites {
+  if (!isActive) {
+    return { cap: tab.capIdle, fill: tab.fillIdle, fillWidth: tab.fillIdleWidth, glyph: tab.icon };
+  }
+  return {
+    cap: LobbyAsset.tabCapActive, fill: LobbyAsset.tabFillActive,
+    fillWidth: LobbyLayout.ButtonFillWidth, glyph: tab.activeIcon,
+  };
+}
+
+/** Whether the local player owns the lobby, and may therefore re-label it. Derived from the two
+ *  PUIDs the lobby snapshot already carries rather than a flag of its own: `EosLobbyBridge` will
+ *  not answer "am I the host", and two nulls must never compare equal into a false yes. */
+export function isLobbyHost(hostPuid: string | null, localPuid: string | null): boolean {
+  return hostPuid !== null && hostPuid === localPuid;
+}
+
+/** The three fields of the lobby snapshot the local player's role is derived from. */
+export interface LobbyRoleInput {
+  mode:      LobbyMode;
+  hostPuid:  string | null;
+  localPuid: string | null;
+}
+
+/**
+ * What the local player is in this lobby, and therefore which controls the window draws: a `host`
+ * gets the mode tabs and the crown, a `guest` gets a Leave button and no tabs at all, and `offline`
+ * gets the join row.
+ *
+ * One derivation rather than a pair of booleans threaded through props: the render matrix is spread
+ * over three components, and two independently-passed flags let a caller hand a guest both the tabs
+ * and no Leave button. It is NOT put on the bus — `EosLobbyBridge` deliberately refuses to answer
+ * "am I the host", and a derived role there would be a second source of truth for what these two
+ * PUIDs already determine.
+ */
+export function lobbyRole({ mode, hostPuid, localPuid }: LobbyRoleInput): "host" | "guest" | "offline" {
+  if (mode === "offline") return "offline";
+  return isLobbyHost(hostPuid, localPuid) ? "host" : "guest";
+}
diff --git a/src/ui/components/HUD/lobby/lobbyTheme.ts b/src/ui/components/HUD/lobby/lobbyTheme.ts
new file mode 100644
index 00000000..0ff7a650
--- /dev/null
+++ b/src/ui/components/HUD/lobby/lobbyTheme.ts
@@ -0,0 +1,95 @@
+// @Architecture(descriptionShort="Lobby-window-only palette, geometry and the shared heading + panel-column styles, ported 1:1 from the Figma Lobby Window (node 1413:3678).", descriptionLong="Kept out of the inventory's InvTheme because none of these COLOURS appear elsewhere and the lobby is its own window now, so its palette drifts alone. The font families are not part of that: they come from HUD/hudFonts, since every HUD window draws with the same faces.")
+import type { CSSProperties } from "react";
+import { HudFont } from "../hudFonts";
+
+/** Figma variables from the Lobby Window frame (`Wireframe Colors/*`, `Text Feedback/Success`).
+ *  No scrollbar colours: the list wears the shared `.hud-scroll` bar, narrowed by `hudScrollWidth`. */
+export const LobbyPalette = {
+  text:         "#e8c878",   // Wireframe Colors/Text and Button
+  code:         "#2bff75",   // Text Feedback/Success — the room code reads green
+  panelBg:      "#2c1d26",   // Content panel behind the whole lobby
+  panelEdge:    "#633a4c",   // 4px left/right window borders
+  separator:    "#5c3a1d",   // 3px rule under the host row
+  inputBg:      "#170d06",   // the join-code field's well
+  error:        "#e06f6f",   // the one red line under the window
+} as const;
+
+/**
+ * A fixed-width column CENTERED in the tab area, not stretched across it: the design is 250px wide
+ * against a 964px tab area, and it pre-fits the narrower frame the lobby will move into later.
+ *
+ * The arithmetic is load-bearing and closes exactly: `ColumnWidth` − 2×`PanelBorder` −
+ * 2×`PanelPaddingX` = `ContentWidth` = `RowWidth` + `ScrollbarWidth`. The row sprite must be drawn
+ * at its native 214px or the belt baked into it blurs, hence the pinned 4px scrollbar.
+ */
+export class LobbyLayout {
+  static readonly ColumnWidth     = 250;
+  static readonly PanelBorder     = 4;
+  static readonly PanelPaddingX   = 12;
+  static readonly PanelPaddingY   = 8;
+  static readonly SectionGap      = 8;
+  /** Between a heading and the content directly under it — tighter than the gap between sections. */
+  static readonly LabelGap        = 6;
+  static readonly SeparatorHeight = 3;
+
+  static readonly RowWidth        = 214;
+  static readonly RowHeight       = 34;
+  static readonly RowGap          = 6;
+  static readonly VisibleRows     = 6;
+  static readonly ListMaxHeight   = LobbyLayout.VisibleRows * (LobbyLayout.RowHeight + LobbyLayout.RowGap);
+  static readonly ScrollbarWidth  = 4;
+  static readonly ContentWidth    = LobbyLayout.RowWidth + LobbyLayout.ScrollbarWidth;
+
+  /** Class icon: 28×28 dropped into the well the row sprite paints at x=19, y=3. */
+  static readonly ClassIconSize   = 28;
+  static readonly ClassIconLeft   = 19;
+  static readonly ClassIconTop    = 3;
+  /** The name group starts past the well, at the sprite's plate edge. */
+  static readonly NameGroupLeft   = 56;
+  static readonly NameGroupGap    = 8;
+  static readonly CrownWidth      = 32;
+  static readonly CrownHeight     = 18;
+
+  static readonly ButtonHeight    = 30;
+  static readonly ButtonCapWidth  = 5;
+  static readonly ButtonFillWidth = 3;
+  static readonly IconButtonSize  = 30;
+  static readonly IconGap         = 8;
+
+  /** Window chrome. The two textures are drawn at 2× their exported size — the art is authored at
+   *  half resolution and `pixelated` doubles it without blurring. */
+  static readonly TitleBarHeight  = 30;
+  static readonly FooterHeight    = 40;
+  static readonly TitleFontSizeBig = 22;
+  /** Mode tabs: three equal-width plates, and the crown that pokes 7px above the active one. */
+  static readonly TabGap          = 8;
+  static readonly TabIconSize     = 30;
+  /** The green mode plate's body slice is 5px wide, unlike the brown 3px one. */
+  static readonly TabFillIdleWidth = 5;
+  static readonly CrownTabWidth   = 16;
+  static readonly CrownTabHeight  = 9;
+  static readonly CrownTabTop     = -7;
+
+  /** Jersey 25 for headings and the code, Inter for member names — straight from the design. */
+  static readonly TitleFontSize   = 17;
+  static readonly NameFontSize    = 14;
+}
+
+/** The one uppercase-heading style the section labels, the MEMBERS header and the button plate's
+ *  label share, so the three cannot drift apart. */
+export const LobbyHeadingStyle: CSSProperties = {
+  fontFamily: HudFont.pixel, fontSize: LobbyLayout.TitleFontSize,
+  color: LobbyPalette.text, textTransform: "uppercase", lineHeight: 1,
+};
+
+/** The window's body column: its background and its two 4px side borders. Shared by the panel and by
+ *  the mode header stacked directly above it — the header only overrides its bottom padding — so the
+ *  window's left/right edges are painted from ONE declaration and cannot seam where the two meet. */
+export const LobbyPanelColumn: CSSProperties = {
+  width: LobbyLayout.ColumnWidth, boxSizing: "border-box",
+  display: "flex", flexDirection: "column", gap: LobbyLayout.SectionGap,
+  background: LobbyPalette.panelBg,
+  borderLeft:  `${LobbyLayout.PanelBorder}px solid ${LobbyPalette.panelEdge}`,
+  borderRight: `${LobbyLayout.PanelBorder}px solid ${LobbyPalette.panelEdge}`,
+  padding: `${LobbyLayout.PanelPaddingY}px ${LobbyLayout.PanelPaddingX}px`,
+};
diff --git a/src/ui/components/HUD/lobby/roomCodeDisplay.ts b/src/ui/components/HUD/lobby/roomCodeDisplay.ts
new file mode 100644
index 00000000..24c5d1c2
--- /dev/null
+++ b/src/ui/components/HUD/lobby/roomCodeDisplay.ts
@@ -0,0 +1,26 @@
+// @Architecture(descriptionShort="Pure cell model for the lobby window's room-code readout: one cell per real character, each flagged masked or not, so revealing the code never reflows the row. Extracted from the panel so the display states are unit-testable without a DOM.")
+
+export class RoomCodeText {
+  // Mirrors the private RoomCode.Length — a display/typing hint only; the bridge still validates.
+  static readonly Length   = 6;
+  static readonly MaskChar = "•";
+  static readonly Empty    = "—";
+}
+
+export interface RoomCodeCell {
+  char:   string;    // the REAL character — it reserves the cell's width even while masked
+  masked: boolean;   // true ⇒ draw MaskChar over the (hidden) character instead of showing it
+}
+
+/**
+ * One cell per rendered character. `char` is always the real glyph because the renderer keeps it in
+ * the layout (hidden) and paints the mask on top: a mask character is narrower than a letter in the
+ * pixel font, so masking the *text* instead would shrink the readout and shove the adjacent buttons
+ * sideways on every toggle. Consequence: the dot count equals the real code's length. That is not a
+ * leak worth avoiding — every room code is `RoomCodeText.Length` characters — and it is what keeps
+ * the row stable.
+ */
+export function roomCodeCells(roomCode: string, revealed: boolean): RoomCodeCell[] {
+  if (roomCode === "") return [{ char: RoomCodeText.Empty, masked: false }];
+  return [...roomCode].map(char => ({ char, masked: !revealed }));
+}
diff --git a/src/ui/components/HUD/lobby/spritePlate.ts b/src/ui/components/HUD/lobby/spritePlate.ts
new file mode 100644
index 00000000..57bcc136
--- /dev/null
+++ b/src/ui/components/HUD/lobby/spritePlate.ts
@@ -0,0 +1,39 @@
+// @Architecture(type=Module, descriptionShort="The lobby's three-slice sprite plate: fixed end caps either side of a tiled body, shared by every button and mode tab so the cap width and tile rule are asserted in one place.")
+import type { CSSProperties } from "react";
+import { LobbyLayout } from "./lobbyTheme";
+
+/** Three-slice, not one stretched sprite: the caps carry the bevelled corners at a fixed 5px and only
+ *  the flat body tiles, so a plate is crisp at any width. Every lobby control is built from this —
+ *  the Leave plate, the icon buttons and the three mode tabs — so the Figma cap width is one fact in
+ *  one file rather than a rule each control re-asserts. */
+export const PlateCap: CSSProperties = {
+  width: LobbyLayout.ButtonCapWidth, height: LobbyLayout.ButtonHeight,
+  flex: "0 0 auto", imageRendering: "pixelated", display: "block",
+};
+
+/** The right-hand cap, for the plates whose two ends are one mirrored export rather than two. */
+export const PlateCapMirrored: CSSProperties = { ...PlateCap, transform: "scaleX(-1)" };
+
+/** The button/tab reset every plate shares: a bare flex row at the plate's height. */
+export const PlateBase: CSSProperties = {
+  display: "flex", alignItems: "center", height: LobbyLayout.ButtonHeight,
+  background: "none", border: "none", padding: 0, cursor: "pointer",
+};
+
+/**
+ * The tiling body between the caps. `fillWidth` is the sprite's NATIVE slice width and must be passed
+ * as such — tiling a body at any other width smears the bevel baked into it, and the mode tabs' green
+ * plate is a 5px slice where the brown button body is 3px.
+ *
+ * `centerContent` is for the plates that draw a label inside the body (the Leave plate); the ones that
+ * lay a glyph over the whole plate instead leave it off.
+ */
+export function plateBodyStyle(fillUrl: string, fillWidth: number, centerContent = false): CSSProperties {
+  return {
+    flex: "1 1 auto", minWidth: 0, height: LobbyLayout.ButtonHeight,
+    ...(centerContent ? { display: "flex", alignItems: "center", justifyContent: "center" } : null),
+    backgroundImage: `url(${fillUrl})`, backgroundRepeat: "repeat-x",
+    backgroundSize: `${fillWidth}px ${LobbyLayout.ButtonHeight}px`,
+    imageRendering: "pixelated",
+  };
+}

after pressing visualize diff, it takes a while to start visualizing, look for a bottleneck. Do not use git.