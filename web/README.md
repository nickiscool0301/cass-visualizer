# Cassandra Cluster Visualizer

An interactive web app for visualizing Cassandra token-ring topology, replication factors, and node ownership.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS
- d3-shape for SVG arc generation
- Vitest for testing

## Scripts

```bash
npm run dev      # start dev server
npm run build    # type-check and build
npm run test     # run tests
```

## Project layout

- `src/components/` — React UI components (TokenRing, ControlPanel, etc.)
- `src/state/` — cluster reducer and state hooks
- `src/lib/` — geometry and replica-placement helpers
- `src/types/` — TypeScript domain types
- `tests/` — Vitest test suite
