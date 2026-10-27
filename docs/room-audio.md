# Room audio

Home plays a lo-fi instrumental loop. Café plays conversation and coffee-shop
sounds. Library combines a quiet room with three page turns per minute. Museum
uses a filtered room recording with subtle reflections. My Room mixes a quiet
interior with wind and birds outside the window.

Classroom has no automatic music or ambience. Its existing sound mixer and
saved channel choices remain independent of background sound settings.

## Sources and license

All source pages below identify their files as **CC0 1.0**. Freesound's public
MP3 previews are used; no login-only originals are downloaded. Credit is recorded
here even though CC0 does not require it.

| Source | Creator | Used for |
| --- | --- | --- |
| [Lofi Again](https://opengameart.org/content/lofi-again) | omfgdude | Home |
| [Cafe ambient sound](https://freesound.org/people/evsecrets/sounds/332271/) | evsecrets | Café |
| [Very quiet small apartment room](https://freesound.org/people/visionear/sounds/565535/) | visionear | Library, My Room |
| [Page Turning](https://freesound.org/people/XanTheRock/sounds/537872/) | XanTheRock | Library |
| [Room Tone Office Quiet Distant Traffic](https://freesound.org/people/mzui/sounds/135097/) | mzui | Museum |
| [Forest Wind Birds Tree Mastered](https://freesound.org/people/szegvari/sounds/520537/) | szegvari | My Room |

License: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
Tracks are edited, normalized, and blended at the loop seam. They are hosted
under `public/assets/audio/`; playback never contacts the source websites.
`manifest.json` records file sizes, durations, and SHA-256 hashes.

## Playback and controls

- Audio unlocks after a user gesture such as **Tap to start**. Browsers that block
  playback can be unlocked using **Background sound → Turn on sound**.
- The speaker button beside Home's logo and in each room header opens volume
  and mute controls. Preferences are saved on this device. Default volume is 35%.
- App owns the selected track. Home music only plays on Home; Calendar, Records,
  onboarding, the shop, and Classroom do not play these tracks.
- Leaving a room fades its track out; the new track fades in after loading.
  Outdated download completions cannot start audio in a different room.
- Hiding or leaving the app stops audio and suspends its background audio context.
  Returning resumes the current room. Audio failures leave the game usable;
  **Retry sound** retries on request.
- Tracks load only when needed. This deployment has no PWA or service worker.
  Increment the `v` query parameter in `roomAudio.ts` after changing audio assets.

## Rebuild

With Python 3 and `ffmpeg` / `ffprobe` on PATH, run:

```sh
python scripts/prepare-room-audio.py
```

The script downloads public sources to a temporary directory, renders five MP3
files, and writes the manifest. No Python packages or secrets are needed. Sources
may change upstream; compare hashes and listen before committing rebuilt tracks.
