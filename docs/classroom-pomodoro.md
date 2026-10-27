# Classroom sessions

The session panel appears after choosing a seat and sound. Choose **Timer** for a single session (15, 25, 50 minutes, or the existing 1-minute demo), or **Pomodoro** for repeating 25-minute focus rounds and 5-minute breaks. Both require a nonblank study goal.

The top back button works while planning. The panel's Back button, backdrop, and downward grip gesture return to seat selection without starting a session. Existing typed goals are retained.

## Pomodoro flow

1. Start a 25-minute focus round.
2. At its deadline, the 5-minute break starts. Choose **Explore spaces** to visit Home and another room. A small break timer stays visible.
3. Returning to Classroom before the break ends keeps the break running.
4. At the break deadline, a dialog asks the user to return. **Back to focus** restores the same seat and goal and starts the next 25-minute round.
5. End the session to save accumulated focus time and receive the existing rewards/check-in. Break and paused time are excluded.

During focus, the back button opens a confirmation. **Keep going** cancels it while the timer continues. **End and leave** saves eligible focus time and goes Home. The **End** button always asks for confirmation and shows the normal reward flow after ending. During breaks, moving between rooms keeps the session active.

The clock uses wall-time deadlines and catches up when a background tab becomes active. It belongs to the running application; it does not restore after a page reload or browser closure. While a session is active, the browser's usual leave-page confirmation helps prevent accidental reload/closure. Google Calendar reminders continue to use the separate existing calendar integration.

## Verification

- `npm test`: timer transitions, pause accounting, background catch-up, exit cancellation, break timer in Café, return to the same seat, and focus-only session records.
- `npm run build`: TypeScript and production build.
- `npm run test:rules`: existing application rules.
- Browser checks: 390×844 and compact phone viewport; panel scrolling/dragging, planning back button, goal/minimap separation, and exit dialog.
