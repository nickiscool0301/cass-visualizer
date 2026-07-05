import { describe, it, expect } from "vitest";
import { accept, createPaxosState, prepare, promise, accepted } from "../src/lib/paxos";

describe("paxos helpers", () => {
  it("accepts a higher ballot prepare", () => {
    const state = createPaxosState();
    expect(prepare(state, 1)).toEqual({ ok: true, currentValue: null });
  });

  it("rejects a lower or equal ballot prepare", () => {
    const state = promise(createPaxosState(), 10);
    expect(prepare(state, 5)).toEqual({ ok: false, currentValue: null });
    expect(prepare(state, 10)).toEqual({ ok: false, currentValue: null });
  });

  it("returns the currently accepted value during prepare", () => {
    let state = createPaxosState();
    state = promise(state, 5);
    state = accepted(state, 5, "alice");
    expect(prepare(state, 10)).toEqual({ ok: true, currentValue: "alice" });
  });

  it("accepts when ballot meets or exceeds promised ballot", () => {
    const state = promise(createPaxosState(), 5);
    expect(accept(state, 5, "bob")).toBe(true);
    expect(accept(state, 6, "bob")).toBe(true);
    expect(accept(state, 4, "bob")).toBe(false);
  });

  it("records accepted ballot and value", () => {
    let state = createPaxosState();
    state = promise(state, 5);
    state = accepted(state, 5, "alice");
    expect(state.acceptedBallot).toBe(5);
    expect(state.acceptedValue).toBe("alice");
  });
});
