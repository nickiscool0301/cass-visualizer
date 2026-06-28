# UI Animation Enhancement — Design Spec

**Date:** 2026-06-27  
**Status:** Approved  
**Scope:** Add CSS-driven animations to the existing Cassandra Cluster Visualizer v2.

## 1. Overview

Make the visualizer more engaging and easier to follow by adding CSS transitions and keyframe animations to both the topology view and the storage-engine view. No new Cassandra simulation logic is introduced; this is purely a UI/UX enhancement.

## 2. Goals

- Smoothly animate topology changes (add/remove nodes, rebalance tokens, hover/selection).
- Visually trace a write from the Write Simulator through the commit log, memtable, and SSTable.
- Keep the implementation dependency-free (Tailwind + custom CSS only).
- Preserve all existing functionality and tests.

## 3. Non-Goals

- No new Cassandra features (compaction, repair, reads, consistency levels).
- No JavaScript animation libraries (Framer Motion, GSAP, etc.).
- No physics-based or drag-and-drop interactions.

## 4. Animation Behaviors

### 4.1 Topology Animations

- **Ring arc transitions:** `d` attribute changes animate via CSS `transition` when possible; opacity and stroke-width animate on hover/selection.
- **Node tick marks:** scale slightly on hover/selection of the owning node.
- **Selection state:** selected node arcs pulse gently; non-selected arcs dim.
- **Add/remove/rebalance:** existing arcs fade out/in and re-render with new geometry.

### 4.2 Write-Path Animations

- **Write trigger:** clicking Write adds a transient "packet" indicator that travels from the Write Simulator toward the selected storage node card.
- **Commit log pulse:** the target node's commit log briefly glows when a write arrives.
- **Memtable fill:** new rows fade/slide in; the memtable header subtly highlights when rows are added.
- **SSTable flush:** when a memtable auto-flushes, the SSTable card glows and the memtable empties with a fade-out.

## 5. Components Affected

- `web/src/components/TokenRing.tsx` — arc/tick hover and selection animations.
- `web/src/components/StorageView.tsx` — commit-log glow, memtable row entrance, SSTable flush glow.
- `web/src/components/WriteSimulator.tsx` — trigger packet animation; disable inputs during animation.
- `web/src/state/clusterReducer.ts` — optional transient animation state flag (`lastWriteTargetId`, `lastFlushAt`).
- `web/src/index.css` — custom keyframes for packet travel, glow, pulse, fade.
- `web/src/App.tsx` — ensure tab switches don't interfere with animation state.

## 6. State Changes

Add optional fields to `Cluster`:

```ts
animation: {
  writeTargetNodeId: string | null;
  flushedNodeId: string | null;
}
```

Reducer sets these on `WRITE` and `FLUSH_MEMTABLE`, and a `CLEAR_ANIMATION` action resets them after the CSS animation duration.

## 7. Testing

- Existing unit tests (26) must continue to pass.
- Animation states are cleared after timeout; reducer tests verify the flags are set correctly.
- Visual timing is verified manually in the browser.

## 8. Success Criteria

1. Token ring arcs and ticks animate smoothly on hover/selection.
2. Adding/removing nodes or rebalancing shows visible transition.
3. Clicking Write triggers a visible packet/glow sequence in the Storage view.
4. SSTable flush is visually highlighted.
5. All existing tests pass and the production build succeeds.
