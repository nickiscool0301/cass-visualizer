import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailsPanel } from "../src/components/DetailsPanel";
import { createInitialCluster } from "../src/state/clusterReducer";

describe("DetailsPanel", () => {
  it("renders cluster summary when no node selected", () => {
    const cluster = createInitialCluster();
    render(<DetailsPanel cluster={cluster} />);
    expect(screen.getByText(/nodes/i)).toBeInTheDocument();
  });
});
