import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SSTableInspector } from "../src/components/SSTableInspector";
import type { SSTable } from "../src/types/cluster";

function makeSSTable(rows: SSTable["rows"]): SSTable {
  return {
    id: "sstable-test-1",
    rows,
    createdAt: 1_000_000,
    level: 0,
  };
}

describe("SSTableInspector", () => {
  it("renders active rows with a green cue", () => {
    const sstable = makeSSTable([
      { partitionKey: "user-1", value: "alice", timestamp: 1_000_000 },
    ]);
    const onClose = vi.fn();

    render(<SSTableInspector sstable={sstable} onClose={onClose} />);

    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    const row = screen.getByText("alice").closest("tr");
    expect(row).toHaveStyle({ backgroundColor: "rgba(34, 197, 94, 0.06)" });
  });

  it("renders tombstone rows with a red cue", () => {
    const sstable = makeSSTable([
      { partitionKey: "user-1", value: "[TOMBSTONE]", timestamp: 1_000_000, isTombstone: true },
    ]);
    const onClose = vi.fn();

    render(<SSTableInspector sstable={sstable} onClose={onClose} />);

    expect(screen.getByText("[TOMBSTONE]")).toBeInTheDocument();
    const row = screen.getByText("[TOMBSTONE]").closest("tr");
    expect(row).toHaveStyle({ backgroundColor: "rgba(220, 38, 38, 0.06)" });
  });

  it("displays TTL and timestamp for each row", () => {
    const sstable = makeSSTable([
      {
        partitionKey: "session-1",
        value: "active",
        timestamp: 1_000_000,
        ttl: 60,
        expiresAt: 1_060_000,
      },
    ]);

    render(<SSTableInspector sstable={sstable} onClose={vi.fn()} />);

    expect(screen.getByText("60s")).toBeInTheDocument();
    expect(screen.getByText(new Date(1_000_000).toLocaleString())).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const sstable = makeSSTable([]);
    const onClose = vi.fn();

    render(<SSTableInspector sstable={sstable} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /close inspector/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked", () => {
    const sstable = makeSSTable([]);
    const onClose = vi.fn();

    const { container } = render(<SSTableInspector sstable={sstable} onClose={onClose} />);
    const backdrop = container.firstChild as HTMLElement;

    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
