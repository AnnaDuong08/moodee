# Tutor implementation ledger

Approved brief: separate Classroom Tutor button; Ask, three-question quizzes and device history; guests and Google accounts; uninterrupted session clock; Supabase/OpenAI backend with atomic quotas. Work directly on main as requested.

## Tasks

1. Shared authentication and Calendar isolation. OAuth callbacks distinguish Tutor from Calendar; anonymous users remain Calendar guests.
2. Tutor contracts, local history and OpenAI request validation. Text-only, bounded context, validated quizzes, no provider secrets in the client.
3. Private database quotas and authenticated Edge Function. Jakarta day reset, 10/30 per user, 300 global, three/minute; reserve atomically before upstream calls.
4. Tutor panel and Classroom integration. Retain draft/history through breaks; session completion and global dialogs take priority.
5. Tests, phone checks, setup guide, independent final review, commit and deploy.

## Pre-flight

- Auth → Calendar: existing OAuth always requests Calendar and App always routes callbacks there. Extract shared client, retain existing Calendar exports for compatibility.
- Timer → Tutor: session clock is owned by App; Tutor must never own or pause it. Classroom stays mounted across Pomodoro room visits.
- Tutor → quota: backend chooses identity/limit from verified user; clients cannot select a higher quota.
- History → identity: local conversations are scoped by Supabase UUID, with no guest/account merging.

## Decisions and evidence

- Ruling: no OpenAI platform key creation tool is available. Deliver secret-based integration and document the configuration gate; never solicit the key in chat.
- Updated user decision: remove Turnstile entirely. Guest authentication happens automatically on the first Tutor request through Supabase anonymous sign-in, with no manual login or CAPTCHA. Existing accounts reuse their Supabase session. Enable Anonymous Sign-Ins and disable CAPTCHA protection in Supabase Auth.
- Ruling: existing Calendar disconnect becomes Calendar-only; shared Auth remains active for Tutor as specified.

## Verification (2026-10-01)

- 99 Vitest tests passed across 29 files, including Calendar regressions, anonymous access without CAPTCHA, context bounds, quiz progress during pending replies, and history isolation/deletion failures.
- 29 rules checks passed; TypeScript and production build passed.
- Atomic quota tests passed against an isolated PostgreSQL database: parallel requests, user/app daily caps, rolling minute limit, Jakarta reset, and denied anonymous/authenticated direct access.
- Independent final review: fixed stale Ask replies overwriting quiz progress and failed storage deletion resurrecting history. CAPTCHA retry finding became obsolete after the user removed Turnstile.
- Phone viewports checked at 390×844, 320×568 and 320×400 (short viewport simulates limited keyboard space; physical iPhone keyboard not verified).
- Actual one-minute Classroom timer kept counting while Tutor was open. Guest request failed at anonymous authentication; draft remained available. Live OpenAI responses cannot be verified until Supabase guest access is configured.
- Private usage migration applied to linked Supabase project and tutor function deployed. Endpoint rejects unauthenticated requests; frontend carries no OpenAI secret.
- Follow-up operations: prune unused anonymous accounts and old quota rows according to the project's retention policy. No scheduled deletion added.

## Tutor UI revision

- Replaced browser scrollbars in the Tutor panel, conversation, tables and code blocks with custom lavender rails and draggable thumbs. Native wheel, touch and keyboard scrolling remains available. Textarea scrollbars use matching colors.
- Tutor replies render Markdown headings, emphasis, lists, quotes, links, tables and code with MOODEE typography. User messages remain plain text; raw model HTML is skipped and remote images do not load automatically.
- Added regression tests for formatted replies and inert HTML/unsafe URLs; all 101 tests and 29 rules checks pass, as does TypeScript/production build.
- Visual checks used the real panel and an explicitly labelled local sample-answer fixture, including 320×568. Verified vertical and horizontal thumb dragging and overflow sizing. Live guest access still fails at Supabase authentication; this revision changes frontend presentation only.
