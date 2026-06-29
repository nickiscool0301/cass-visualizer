import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReadSimulator } from "../src/components/ReadSimulator";
import { createInitialCluster } from "../src/state/clusterReducer";
import type { ClusterAction } from "../src/state/clusterReducer";

describe("ReadSimulator", () => {
  it("dispatches READ and displays the result", () => {
    const dispatch = vi.fn<(action: ClusterAction) => void>();
    const cluster = createInitialCluster();

    render(<ReadSimulator cluster={cluster} dispatch={dispatch} />);

    fireEvent.change(screen.getByPlaceholderText("Partition key"), { target: { value: "user-1" } });
    fireEvent.click(screen.getByRole("button", { name: /read/i }));

    expect(dispatch).toHaveBeenCalledWith({ type: "READ", partitionKey: "user-1" });
  });

  it("shows the read repair button when a mismatch is detected", () => {
    const dispatch = vi.fn<(action: ClusterAction) => void>();
    const cluster = createInitialCluster();
    cluster.lastReadResult = {
      partitionKey: "user-1",
      coordinatorId: cluster.nodes[0].id,
      digestMismatches: [cluster.nodes[1].id],
      resolvedValue: null,
    };

    render(<ReadSimulator cluster={cluster} dispatch={dispatch} />);

    fireEvent.change(screen.getByPlaceholderText("Partition key"), { target: { value: "user-1" } });
    const repairButton = screen.getByRole("button", { name: /execute read repair/i });
    expect(repairButton).toBeVisible();
    fireEvent.click(repairButton);

    expect(dispatch).toHaveBeenCalledWith({ type: "EXECUTE_READ_REPAIR", partitionKey: "user-1" });
  });
});
