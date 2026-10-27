# IMPLEMENTATION_PLAN — Interactive World / Social Demo

기준 문서: "MOODEE — Interactive World / Social Demo 구현 수정 명세". 핵심 문법은
`Top view → 이동 → 인터랙션 지점 → 행동 버튼 → 활동 화면 → 복귀`.

## 조사 결과(구현 전)
- 라우팅: `App.tsx`의 `screen` 상태(라우터 없음).
- 이동·충돌: `components/SeatPicker.tsx` + `lib/walkGrid.ts`(사각형 blocker, 격자 A*). 교실 전용이었다.
- 소리: `audio/soundscape.ts`(채널 4개 → master). 새 오디오 엔진은 만들지 않는다.
- 저장: `localStorage`(`moodie:` 접두사). Zustand 없음.
- Café / Library: 배경 + 하단 카드 패널(`PlaceScreen` + `places/panels.tsx`) → 이번에 교체.

## 공통 구조
- `world/WorldScene.tsx` — 탑뷰 장면. 조이스틱·WASD/방향키·바닥 탭 이동, 인터랙션 지점(`Zone`), `E` 키/버튼 행동, NPC(고정·배회), 충돌.
  - 충돌: 플레이어↔벽/가구(`walkGrid`), 플레이어↔NPC·NPC↔NPC(발 위치 기준 반경, 가까워지는 이동만 차단).
  - NPC 상태: 대기(3–8초) → 웨이포인트 선택 → 길찾기 이동 → 도착. 길이 막히면 멈췄다가 다른 곳으로.
  - 공간별 데이터는 `WorldConfig`(배경, 입구, bounds, blockers, waypoints)만 다르다.
- `world/space.module.css` — 어두운 유리 HUD(뒤로·공간 이름·인원), 활동 화면 레이어.
- `lib/companions.ts` — 데모 동행 명단(0–4명, 한 번 설정). 4명이면 Cloudy 포함. 세션마다 Café/Library에 배치.
- `world/FriendsSheet.tsx` — 친구 위치, 초대(모의), 인원수 변경.

## Phase 기록

### Phase 1–3 공통 월드 · 온보딩 · 동행 NPC
- Implemented: `WorldScene`, `CompanionSetupScreen`(캐릭터 선택 전에 한 번), Cloudy(Premium 잠금, NPC로만 등장), 로고 스플래시.
- Files: `world/*`, `lib/companions.ts`, `screens/CompanionSetupScreen.*`, `data/characters.ts`, `screens/CharacterSelectScreen.*`, `components/LoadingSplash.*`, `App.tsx`.
- How to test: 저장소를 비우고 새로고침 → 친구 수 선택 → 캐릭터 선택 → Home. 캐릭터 목록 끝의 Cloudy는 "Premium".
- Remaining: 친구는 Café/Library에만 배치된다(Classroom·Museum·My Room 배치는 다음 단계).

### Phase 4–5 Café
- Implemented: 탑뷰 이동, 카운터 "Make a drink", 재료 6종 → 줄기·거품·액체 높이 상승·색 혼합, "Carry drink", 의자 "Sit here" → 테이블 화면에 방금 만든 음료.
- Files: `screens/CafeScreen.*`, `world/DrinkGlass.*`.
- How to test: Home → Café → 카운터까지 걷기 → E → 재료 2–3개 → Carry drink → 의자까지 걷기 → E.
- Remaining: 테이블 눈높이 전용 그림이 없어 카운터 상판 + 카페 배경을 합성했다. 음료는 코인 없이 무료.

### Phase 6 Classroom HUD
- Implemented: 집중 화면 미니맵·인원수, 접히는 데모 채팅(로컬), 소리 아이콘 4개 + 믹서, 헤더 전체 음소거(이전 음량 복원).
- Files: `components/ClassroomHud.*`, `screens/ClassroomScreen.tsx`.
- How to test: Classroom → 자리 → Next → Start → Chat 열어 입력, 연필 아이콘, 스피커 버튼.
- Remaining: 교실 탑뷰는 기존 `SeatPicker` 그대로(친구는 앉아 있고, 걸어 다니는 NPC는 없음).

### Phase 7–8 Library
- Implemented: 탑뷰 이동, 자리 "Sit and write" → 눈높이 장면 → 책, "Open book" → 왼쪽 페이지에 직접 쓰기, Save(책갈피 연출), 오른쪽 페이지 "My notes"(교실에서 내려놓은 생각 포함), 다시 열기·삭제. 가운데 책장 "My notes".
- Files: `screens/LibraryScreen.*`, `lib/thoughts.ts`.
- How to test: Home → Library → 빛나는 자리 → E → Open book → 입력 → Save → 새로고침 후 My notes.
- Remaining: 책장 넘김 애니메이션은 좌우 슬라이드로 단순화.

### Phase 9 Museum
- Implemented: 탑뷰 전시장 이동, 입구 앞 카메라 지점 "Capture a memory" → Connecting camera… → 데모 영상(휴대폰 카메라로 해커톤 배너를 비추는 화면 녹화) / 사진 5장 / 실제 카메라(버튼을 눌렀을 때만 getUserMedia, 실패 시 데모로) → 찰칵 → STEP 1 Real moment → STEP 2 Memory icon → STEP 3 Memory object(Skip 가능) → 이름·이야기 → 저장 → 전시대에 등장 → 걸어가 "View memory"로 다시 읽기. 기본 전시 2점, 관람객 NPC 2명, 채팅.
- Files: `screens/MuseumScreen.*`, `world/MemoryCamera.*`, `lib/memories.ts`.
- Remaining: 배경 그림의 전시대에는 이미 유물이 있어, 내 기억은 따로 그린 작은 받침 3개(최신 3개)에 놓인다. 변환은 준비된 에셋을 잇는 연출이다(실제 3D 생성 아님).

### Phase 10 My Room
- Implemented: 탑뷰 방 이동, 책상·책장·탁자·협탁 4곳에 물건 놓기/바꾸기/치우기(Museum 기억 오브젝트 + 기본 소품 2개), 옷장(Cloudee·파츠), 문으로 나가기.
- Files: `screens/RoomScreen.*`, `screens/places/panels.tsx`(RoomPanel).
- Remaining: 예전 "방 스타일" 그림 5장은 탑뷰에서는 쓰지 않는다.

### Café 음료 모션 개선(10-01)
- 재료 6종 각자의 액체 텍스처를 컵 마스크에 채워 층으로 쌓는다(높이 0→양, 텍스처 흐름, 표면 하이라이트 살랑임, 출렁임, 거품, 튀는 물방울). 줄기에도 그 재료의 텍스처가 흐른다. 트레이 아이콘은 컵 쪽으로 기울어졌다 돌아오고, 넣은 횟수 배지·재료 이름 표시. 완성하면 컵이 반짝.
- Files: `world/DrinkGlass.*`, `screens/CafeScreen.*`, `scripts/prepare-assets.mjs`.

### 공통 추가
- 문으로 걸어 나가기(`WorldConfig.exit`), 마인크래프트식 채팅(`world/WorldChat`)과 NPC 말풍선.

### 다음 단계(미구현)
- 교실 탑뷰를 `WorldScene`으로 옮겨 배회 NPC·겹침 방지·채팅 적용.
- 친구(동행)를 Classroom·Museum에도 배치.

### Shop 개편(10-01)
- Membership → Shop: 이벤트 배너(가로 일러스트 15장, 들어올 때마다 무작위 시작·중복 가능, 4초 자동 넘김, 끌기·화살표) / 7일 출석 도장판(첫 세션을 끝내면 "받기", 상점에서 받으면 Cloudy 도장이 찍히며 코인) / 그림 카드 진열대(Cloudees·Outfits·This month) / Pro.
- 출석 규칙: Free 10코인(7일째 30), Pro 40코인(7일째 100). 놓친 날 표시·벌칙 없음. 이전 "세션 종료 즉시 하루 코인"은 도장판으로 대체.
- Files: `screens/ShopScreen.*`, `lib/wallet.ts`(stampCount·claimStamp), `config/economy.ts`(STAMP_REWARDS), `screens/ClassroomScreen.tsx`.

### Board Café 미니게임(10-01) — `cafe/game/CLAUDE_CODE_PROMPT_board_cafe.md`
- 위치: 기존 Café 흐름(음료 만들기 → 테이블)이 있으므로 독립 데모 대신 앱에 이어 붙임(React/TS). 로직과 렌더링은 분리.
- 흐름: 테이블 [Stay quietly][Talk][🎲 Play a game] → Game Shelf(Cloud Tiles · Word Relay · Cloud Match=Coming soon) → Luna·Hieu 등장 + 상자 떨어짐 → 뚜껑 열림 → 게임 → 결과 카드 → 테이블.
- 파일
  - `src/boardcafe/rules.ts` 타일·패턴 8종·판정(순수 함수), `npc.ts` NPC 수 선택·대사(EN/KO), `wordPool.ts` 끝말잇기 단어(ko 172 · en 152)
  - `src/boardcafe/CloudTiles.tsx` 협동 게임(12바퀴·구름 3개·드래그/탭·리액션), `WordRelay.tsx` 끝말잇기(90초), `BoardCafe.tsx` 선반→모이기→상자→게임→결과, `boardcafe.module.css`
  - `scripts/test-rules.mts` 패턴 판정 테스트(29개) — `npm run test:rules`
  - `scripts/prepare-assets.mjs` cafe/game → `public/assets/boardcafe/`(타일 시트 6칸 분할 + 4색 틴트 24장)
  - `src/screens/CafeScreen.*` 테이블 버튼·게임 오버레이
- 턴 규칙: "Turn N / 12"는 세 명이 한 번씩 둔 한 바퀴. 구름 3개면 3/3 배너 후 결과, 12바퀴가 끝나면 "Café is closing ☕ We made N clouds together!"(실패 화면 없음).
- 미구현: Cloud Match(잠금 표시만), Word Relay 결과를 앱 기록에 저장하지 않음.
