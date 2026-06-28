import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CanvasToolbar } from "../src/components/CanvasToolbar";
import { createInitialCluster } from "../src/state/clusterReducer";
import type { ClusterAction } from "../src/state/clusterReducer";

describe("CanvasToolbar", () => {
  it("renders essential cluster controls and dispatches actions", () => {
    const dispatch = vi.fn<(action: ClusterAction) => void>();
    const cluster = createInitialCluster();

    render(<CanvasToolbar cluster={cluster} dispatch={dispatch} />);

    fireEvent.click(screen.getByRole("button", { name: /add node/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "ADD_NODE" });

    fireEvent.click(screen.getByRole("button", { name: /rebalance/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "REBALANCE_TOKENS" });
  });
});
