<p align="center">
  <img src="docs/brand/hero.png" alt="MOODEE — a cozy world for distracted minds" width="100%" />
</p>

<h1 align="center">MOODEE</h1>

<p align="center">
  <b>A cozy world for distracted minds.</b><br />
  Pick the place that fits your mood, walk in with your Cloudee, and focus, write, remember, or simply be around people.
</p>

<p align="center">
  <a href="https://i0kyung.github.io/moodee/"><b>▶ Try the web demo</b></a>
  &nbsp;·&nbsp; Mobile first (390 × 844) · Works on desktop in a phone frame
</p>

---

## Five places, five moods

| | Place | Mood | What you do there |
|:-:|---|---|---|
| <img src="public/assets/places/icon-classroom.png" width="96" /> | **Classroom** | Focus quietly with others | Walk to a seat, sit down, set the sounds, pick what you are studying, and focus next to other Cloudees. Minimap, light chat, ambient sound icons. |
| <img src="public/assets/places/icon-library.png" width="96" /> | **Library** | Give your thoughts somewhere to stay | Sit at a desk, open the book, and write straight onto the page. Thoughts you set down in the Classroom land here too. |
| <img src="public/assets/places/icon-museum.png" width="96" /> | **Museum** | Turn moments into memories | Capture a moment with the camera, watch it become a memory object, and place it on a pedestal you can walk back to. |
| <img src="public/assets/places/icon-cafe.png" width="96" /> | **Café** | Meet, make something, or simply stay | Make a drink at the counter, carry it to a table, and play a cozy co-op board game with Luna and Hieu. |
| <img src="public/assets/places/icon-my-room.png" width="96" /> | **My Room** | Make this place feel like yours | Place the things you collected on your desk and shelves, and dress your Cloudee from the wardrobe. |

Every place starts from a top view: walk your Cloudee (stick, WASD, or tap the floor), step up to something, and the scene opens into that activity.

## Meet the Cloudees

<p>
  <img src="public/assets/characters/char-bob.png" height="150" alt="Dahyeon" />
  <img src="public/assets/characters/char-ponytail.png" height="150" alt="Minkyung" />
  <img src="public/assets/characters/char-wavy.png" height="150" alt="Nier" />
  <img src="public/assets/characters/char-curly-glasses.png" height="150" alt="Nazwan" />
  <img src="public/assets/characters/cloudy-three-quarter.png" height="110" alt="Cloudy" />
</p>

**Dahyeon · Minkyung · Nier · Nazwan** are free to play. **Cloudy**, the MOODEE cloud, comes with MOODEE PRO — and visits the world as a friend when four friends join you.

## Café: drinks and Board Café

<p>
  <img src="public/assets/cafe/ingredient-coffee.png" width="72" alt="Coffee" />
  <img src="public/assets/cafe/ingredient-milk.png" width="72" alt="Milk" />
  <img src="public/assets/cafe/ingredient-syrup.png" width="72" alt="Syrup" />
  <img src="public/assets/cafe/ingredient-strawberry.png" width="72" alt="Strawberry" />
  <img src="public/assets/cafe/ingredient-orange.png" width="72" alt="Orange" />
  <img src="public/assets/cafe/ingredient-matcha.png" width="72" alt="Matcha" />
</p>

- **Drink maker** — each ingredient pours its own liquid texture into the glass, layer by layer.
- **Cloud Tiles** — a low-pressure co-op tile game: finish three clouds together before the café closes. No losing screen.
- **Word Relay** — last-letter chain in English or Korean (끝말잇기).

<p>
  <img src="public/assets/boardcafe/gamebox-open.png" width="150" alt="Board game box" />
  <img src="public/assets/boardcafe/tile-sky-1.png" width="64" alt="Sky 1" />
  <img src="public/assets/boardcafe/tile-sunset-2.png" width="64" alt="Sunset 2" />
  <img src="public/assets/boardcafe/tile-dream-3.png" width="64" alt="Dream 3" />
  <img src="public/assets/boardcafe/tile-forest-4.png" width="64" alt="Forest 4" />
  <img src="public/assets/boardcafe/banner-completed.png" width="190" alt="Cloud completed" />
</p>

## Shop & attendance

Finish your first session of the day to light up a stamp on the 7-day board, then claim it in the Shop. Coins unlock outfits; MOODEE PRO adds bigger stamps, monthly outfits, and Cloudy. **Focus features are never behind a paywall.** (Demo only — no payment is taken.)

<p>
  <img src="public/assets/splash-wide/autumn.jpg" width="32%" alt="Autumn Days" />
  <img src="public/assets/splash-wide/cafe-barista.jpg" width="32%" alt="Café Night" />
  <img src="public/assets/splash-wide/cherry-blossom.jpg" width="32%" alt="Blossom Season" />
</p>

## Principles

- **Calm, not pressure** — no red warnings, no losing screens, sound starts off.
- **Places change the mood** — you don't open a feature, you walk into a place.
- **Together, quietly** — co-presence first; chat is optional and light.

## Run locally

```bash
npm install
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Start the app |
| `npm run build` | Type-check and build to `dist/` |
| `npm test` | Run calendar and Google sync tests |
| `npm run assets` | Rebuild `public/assets/` from the original artwork (`2026글로벌해커톤/`) |
| `npm run test:rules` | Test the Cloud Tiles pattern rules |

Built with React, TypeScript, Vite, Framer Motion and the Web Audio API. Progress is saved in the browser (localStorage).
The Calendar supports local guest plans and, when configured, a dedicated MOODEE Google Calendar with reminders. Setup for limited testers: [`docs/calendar-google-setup.md`](docs/calendar-google-setup.md). Classroom asks for a one-line goal before entry.
Design notes: [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) · [`docs/ASSET_MAP.md`](docs/ASSET_MAP.md)

<p align="center"><sub>MOODEE · 2026 Global Hackathon</sub></p>
