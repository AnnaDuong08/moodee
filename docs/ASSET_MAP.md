# ASSET_MAP

원본은 `2026글로벌해커톤/` 아래 폴더에 있고, `npm run assets`(`scripts/prepare-assets.mjs`)가 `public/assets/`로 가공한다.
"없음"은 저장소를 직접 확인한 결과다.

| Purpose | Source file | Served as (`public/assets/`) | Screen | Crop / position | Fallback |
|---|---|---|---|---|---|
| MOODEE logo | `brand/moodee-logo-wordmark.png` | `brand/logo.png` | Splash, Companion setup, Home, Character select | 배경 제거 | 텍스트 "MOODEE" |
| Cloud mascot (Cloudy) | `brand/cloudy/cloudy-{front,three-quarter,side,back}.png`(누끼) | `characters/char-cloudy.png`, `characters/cloudy-three-quarter.png` | Character select(Premium), 월드 NPC | 앞·옆·뒤를 공통 배율로 4컷 시트(앞/옆/뒤/반대 옆=옆 뒤집기)로. 3/4는 별도 파일 | 기존 플레이스홀더 SVG |
| Cloudy 원본 시트(예전) | `brand/cloudy-mascot-character-sheet.png` | 사용 안 함 | — | — | — |
| Cloudee 일러스트 17장 | `splash/portrait/cloudee-*.png` | `splash/*.jpg` | 로딩 화면(무작위 1장), Companion setup 배경(`sky`) | 720px 폭 | 단색 배경 |
| Cloudee 가로 일러스트 15장 | `splash/landscape/cloudee-*-wide.png` | 사용 안 함 | — | — | — |
| Café top view | `cafe/cafe-topdown.png` | `places/cafe-topdown.jpg` | Café 월드 | 941×1672 좌표계. 충돌·좌석·카운터 좌표는 `CafeScreen.tsx` | — |
| Café counter (drink maker) | `cafe/cafe-counter-closeup.png` | `cafe/counter-closeup.jpg` | Drink Maker | 같은 비율 무대, 나무 받침 (50%, 69.5%) 위에 컵 | — |
| Café table surface | `cafe/cafe-counter-closeup.png` | `cafe/table-top.jpg` | Table view | 아래쪽 나무 상판(120,1000,640×600) 잘라 사용, 받침 (54.7%, 27%) | — |
| Café room (table view 배경) | `cafe/cafe-backview.png` | `places/cafe-backview.jpg` | Table view | cover + 약한 블러 | — |
| Transparent cup | `cafe/cafe-glass-transparent-soft.png` | `cafe/glass.png` | Drink Maker, Table view, 들고 다니는 컵 | 안쪽 사다리꼴(13.5–74% → 32–62.5%)에 액체 레이어 | — |
| Transparent cup (고대비) | `cafe/cafe-glass-transparent-contrast.png` | 사용 안 함(예비) | — | — | — |
| Ingredient icons (3D) | `cafe/cafe-ingredient-icons-3d.png`(3×2 시트, 투명) | `cafe/ingredient-{coffee,milk,syrup,strawberry,orange,matcha}.png` | Drink Maker 트레이 | 세로 틈으로 덩어리 6개를 찾아 잘라 240px 정사각형에 가운데 정렬. 나무 버튼은 CSS | — |
| Liquid textures | `cafe/liquids/liquid-{coffee,milk,syrup,strawberry,orange,matcha}.png` | `cafe/liquid-*.jpg` | Drink Maker · 테이블 · 들고 다니는 컵 | 512px로 줄여 거울 반복(2×2)한 1024px 이음매 없는 타일. 컵 안쪽 사다리꼴 마스크 안에서 `--tile`(340px) 주기로 흐름. 재료마다 한 층씩 쌓임 | — |
| Library top view | `library/library-topdown.png` | `places/library-topdown.jpg` | Library 월드 | 941×1672 좌표계. 그림 속 사람 3명은 배경 | — |
| Library eye-level scene | `library/library-eyelevel-people.png` | `library/eyelevel.jpg` | Desk view | cover, 앉을 때 1.2→1 줌 | — |
| Library open book | `library/library-prop-open-book.png` | `library/open-book.png` | Desk view / 글쓰기 | 왼쪽 페이지(9.5%, 12.5%, 38.5%×70%)에 투명 textarea, 오른쪽 페이지에 노트 목록 | — |
| Classroom top view | `classroom/` 원본 | `places/classroom-topdown.png` | Classroom 월드, 미니맵 | 미니맵은 위로 13% 올려 책상 구역만 | — |
| Classroom eye-level | `classroom/` 원본 | `places/classroom-backview*.png` | Seated / Focus | 의자 등받이 레이어 분리 | — |
| Museum top view | `museum/museum-topdown-portrait.png` | `places/museum-topdown-portrait.jpg` | Museum 월드 | 941×1672로 축소. 충돌·전시대 좌표는 `MuseumScreen.tsx` | — |
| Museum photos / objects | `박물관 전시/photo-*.png`, `object-*.png` | `exhibits/*` | Museum 카메라 → 전시 | 오브젝트 배경 제거 | — |
| Museum demo video | `박물관 전시/KakaoTalk_20260930_144748802.mp4` | `museum/demo-capture.mp4` | Museum 카메라 첫 장면 | 휴대폰 카메라 화면 녹화(해커톤 배너로 줌인). 위·아래 조작부를 잘라 뷰파인더만 표시 → `hackathon-banner` 오브젝트 | 사진 5장 |
| My Room top view | `myroom/myroom-topdown.png` | `places/myroom-topdown.jpg` | My Room 월드 | 941×1672 좌표계. 가구 충돌·물건 자리 좌표는 `RoomScreen.tsx` | — |
| Table-level café 이미지 | 없음 | — | Table view | 위 두 이미지를 합성해 대체 | — |
| 사진→아이콘 중간 에셋 | 없음 | — | Museum 변환 | 오브젝트 이미지를 흰 실루엣으로 바꿔 대체 | — |
