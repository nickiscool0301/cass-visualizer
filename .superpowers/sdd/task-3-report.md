# Task 3 Report: CanvasToolbar Component

## What I Implemented

Created `web/src/components/CanvasToolbar.tsx` as specified in the task brief. The component re-organizes the existing `ControlBar.tsx` logic into a Notion-like toolbar layout:

- **Left area**: title (based on `activeTab`) and subtitle (showing node count, replication factor, and compaction strategy for the active keyspace).
- **Right area**: action groups for cluster operations, keyspace selection/RF/strategy, and adding a new keyspace.
- Uses the new `.btn-ghost` and `.input` utility classes and CSS custom properties (`--border-subtle`, `--text-primary`, `--text-secondary`, `--text-tertiary`, `--accent`).
- Hides all action groups when `activeTab === "knowledge"`.
- Keeps the same props signature as `ControlBar` (`cluster` and `dispatch`).

## What I Tested and Test Results

Ran the requested verification command from `web/`:

```bash
npm run build && npm test
```

Results:

- **Build**: passed (`tsc && vite build`).
- **Tests**: all 11 test files, 34 tests passed.
  - Existing `ControlBar.test.tsx` still passes because the original `ControlBar.tsx` was left in place; only the new component was added.
  - The new component is not yet imported or wired into `App.tsx`, so no snapshot or integration test changes were required.

## Files Changed

- **Created**: `web/src/components/CanvasToolbar.tsx` — new toolbar component.
- **Unchanged**: `web/src/components/ControlBar.tsx` — intentionally left untouched per the brief (deferred to Task 4).

## Self-Review Findings

- Component matches the brief exactly, including types, state hooks, helper variables, JSX structure, and Tailwind classes.
- No TypeScript errors; build succeeds.
- No unused imports or variables.
- Commit is minimal and focused on this task only.

## Issues or Concerns

None. The component is ready to be wired into `App.tsx` in Task 4.

## Review Fixes (Post-Review)

### Fixes Applied

1. **Hard-coded warning color → CSS custom property**
   - Added `--warning: #d97706;` to `:root` in `web/src/index.css`.
   - Replaced the hard-coded `style={{ color: "#d97706" }}` in `web/src/components/CanvasToolbar.tsx` with `style={{ color: "var(--warning)" }}`.

2. **Duplicate-name warning placement**
   - Moved `{duplicateName && <span ...>Name exists</span>}` from outside the `cluster.activeTab !== "knowledge"` guard into the new-keyspace action group (the third guarded `<div className="flex items-center gap-2">`).
   - The warning now only renders when the new-keyspace inputs are visible.

### Test Results

Ran `npm run build && npm test` from `web/`:

- **Build**: passed (`tsc && vite build`).
- **Tests**: 11 test files, 34 tests passed.

### Files Changed

- `web/src/index.css` — added `--warning` CSS custom property.
- `web/src/components/CanvasToolbar.tsx` — used `var(--warning)` and relocated warning inside the new-keyspace group.
- `.superpowers/sdd/task-3-report.md` — appended this review-fix section.

### Concerns

None.
