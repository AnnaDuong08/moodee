# IMPLEMENTATION_PLAN — Interactive World / Social Demo

Reference document: "MOODEE — Interactive World / Social Demo implementation revision spec". The core grammar is
`Top view → move → interaction point → action button → activity screen → return`.

## Findings (before implementation)
- Routing: `screen` state in `App.tsx` (no router).
- Movement & collision: `components/SeatPicker.tsx` + `lib/walkGrid.ts` (rectangle blockers, grid A*). Was classroom-only.
- Sound: `audio/soundscape.ts` (4 channels → master). No new audio engine will be built.
- Storage: `localStorage` (`moodie:` prefix). No Zustand.
- Café / Library: background + bottom card panel (`PlaceScreen` + `places/panels.tsx`) → replaced in this round.

## Shared structure
- `world/WorldScene.tsx` — top-view scene. Movement by joystick, WASD/arrow keys or tapping the floor; interaction points (`Zone`); actions via the `E` key/button; NPCs (stationary or wandering); collision.
  - Collision: player↔walls/furniture (`walkGrid`), player↔NPC and NPC↔NPC (radius around foot position; only movement that brings them closer is blocked).
  - NPC states: idle (3–8 s) → pick a waypoint → pathfind and move → arrive. If the path is blocked, pause and then head somewhere else.
  - Per-space data differs only in `WorldConfig` (background, entrance, bounds, blockers, waypoints).
- `world/space.module.css` — dark glass HUD (back, space name, head count), activity screen layer.
- `lib/companions.ts` — demo companion list (0–4 people, set once). With 4, Cloudy is included. Placed in Café/Library each session.
- `world/FriendsSheet.tsx` — friend locations, invite (mock), change head count.

## Phase log

### Phase 1–3 Shared world · onboarding · companion NPCs
- Implemented: `WorldScene`, `CompanionSetupScreen` (once, before character select), Cloudy (Premium-locked, appears only as an NPC), logo splash.
- Files: `world/*`, `lib/companions.ts`, `screens/CompanionSetupScreen.*`, `data/characters.ts`, `screens/CharacterSelectScreen.*`, `components/LoadingSplash.*`, `App.tsx`.
- How to test: clear storage and reload → choose number of friends → character select → Home. Cloudy at the end of the character list shows "Premium".
- Remaining: friends are only placed in Café/Library (Classroom, Museum and My Room placement is the next step).

### Phase 4–5 Café
- Implemented: top-view movement, counter "Make a drink", 6 ingredients → pour stream, foam, rising liquid level, color mixing, "Carry drink", chair "Sit here" → table screen with the drink you just made.
- Files: `screens/CafeScreen.*`, `world/DrinkGlass.*`.
- How to test: Home → Café → walk to the counter → E → 2–3 ingredients → Carry drink → walk to a chair → E.
- Remaining: there is no dedicated table eye-level picture, so the counter top and café background were composited. Drinks are free (no coins).

### Phase 6 Classroom HUD
- Implemented: focus-screen minimap and head count, collapsible demo chat (local), 4 sound icons + mixer, header mute-all (restores previous volume).
- Files: `components/ClassroomHud.*`, `screens/ClassroomScreen.tsx`.
- How to test: Classroom → seat → Next → Start → open Chat and type, pencil icon, speaker button.
- Remaining: the classroom top view is still the existing `SeatPicker` (friends are seated; no walking NPCs).

### Phase 7–8 Library
- Implemented: top-view movement, seat "Sit and write" → eye-level scene → book, "Open book" → write directly on the left page, Save (bookmark animation), right page "My notes" (including thoughts dropped in the classroom), reopen and delete. Center bookshelf "My notes".
- Files: `screens/LibraryScreen.*`, `lib/thoughts.ts`.
- How to test: Home → Library → glowing seat → E → Open book → type → Save → reload, then My notes.
- Remaining: page-turn animation simplified to a left/right slide.

### Phase 9 Museum
- Implemented: top-view gallery movement, camera point by the entrance "Capture a memory" → Connecting camera… → demo video (screen recording of a phone camera pointed at the hackathon banner) / 5 photos / real camera (getUserMedia only when the button is pressed, falls back to the demo on failure) → shutter → STEP 1 Real moment → STEP 2 Memory icon → STEP 3 Memory object (skippable) → name and story → save → appears on a display stand → walk over and "View memory" to read it again. 2 default exhibits, 2 visitor NPCs, chat.
- Files: `screens/MuseumScreen.*`, `world/MemoryCamera.*`, `lib/memories.ts`.
- Remaining: the display stands in the background art already hold artifacts, so your memories go on 3 separately drawn small pedestals (the latest 3). The conversion is a staged sequence of prepared assets (not real 3D generation).

### Phase 10 My Room
- Implemented: top-view room movement, place/swap/remove items at 4 spots — desk, bookshelf, table, nightstand (Museum memory objects + 2 default props), wardrobe (Cloudee and parts), leave through the door.
- Files: `screens/RoomScreen.*`, `screens/places/panels.tsx` (RoomPanel).
- Remaining: the 5 old "room style" pictures are not used in the top view.

### Café drink motion improvements (10-01)
- Each of the 6 ingredients fills the cup mask with its own liquid texture and stacks in layers (height 0→amount, flowing texture, swaying surface highlight, sloshing, foam, splashing droplets). The pour stream also carries that ingredient's texture. Tray icons tilt toward the cup and back, with an add-count badge and ingredient name. The cup sparkles when finished.
- Files: `world/DrinkGlass.*`, `screens/CafeScreen.*`, `scripts/prepare-assets.mjs`.

### Shared additions
- Walking out through the door (`WorldConfig.exit`), Minecraft-style chat (`world/WorldChat`) and NPC speech bubbles.

### Next steps (not implemented)
- Move the classroom top view to `WorldScene` to get wandering NPCs, overlap prevention and chat.
- Place friends (companions) in Classroom and Museum too.

### Shop overhaul (10-01)
- Membership → Shop: event banner (15 landscape illustrations, random start on each visit, repeats allowed, 4 s auto-advance, drag and arrows) / 7-day attendance stamp card (after finishing the first session, "Claim"; claiming in the shop stamps a Cloudy stamp and grants coins) / picture-card shelves (Cloudees · Outfits · This month) / Pro.
- Attendance rules: Free 10 coins (30 on day 7), Pro 40 coins (100 on day 7). No missed-day marks or penalties. The old "daily coins immediately on session end" is replaced by the stamp card.
- Files: `screens/ShopScreen.*`, `lib/wallet.ts` (stampCount · claimStamp), `config/economy.ts` (STAMP_REWARDS), `screens/ClassroomScreen.tsx`.

### Board Café minigame (10-01) — `cafe/game/CLAUDE_CODE_PROMPT_board_cafe.md`
- Placement: since the Café flow already exists (make a drink → table), it is attached to the app (React/TS) rather than built as a standalone demo. Logic and rendering are separated.
- Flow: table [Stay quietly][Talk][🎲 Play a game] → Game Shelf (Cloud Tiles · Word Relay · Cloud Match = Coming soon) → Luna and Hieu arrive + box drops → lid opens → game → result card → table.
- Files
  - `src/boardcafe/rules.ts` tiles, 8 patterns, scoring (pure functions); `npc.ts` NPC move choice and lines (EN/KO); `wordPool.ts` Word Relay words (ko 172 · en 152)
  - `src/boardcafe/CloudTiles.tsx` co-op game (12 rounds, 3 clouds, drag/tap, reactions); `WordRelay.tsx` last-letter chain (90 s); `BoardCafe.tsx` shelf → gather → box → game → result; `boardcafe.module.css`
  - `scripts/test-rules.mts` pattern-scoring tests (29) — `npm run test:rules`
  - `scripts/prepare-assets.mjs` cafe/game → `public/assets/boardcafe/` (tile sheet split into 6 + 24 tints in 4 colors)
  - `src/screens/CafeScreen.*` table buttons and game overlay
- Turn rule: "Turn N / 12" is one round in which all three players move once. With 3 clouds, show the 3/3 banner and then results; after 12 rounds, "Café is closing ☕ We made N clouds together!" (no failure screen).
- Not implemented: Cloud Match (locked display only); Word Relay results are not saved to the app's records.
