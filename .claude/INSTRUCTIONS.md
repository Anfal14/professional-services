# CLAUDE CODE — TOKEN-EFFICIENT PROJECT OPERATING SYSTEM

## Purpose

Use this file as the master instruction for Claude Code.

The primary goals are:

1. Build correct, production-ready software.
2. Minimize unnecessary context consumption.
3. Avoid repeatedly reading the entire codebase.
4. Maintain lightweight persistent project memory.
5. Keep feature/change context available across sessions.
6. Avoid unnecessary reasoning/narration in responses.
7. Implement autonomously when requirements are clear.
8. Verify changes instead of merely claiming success.

---

# 1. CORE OPERATING PRINCIPLE

Use this workflow for every task:

UNDERSTAND → TARGETED SEARCH → PLAN → IMPLEMENT → VERIFY → UPDATE MEMORY

Do NOT use:

READ EVERYTHING → REASON VERBOSELY → CHANGE MANY FILES → HOPE IT WORKS

The source code is the source of truth.

The `.claude/` directory is a lightweight navigation and memory system that helps you find the relevant source code quickly.

---

# 2. TOKEN / CONTEXT EFFICIENCY

Context efficiency is a project requirement.

Do not unnecessarily consume context by:

- Reading the entire repository for a small feature.
- Re-reading files that have not changed.
- Reading unrelated features.
- Repeating the user's requirements.
- Repeating your own previous conclusions.
- Narrating every tool/action.
- Producing long explanations before implementation.
- Dumping source code into memory files.
- Reconstructing project history when it is already documented.
- Performing broad exploration when targeted search is sufficient.

Before reading a file or directory, ask:

> Do I actually need this information to complete the current task?

Prefer:

- Targeted search
- Relevant symbols
- Relevant files
- Existing feature memory
- Existing change records
- Existing architecture documentation

over broad repository exploration.

---

# 3. IMPORTANT: REASONING / THINKING OUTPUT

For normal implementation tasks:

- Keep planning concise.
- Do not provide long step-by-step reasoning.
- Do not narrate every action.
- Do not repeatedly explain obvious decisions.
- Do not restate the complete task.
- Do not produce verbose intermediate summaries.
- Move to implementation once sufficient context is established.

For complex tasks:

1. Identify relevant context.
2. Produce a short plan if useful.
3. Implement.
4. Verify.
5. Update memory.
6. Provide a concise final summary.

Do not spend excessive reasoning/context on trivial decisions.

Do not repeatedly reconsider an already-established decision unless new evidence requires it.

IMPORTANT:

This instruction controls response verbosity and unnecessary work. It does NOT guarantee that the underlying model's private reasoning/thinking tokens will be disabled. If Claude Code/model-level thinking controls are available, use the lowest reasonable thinking effort/budget for routine implementation tasks and reserve higher reasoning effort for genuinely complex problems.

Never sacrifice correctness merely to reduce reasoning.

---

# 4. PERSISTENT CONTEXT SYSTEM

Use this directory:

.claude/

Recommended structure:

.claude/
├── MEMORY.md
├── INDEX.md
├── ARCHITECTURE.md
├── DATABASE.md
├── API.md
├── DECISIONS.md
├── features/
│   ├── authentication.md
│   ├── quiz.md
│   ├── quran.md
│   └── ...
└── changes/
    ├── YYYY-MM-DD-short-description.md
    └── ...

Not every optional file must exist. Create/update only what is useful.

---

# 5. CONTEXT LOADING ORDER

For every task, use this order:

1. `CLAUDE.md`
2. `.claude/MEMORY.md`
3. `.claude/INDEX.md`
4. Relevant feature memory file(s)
5. Relevant system context such as:
   - `ARCHITECTURE.md`
   - `DATABASE.md`
   - `API.md`
   - `DECISIONS.md`
6. Only the source files needed for the task
7. Relevant change records only if historical context is needed

Do NOT automatically read all `.claude/features/*`.

Do NOT automatically read all `.claude/changes/*`.

Do NOT scan the entire source tree unless the task genuinely requires it.

---

# 6. PROJECT MEMORY

`.claude/MEMORY.md` is the high-level project memory.

It should contain only concise information such as:

- Project name
- Project purpose
- Technology stack
- High-level architecture
- Major features
- Infrastructure
- Database/storage
- Authentication
- Current development focus
- Important constraints
- Important decisions
- Known issues
- Links/paths to deeper context files

Keep this file small.

Do NOT turn it into a project transcript.

Do NOT put large source-code blocks into it.

---

# 7. CONTEXT INDEX

`.claude/INDEX.md` is the navigation map.

It should tell you:

- Which feature exists
- Which context file describes it
- Which system-level context files exist
- Current status where useful

Use it to decide what context to load.

If a task concerns Quiz, read Quiz context.

Do not read Quran, Hadith, Authentication, etc. unless the task requires them.

---

# 8. FEATURE MEMORY

Every significant feature should have:

`.claude/features/<feature-name>.md`

Example:

`.claude/features/quiz.md`

Each feature memory should contain:

## Purpose
What the feature does.

## Status
- Completed
- In progress
- Planned

## Relevant Files
Important screens, components, hooks, services, models, routes, utilities, etc.

## Architecture
A concise description of how the feature works.

## Data Model
Relevant tables, collections, fields, relationships.

## API
Relevant endpoints/services/external APIs.

## State Management
Where state lives and how it flows.

## Dependencies
Important dependencies/services.

## Important Decisions
Decisions that future implementation needs to preserve.

## Constraints
Things that must not be broken.

## Known Issues
Known problems.

## Future Work
Important remaining work.

## Last Important Change
Date, short description, and affected files.

Do NOT copy source code into feature memory.

The feature memory should tell Claude WHERE the implementation is and HOW it is structured, not duplicate the implementation.

---

# 9. CHANGE MEMORY

For every significant implementation, create:

`.claude/changes/YYYY-MM-DD-short-description.md`

Example:

`.claude/changes/2026-09-27-quiz-result-screen.md`

Keep it concise.

Use:

## Request
What was requested.

## Implementation
What was implemented.

## Files Changed
Important files.

## Database Changes
None / description.

## API Changes
None / description.

## Important Decisions
Important technical decisions.

## Verification
Tests/build/typecheck/lint/manual verification.

## Remaining Work
Only if applicable.

Do not create a change file for trivial formatting or insignificant one-line changes.

---

# 10. MEMORY IS NOT SOURCE CODE

Never treat memory files as authoritative implementation.

If memory says:

`Quiz logic is in src/features/quiz/quizService.ts`

verify the actual file before changing it.

If memory is stale:

1. Inspect the actual source.
2. Correct the memory.
3. Continue.

Always prioritize current source code over stale documentation.

---

# 11. INITIAL PROJECT DISCOVERY

If the context system is new or incomplete:

Do NOT blindly scan every file.

Instead:

1. Read `CLAUDE.md`.
2. Read `.claude/MEMORY.md` if present.
3. Read `.claude/INDEX.md` if present.
4. Inspect project manifests/configuration.
5. Identify the main application structure.
6. Search for major feature boundaries.
7. Identify database/storage/API/authentication.
8. Build/update the context files.
9. Avoid modifying application functionality during context initialization unless explicitly requested.

Create only useful context files.

Keep them concise.

---

# 12. BEFORE IMPLEMENTING ANY TASK

Determine:

1. What exactly is being requested?
2. Which feature is affected?
3. Which feature memory applies?
4. Which source files are likely relevant?
5. Which shared systems are affected?
6. Whether database/API/authentication changes are involved.
7. Whether another feature is genuinely affected.

Then perform targeted inspection.

If the requirement is clear, proceed.

Do not ask unnecessary clarification questions.

Ask only when:
- Requirements materially conflict.
- A destructive operation is required.
- Credentials/access are required.
- Multiple materially different architectures are possible.
- The requested behavior is genuinely ambiguous.

Otherwise make a reasonable engineering decision.

---

# 13. EXISTING CODE FIRST

Before creating new code:

- Search for existing implementations.
- Search for reusable components.
- Search for existing hooks.
- Search for existing services.
- Search for existing utilities.
- Search for existing API clients.
- Search for existing database functions.
- Search for existing validation.
- Search for existing styling/design-system components.

Reuse existing functionality when appropriate.

Do not create duplicate implementations.

---

# 14. MINIMAL CHANGE PRINCIPLE

Always ask:

> What is the smallest safe change that completely solves the requested problem?

Prefer targeted changes.

Do NOT:

- Rewrite working systems unnecessarily.
- Refactor unrelated code.
- Change unrelated files.
- Replace libraries without a strong reason.
- Introduce new frameworks unnecessarily.
- Upgrade major dependencies just because they are newer.
- Redesign unrelated UI.

If you discover an unrelated issue, report it under `Additional Findings` rather than silently changing it.

---

# 15. LARGE TASKS

For large features, work in logical phases.

Example:

1. Context/architecture
2. Data layer
3. Backend/API
4. Frontend/UI
5. Integration
6. Testing
7. Memory update

After each meaningful phase, verify before moving forward.

Do not perform an unnecessarily large rewrite.

---

# 16. DEBUGGING

When fixing a bug:

1. Understand/reproduce the problem.
2. Read the complete error.
3. Identify the affected file/module/component.
4. Trace the relevant execution path.
5. Determine the root cause.
6. Make the smallest correct fix.
7. Verify the fix.
8. Check for regression.
9. Update feature memory if behavior/architecture changed.

Do NOT randomly modify multiple files.

Do NOT repeatedly apply speculative fixes.

---

# 17. DEPENDENCIES

Before adding a package:

1. Inspect existing dependencies.
2. Determine whether the current stack already provides the capability.
3. Check compatibility.
4. Consider bundle size/performance.
5. Consider maintenance/security.
6. Add the dependency only when justified.

Do not install dependencies merely for convenience.

Do not perform unnecessary major-version upgrades.

---

# 18. DATABASE

Before modifying the database:

1. Read relevant database context.
2. Inspect current schema.
3. Understand relationships.
4. Inspect indexes.
5. Inspect relevant queries.
6. Consider existing data.
7. Consider migrations.
8. Consider backward compatibility.

Avoid:

- N+1 queries
- Unnecessary full-table scans
- Fetching unnecessary fields
- Missing pagination
- Unnecessary reads/writes

Never perform destructive production data/schema changes without explicit authorization.

---

# 19. API

When creating/modifying APIs:

- Follow existing conventions.
- Reuse existing API infrastructure.
- Validate input.
- Handle errors consistently.
- Enforce authorization.
- Avoid exposing internal details.
- Avoid unnecessary requests.
- Consider pagination.
- Consider rate limits.
- Consider caching where appropriate.

---

# 20. FRONTEND / MOBILE

Follow the existing design system.

Handle:

- Loading
- Empty states
- Errors
- Network failures
- Offline behavior where relevant
- Authentication states
- Responsive layouts
- Accessibility where applicable

Avoid unnecessary renders and network requests.

For React Native/Expo projects, preserve compatibility with the current:

- Expo SDK
- React Native version
- Android configuration
- iOS configuration where applicable
- EAS configuration
- Native modules

Do not randomly upgrade Expo/React Native/Gradle/Android SDK to solve an error.

First identify the compatibility/root cause.

---

# 21. SECURITY

Never:

- Hardcode secrets.
- Commit credentials.
- Expose private tokens.
- Log passwords/API keys/tokens.
- Trust client-side authorization.
- Bypass authentication/authorization.
- Store sensitive data insecurely.

Check:

- Authentication
- Authorization
- Input validation
- File uploads
- Database permissions
- Storage permissions
- Environment variables
- Logging

If you discover a security issue while working, report it.

---

# 22. PERFORMANCE

Watch for:

- Duplicate API calls
- Excessive database queries
- N+1 queries
- Large payloads
- Unnecessary rendering
- Excessive memory use
- Unnecessary background work
- Missing pagination
- Missing caching where appropriate

Do not prematurely optimize without evidence, but flag obvious performance problems.

---

# 23. CLOUD / COST

For cloud-backed features consider:

- Storage
- Bandwidth
- Database reads
- Database writes
- API calls
- Background jobs
- Logs
- Cache usage
- Scaling behavior

Prefer simple architectures that meet requirements.

Avoid introducing cloud services without understanding why they are needed.

When an obvious unnecessary cost exists, flag it.

---

# 24. TESTING AND VERIFICATION

Before saying a task is complete, perform the relevant verification.

Depending on the project:

- Unit tests
- Integration tests
- Type checking
- Lint
- Build
- Relevant runtime/manual verification

Never claim a test passed unless it was actually run.

If something cannot be tested, explicitly state:

- What could not be tested
- Why
- What was verified instead

---

# 25. MEMORY UPDATE AFTER IMPLEMENTATION

After a significant change:

1. Update the relevant feature memory.
2. Update `.claude/MEMORY.md` if project-level state changed.
3. Update `.claude/INDEX.md` if a feature/context file was added or renamed.
4. Update `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, or `DECISIONS.md` if applicable.
5. Create a concise change record.

Do not leave stale context.

Do not update memory for trivial changes.

---

# 26. CONTEXT RECOVERY

If a new session starts and you need context:

1. Read `MEMORY.md`.
2. Read `INDEX.md`.
3. Identify the relevant feature.
4. Read that feature memory.
5. Read relevant recent change records only if needed.
6. Inspect only the referenced source files.

Do NOT reconstruct the entire project from scratch unless necessary.

---

# 27. CROSS-FEATURE TASKS

If a task genuinely affects multiple features:

1. Identify all affected features.
2. Read only those feature memory files.
3. Identify shared dependencies.
4. Inspect shared source files.
5. Implement carefully.
6. Update all affected feature memories.

Do not load unrelated feature context.

---

# 28. GIT SAFETY

Do not:

- Reset user work.
- Delete user changes.
- Rewrite history.
- Run destructive commands casually.

Before major changes, understand the existing working state.

Do not assume every existing modification was created by you.

---

# 29. ENVIRONMENT VARIABLES

Use environment variables for environment-specific configuration.

Never hardcode:

- API keys
- Passwords
- Tokens
- Production credentials
- Private endpoints where configuration should be externalized

Do not print secret values.

---

# 30. DOCUMENTATION QUALITY

Documentation should be:

- Concise
- Current
- Actionable
- Easy to search

Avoid documentation bloat.

The goal of `.claude/` is faster future context retrieval, not creating another giant codebase.

---

# 31. WHEN TO READ CHANGE HISTORY

Read `.claude/changes/` only when:

- Continuing a recently implemented feature.
- Understanding why a technical decision exists.
- Debugging a regression.
- Understanding a recent architecture/API/database change.
- The feature memory references historical context.

Do not read all change records.

---

# 32. WHEN TO UPDATE MEMORY

Update memory when any of these change:

- Feature architecture
- Important file locations
- Database structure
- API behavior
- Authentication behavior
- Major dependency
- Important technical decision
- Feature status
- Known issue
- Important constraint
- Deployment/infrastructure design

Do not record every tiny edit.

---

# 33. RESPONSE STYLE

For normal coding tasks, keep the final response concise.

Use:

## Implemented
- What changed.

## Files Changed
- Important files.

## Verification
- Tests/build/typecheck/lint.

## Memory Updated
- Context files updated.

## Remaining Issues
- Only if applicable.

Do not provide long explanations unless requested.

Do not repeat large sections of code unless specifically requested.

---

# 34. HEAVY TASK MODE

When the task is large or complex, internally use this operating mode:

HEAVY TASK MODE

- Use the `.claude/` context system first.
- Avoid repository-wide scanning.
- Avoid verbose narration.
- Keep the plan concise.
- Reuse existing code.
- Implement in logical phases.
- Verify each important phase.
- Update memory.
- Continue autonomously unless a real blocker exists.

The final response should remain concise.

---

# 35. USER COMMAND SHORTCUTS

If the user says:

"Continue"
→ Recover context using MEMORY → INDEX → relevant feature → recent relevant changes → source.

"Fix this"
→ Inspect the relevant feature context first, identify root cause, make minimal fix, verify.

"Implement this"
→ Identify relevant context, inspect existing implementation, plan briefly, implement, verify, update memory.

"Review this"
→ Inspect relevant code and context, identify correctness/security/performance/maintainability issues, do not modify unless asked.

"Optimize this"
→ First identify actual bottleneck/problem, then optimize the smallest relevant area and verify improvement.

"Refactor this"
→ Preserve behavior unless explicitly asked to change it. Keep refactor scoped.

"Why is this failing?"
→ Diagnose first. Do not blindly modify code.

---

# 36. MEMORY FILE QUALITY CHECK

Before finishing a task that updates memory, ensure:

- It is concise.
- It reflects current reality.
- It does not contain obsolete information.
- It does not duplicate source code.
- It points to actual files.
- It helps a future session find relevant code quickly.

---

# 37. FINAL GOLDEN RULE

Always optimize for:

CORRECTNESS
+
MINIMAL CONTEXT
+
MINIMAL UNNECESSARY REASONING
+
TARGETED CODE READING
+
SMALLEST SAFE CHANGE
+
VERIFICATION
+
PERSISTENT MEMORY

The goal is not merely to write code.

The goal is to make every future Claude Code session start with the minimum context necessary to continue the project correctly.
