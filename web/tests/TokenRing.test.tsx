import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TokenRing } from "../src/components/TokenRing";
import { createInitialCluster } from "../src/state/clusterReducer";

describe("TokenRing", () => {
  it("renders an SVG", () => {
    const cluster = createInitialCluster();
    render(<TokenRing cluster={cluster} onSelectNode={() => {}} highlightedNodeId={null} />);
    expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();
  });
});
