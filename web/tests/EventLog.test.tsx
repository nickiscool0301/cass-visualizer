import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventLog } from "../src/components/EventLog";

describe("EventLog", () => {
  it("renders events", () => {
    const events = [
      { id: "e1", timestamp: Date.now(), message: "Node added" },
    ];
    render(<EventLog events={events} />);
    expect(screen.getByText(/node added/i)).toBeInTheDocument();
  });
});
