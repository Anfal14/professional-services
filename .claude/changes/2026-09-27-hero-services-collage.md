# 2026-09-27 — Hero: services photo grid instead of "Verified professional" card

## Request (iterated three times)
1. "Instead of Verified professional card on hero, show few services image."
2. "I just wanted images no text labels ratings etc, just random size images." → tried a 3-row asymmetric grid, then a free-floating rotated/overlapping scatter.
3. Shared a reference screenshot (Urban Company-style): a clean, flat 2×2 grid of 4 photos, even gaps, each individually rounded, no overlap/rotation/shared frame. "show them like this."

## Final Implementation
In `app/index.tsx`, the desktop-only floating hero element is now a plain 2×2 grid of 4 service photos (`heroPreviewServices = services.slice(0, 4)`): two rows (`heroCollageRow`, `flexDirection: 'row', gap: 10`), each image `flex: 1` with its own `borderRadius: radius.lg` — no shared background, border, or shadow wrapping the set, no labels, no badges, no caption text. Row heights are 240 then 190 (matching the reference's slightly-taller-top-row proportion).

## Files Changed
`QuickJob/src/app/index.tsx` only. Net styles: `heroCollage` (just a width + gap wrapper), `heroCollageRow`, `heroCollageTile` (`flex: 1`, `borderRadius: radius.lg`, cast `as object` — see below). Removed all styles from the earlier iterations (`heroCard`, `heroCardBody`, `avatarDot`, `floatBadge`, `heroCollageLabel`, the absolute-position scatter tiles).

## Database / API Changes
None.

## Important Decisions
- Settled on 4 photos (not 5 or 6) to match the reference's 2×2 layout exactly.
- `heroCollageTile` needed `as object` on its style — `StyleSheet.create`'s inferred `ViewStyle` type isn't assignable to expo-image's `ImageStyle` (its `overflow` includes `'scroll'`, which `ImageStyle` rejects) even when the object never sets `overflow`. Same pattern already used in `TextField.tsx`/`SearchBar.tsx` for RN Web style-type mismatches.
- No per-tile shadow/border — the reference is flat, so the grid relies on the surrounding gap for separation rather than elevation.

## Verification
`npx tsc --noEmit` clean, `npx expo lint` clean, `npx expo-doctor` 21/21. Confirmed via DOM measurement (`getBoundingClientRect`) that all 4 tiles render at the expected size/position, then visually confirmed in a 1200px-wide screenshot: clean 2×2 grid, correct photos, no text/badges anywhere on it.

## Remaining Work
Same as before — commit/push, replace placeholder data.
