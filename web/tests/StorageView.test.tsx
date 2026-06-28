import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StorageView } from "../src/components/StorageView";
import { createInitialCluster } from "../src/state/clusterReducer";
import type { ClusterAction } from "../src/state/clusterReducer";

describe("StorageView", () => {
  it("renders a Flush Memtable button for each node and dispatches the action", () => {
    const dispatch = vi.fn<(action: ClusterAction) => void>();
    const cluster = createInitialCluster();
    cluster.nodes[0].storage.memtable.push({
      partitionKey: "user-1",
      value: "hello",
      timestamp: Date.now(),
    });

    render(<StorageView cluster={cluster} dispatch={dispatch} />);

    const flushButtons = screen.getAllByRole("button", { name: /flush memtable/i });
    expect(flushButtons.length).toBe(cluster.nodes.length);

    fireEvent.click(flushButtons[0]);
    expect(dispatch).toHaveBeenCalledWith({
      type: "FLUSH_MEMTABLE",
      nodeId: cluster.nodes[0].id,
    });
  });

  it("disables Flush Memtable when the memtable is empty", () => {
    const dispatch = vi.fn<(action: ClusterAction) => void>();
    const cluster = createInitialCluster();

    render(<StorageView cluster={cluster} dispatch={dispatch} />);

    const flushButtons = screen.getAllByRole("button", { name: /flush memtable/i });
    expect(flushButtons[0]).toBeDisabled();
  });

  it("renders all nodes even when one is selected", () => {
    const dispatch = vi.fn<(action: ClusterAction) => void>();
    const cluster = createInitialCluster();
    cluster.selectedNodeId = cluster.nodes[1].id;

    render(<StorageView cluster={cluster} dispatch={dispatch} />);

    expect(screen.getAllByRole("button", { name: /flush memtable/i }).length).toBe(
      cluster.nodes.length
    );
  });
});
