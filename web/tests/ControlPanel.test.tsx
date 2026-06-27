import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ControlPanel } from "../src/components/ControlPanel";
import { createInitialCluster } from "../src/state/clusterReducer";

describe("ControlPanel", () => {
  it("renders controls and dispatches add node", () => {
    const dispatch = vi.fn();
    const cluster = createInitialCluster();
    render(<ControlPanel cluster={cluster} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole("button", { name: /add node/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "ADD_NODE" });
  });
});
