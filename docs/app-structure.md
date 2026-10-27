# MOODEE App Structure (based on the flowchart, 2026-09-30)

UI copy and docs are in English. Screen IDs use the flowchart numbers as-is.

## 1. Area structure

| Area | Screens (ID · screen name) | Role |
|---|---|---|
| **A Onboarding** (first launch) | A0 Welcome → A2 Quick sign-in → A3 Meet your buddy → A4 Make it yours → A5 Name your buddy → A6 Sound on/off → A7 First-place tour | Create an account, make your avatar, then learn how to use the wheel |
| **B Hub** | **B1 Place wheel (home)** · B3 Place preview · B2 Records | Choose a space to go to. Preview how a space looks and sounds. Records collection |
| **C Classroom focus loop** | C0 One thing to start → C1 Entering classroom → C2 Pick a seat → C3 Set focus time → **C4 Focus together** ⇄ (C5 Sounds · C6 Thought drop · C7 Short break) → C8 Today's spark → C9 One-tap restart | One task → seat → time → focus; when done, a spark reward and the next start |
| **R My room** | R1 Rest in my room → R2 Decorate | Rest, decorate the room with items earned with sparks |
| **L Thought room** (Library) | L1 Thought room | Sort through thoughts dropped in C6 |
| **M Gallery** (Museum) | M1 Pick a moment → M2 Make a memory object → M3 Write the story → M4 Hang it in the gallery | Turn moments you want to keep into objects and exhibit them |
| **F Among people** (Café) | F1 Stay among people | Focus together with other users' characters (requires real-time) |
| **D Settings** | D1 Past flow · D2 Defaults · D3 Buddy & account | View past flow, defaults (time, sound), character/account |

Entry branch: A0 → B1 if signed in, otherwise start from A2.
C9 → B1 (another space) or R1 (go rest). R1 → M2 (turn a room item into a memory object).

## 2. Mapping to the current implementation

| Flow ID | Current status |
|---|---|
| A4 | Implemented as choosing from 4 characters (no customization) |
| B1 | Place wheel and "Going to …" implemented |
| C1 | One wheel spin → classroom entry animation implemented |
| C2 | Picking a seat by walking in the top view implemented |
| C4 | Seated figure in eye-level view + timer implemented |
| C5 | "Set the mood" sound settings implemented |
| C3 | Timer 15/25/50 min chips implemented |
| C8 | Session complete + streak (spark) partly implemented |
| Others | Not implemented |

**Order difference:** the flowchart goes C2 → C3 → C4, with C5 opened from inside C4. Currently the order is sit → sound settings (C5) → timer (per an earlier request). A decision is needed on which order to follow.

## 3. Screen structure (proposed code folders)

```
src/screens/
  onboarding/  Welcome, SignIn, MeetBuddy, CustomizeBuddy, NameBuddy, SoundPreference, PlaceTour
  hub/         PlaceWheel(home), PlacePreview, Records
  classroom/   OneThing, SeatPicker, FocusTime, FocusTogether, ThoughtDrop, BreakTime, TodaysSpark
  room/        MyRoom, Decorate
  library/     ThoughtRoom
  museum/      PickMoment, MakeMemory, WriteStory, Gallery
  cafe/        AmongPeople
  settings/    PastFlow, Defaults, BuddyAccount
```

Screen transitions stay on App's state machine (the `screen` value) as now; once there are more areas, move to react-router (MIT).

## 4. Data model (draft)

- `profile`: account id, sign-in method (guest/social)
- `buddy`: base (4 kinds), customization parts, name
- `defaults`: focus time, default sound on/off, per-sound volume
- `session`: id, place, seat, oneThing (C0), minutes, startedAt, completed, thoughts[] (C6), breaks
- `spark`: today's sparks, streak days, total. Sparks are exchanged for items (R2)
- `roomItems`: owned/placed items
- `memory`: linked session, object type, story (M3), gallery position (M4)

Storage: localStorage for now. Sign-in (A2) and Among people (F1) onward require a server, e.g. Supabase Auth + DB + Realtime presence.

## 5. Proposed phases

1. **P1 (demo core)**: A0, A5, A6, A7 (simple), C0, settle the C3→C4 order, C6, C7, C8, C9, B2
2. **P2**: B3 preview (sound samples), R1·R2, D1–D3
3. **P3**: M1–M4 gallery, L1 thought room
4. **P4**: A2 sign-in, A4 customization parts, F1 Among people (real-time)
