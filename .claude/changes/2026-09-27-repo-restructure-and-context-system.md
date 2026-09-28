# 2026-09-27 — Repo restructure + context system

## Request
Place app inside `professional-services/`; adopt token-efficient master instructions with persistent `.claude/` memory.

## Implementation
- Copied app (excluding node_modules/.expo/dist) to `professional-services/QuickJob`; moved `.git` to `professional-services/` (history kept, files recorded as renames, commit `63ce6ae`).
- Added root `CLAUDE.md` importing `.claude/INSTRUCTIONS.md`; created MEMORY, INDEX, ARCHITECTURE, DECISIONS, feature files, change records.

## Files Changed
`CLAUDE.md`, `.claude/**`.

## Verification
Git history intact (`git log`). App code unchanged.

## Remaining Work
`npm install` in `QuickJob/`; create GitHub repo and push; user may delete old `Documents/QuickJob`.
