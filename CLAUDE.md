@.claude/INSTRUCTIONS.md

# Project entry point

Load context in this order: `.claude/MEMORY.md` → `.claude/INDEX.md` → the one relevant `.claude/features/*.md` → only the source files it points to.

npm-workspaces monorepo: apps in `apps/customer`, `apps/vendor`, `apps/admin`; shared code in `packages/shared` (domain + mock backend) and `packages/ui` (UI kit). Expo rules are in `apps/customer/AGENTS.md` (SDK 57: check versioned docs, use `npx expo install` inside the app folder, routes in `src/app/`). Run `npm install` from the repo root; run expo commands from the app folder.
