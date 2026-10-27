# ASSET_MAP

The originals live in folders under `2026글로벌해커톤/`; `npm run assets` (`scripts/prepare-assets.mjs`) processes them into `public/assets/`.
"None" means the repository was checked directly and no such asset exists.

| Purpose | Source file | Served as (`public/assets/`) | Screen | Crop / position | Fallback |
|---|---|---|---|---|---|
| MOODEE logo | `brand/moodee-logo-wordmark.png` | `brand/logo.png` | Splash, Companion setup, Home, Character select | Background removed | Text "MOODEE" |
| Cloud mascot (Cloudy) | `brand/cloudy/cloudy-{front,three-quarter,side,back}.png` (cut-outs) | `characters/char-cloudy.png`, `characters/cloudy-three-quarter.png` | Character select (Premium), world NPC | Front, side and back at a common scale in a 4-frame sheet (front/side/back/opposite side = side flipped). 3/4 view is a separate file | Existing placeholder SVG |
| Cloudy original sheet (old) | `brand/cloudy-mascot-character-sheet.png` | Not used | — | — | — |
| 17 Cloudee illustrations | `splash/portrait/cloudee-*.png` | `splash/*.jpg` | Loading screen (one at random), Companion setup background (`sky`) | 720px wide | Solid background |
| 15 landscape Cloudee illustrations | `splash/landscape/cloudee-*-wide.png` | Not used | — | — | — |
| Café top view | `cafe/cafe-topdown.png` | `places/cafe-topdown.jpg` | Café world | 941×1672 coordinate system. Collision, seat and counter coordinates are in `CafeScreen.tsx` | — |
| Café counter (drink maker) | `cafe/cafe-counter-closeup.png` | `cafe/counter-closeup.jpg` | Drink Maker | Same-ratio stage; cup sits on the wooden coaster at (50%, 69.5%) | — |
| Café table surface | `cafe/cafe-counter-closeup.png` | `cafe/table-top.jpg` | Table view | Cropped from the lower wooden top (120,1000, 640×600); coaster at (54.7%, 27%) | — |
| Café room (table view background) | `cafe/cafe-backview.png` | `places/cafe-backview.jpg` | Table view | cover + light blur | — |
| Transparent cup | `cafe/cafe-glass-transparent-soft.png` | `cafe/glass.png` | Drink Maker, Table view, carried cup | Liquid layers inside the inner trapezoid (13.5–74% → 32–62.5%) | — |
| Transparent cup (high contrast) | `cafe/cafe-glass-transparent-contrast.png` | Not used (spare) | — | — | — |
| Ingredient icons (3D) | `cafe/cafe-ingredient-icons-3d.png` (3×2 sheet, transparent) | `cafe/ingredient-{coffee,milk,syrup,strawberry,orange,matcha}.png` | Drink Maker tray | Finds the 6 blobs by vertical gaps, crops them and centers each in a 240px square. Wooden buttons are CSS | — |
| Liquid textures | `cafe/liquids/liquid-{coffee,milk,syrup,strawberry,orange,matcha}.png` | `cafe/liquid-*.jpg` | Drink Maker · table · carried cup | Scaled to 512px and mirror-tiled (2×2) into a seamless 1024px tile. Flows inside the cup's trapezoid mask with a `--tile` (340px) period. Each ingredient stacks one layer | — |
| Library top view | `library/library-topdown.png` | `places/library-topdown.jpg` | Library world | 941×1672 coordinate system. The 3 people in the picture are background | — |
| Library eye-level scene | `library/library-eyelevel-people.png` | `library/eyelevel.jpg` | Desk view | cover, 1.2→1 zoom when sitting | — |
| Library open book | `library/library-prop-open-book.png` | `library/open-book.png` | Desk view / writing | Transparent textarea on the left page (9.5%, 12.5%, 38.5%×70%), notes list on the right page | — |
| Classroom top view | `classroom/` originals | `places/classroom-topdown.png` | Classroom world, minimap | Minimap shifted up 13% to show only the desk area | — |
| Classroom eye-level | `classroom/` originals | `places/classroom-backview*.png` | Seated / Focus | Chair back split into its own layer | — |
| Museum top view | `museum/museum-topdown-portrait.png` | `places/museum-topdown-portrait.jpg` | Museum world | Scaled down to 941×1672. Collision and display stand coordinates are in `MuseumScreen.tsx` | — |
| Museum photos / objects | `박물관 전시/photo-*.png`, `object-*.png` | `exhibits/*` | Museum camera → exhibit | Object backgrounds removed | — |
| Museum demo video | `박물관 전시/KakaoTalk_20260930_144748802.mp4` | `museum/demo-capture.mp4` | First shot of the Museum camera | Screen recording of a phone camera (zooming in on the hackathon banner). Top and bottom controls cropped so only the viewfinder shows → `hackathon-banner` object | 5 photos |
| My Room top view | `myroom/myroom-topdown.png` | `places/myroom-topdown.jpg` | My Room world | 941×1672 coordinate system. Furniture collision and item slot coordinates are in `RoomScreen.tsx` | — |
| Table-level café image | None | — | Table view | Replaced by compositing the two images above | — |
| Photo → icon intermediate asset | None | — | Museum conversion | Replaced by turning the object image into a white silhouette | — |
