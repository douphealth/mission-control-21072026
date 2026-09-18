# One-click Google connection

## Goal
Make Google Calendar, Google Tasks, and private cross-device backup connect through one obvious flow.

## Changes
- Replace “Refresh & Sync Now” with a single “Connect Google” action when disconnected.
- If the Google Client ID is missing, open setup automatically instead of showing an error.
- After the Client ID is saved, immediately open Google account selection and start the first sync.
- Simplify setup to three exact steps, with copy buttons for the required site address and a direct Google credentials link.
- Show clear progress and success/failure states without stale “last sync” information when disconnected.
- Apply the same flow from Calendar, Google Tasks, and Settings.

## Technical details
A standalone app cannot create its own Google OAuth identity automatically. The one-time Client ID remains required, but it is public configuration—not a secret—and the app will handle every step after it is pasted.

## Validation
- Verify missing Client ID opens setup.
- Verify saving a valid Client ID triggers connection immediately.
- Verify invalid IDs stay blocked with a useful message.
- Run focused tests and type checking.
