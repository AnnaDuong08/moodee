# MOODEE 앱 구성 틀 (플로우차트 기반, 2026-09-30)

UI 문구는 영어, 문서는 한국어. 화면 ID는 플로우차트 번호를 그대로 사용한다.

## 1. 영역 구조

| 영역 | 화면 (ID · 화면 이름) | 역할 |
|---|---|---|
| **A 온보딩** (첫 실행) | A0 Welcome → A2 Quick sign-in → A3 Meet your buddy → A4 Make it yours → A5 Name your buddy → A6 Sound on/off → A7 First-place tour | 계정 만들고 내 분신을 만든 뒤 휠 사용법 안내 |
| **B 허브** | **B1 Place wheel (홈)** · B3 Place preview · B2 Records | 갈 공간 고르기. 공간을 미리 보고 듣기. 기록 모음 |
| **C 교실 집중 루프** | C0 One thing to start → C1 Entering classroom → C2 Pick a seat → C3 Set focus time → **C4 Focus together** ⇄ (C5 Sounds · C6 Thought drop · C7 Short break) → C8 Today's spark → C9 One-tap restart | 한 가지 할 일 → 자리 → 시간 → 집중, 끝나면 불꽃 보상과 다음 시작 |
| **R 내 방** | R1 Rest in my room → R2 Decorate | 쉬기, 불꽃으로 받은 아이템으로 방 꾸미기 |
| **L 생각 정리실** (Library) | L1 Thought room | C6에서 내려놓은 생각을 정리 |
| **M 전시실** (Museum) | M1 Pick a moment → M2 Make a memory object → M3 Write the story → M4 Hang it in the gallery | 남기고 싶은 순간을 오브젝트로 전시 |
| **F 사람들 사이** (Café) | F1 Stay among people | 다른 사용자 캐릭터와 함께 집중(실시간 필요) |
| **D 설정** | D1 Past flow · D2 Defaults · D3 Buddy & account | 지난 흐름 보기, 기본값(시간·소리), 캐릭터/계정 |

진입 분기: A0 → 로그인 되어 있으면 B1, 아니면 A2부터.
C9 → B1(다른 공간) 또는 R1(쉬러 가기). R1 → M2(방 아이템을 기억 오브젝트로).

## 2. 현재 구현과의 대응

| 플로우 ID | 현재 상태 |
|---|---|
| A4 | 캐릭터 4명 중 고르기로 구현(꾸미기는 없음) |
| B1 | 장소 휠, "Going to …" 구현 |
| C1 | 휠 한 바퀴 → 교실 진입 연출 구현 |
| C2 | 탑뷰에서 걸어서 자리 고르기 구현 |
| C4 | 눈높이 뷰에 앉은 모습 + 타이머 구현 |
| C5 | "Set the mood" 소리 설정 구현 |
| C3 | 타이머 15/25/50분 칩 구현 |
| C8 | 세션 완료 + 스트릭(불꽃) 일부 구현 |
| 나머지 | 미구현 |

**순서 차이:** 플로우차트는 C2 → C3 → C4이고, C5는 C4 안에서 여는 구조다. 현재는 앉기 → 소리 설정(C5) → 타이머 순서다(이전 요청 기준). 둘 중 어느 순서를 따를지 결정이 필요하다.

## 3. 화면 구조(코드 폴더 제안)

```
src/screens/
  onboarding/  Welcome, SignIn, MeetBuddy, CustomizeBuddy, NameBuddy, SoundPreference, PlaceTour
  hub/         PlaceWheel(홈), PlacePreview, Records
  classroom/   OneThing, SeatPicker, FocusTime, FocusTogether, ThoughtDrop, BreakTime, TodaysSpark
  room/        MyRoom, Decorate
  library/     ThoughtRoom
  museum/      PickMoment, MakeMemory, WriteStory, Gallery
  cafe/        AmongPeople
  settings/    PastFlow, Defaults, BuddyAccount
```

화면 전환은 지금처럼 App의 상태 기계(`screen` 값)로 하고, 영역이 늘어나면 react-router(MIT)로 옮긴다.

## 4. 데이터 모델(초안)

- `profile`: 계정 id, 로그인 방식(게스트/소셜)
- `buddy`: base(4종), 꾸미기 파츠, 이름
- `defaults`: 집중 시간, 소리 on/off 기본값, 소리별 볼륨
- `session`: id, place, seat, oneThing(C0), minutes, startedAt, completed, thoughts[](C6), breaks
- `spark`: 오늘 불꽃, 연속 일수, 누적. 불꽃으로 아이템 교환(R2)
- `roomItems`: 보유/배치 아이템
- `memory`: 연결된 session, 오브젝트 종류, 이야기(M3), 전시 위치(M4)

저장: 지금은 localStorage. 로그인(A2)과 사람들 사이(F1)부터는 서버가 필요하다. 예: Supabase Auth + DB + Realtime presence.

## 5. 단계 제안

1. **P1 (데모 핵심)**: A0, A5, A6, A7(간단), C0, C3→C4 순서 정리, C6, C7, C8, C9, B2
2. **P2**: B3 미리보기(소리 샘플), R1·R2, D1~D3
3. **P3**: M1~M4 전시실, L1 생각 정리실
4. **P4**: A2 로그인, A4 꾸미기 파츠, F1 사람들 사이(실시간)
