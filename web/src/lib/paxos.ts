export interface PaxosState {
  promisedBallot: number;
  acceptedBallot: number | null;
  acceptedValue: string | null;
}

export function createPaxosState(): PaxosState {
  return { promisedBallot: 0, acceptedBallot: null, acceptedValue: null };
}

export function prepare(
  state: PaxosState,
  ballot: number
): { ok: boolean; currentValue: string | null } {
  if (ballot <= state.promisedBallot) {
    return { ok: false, currentValue: state.acceptedValue };
  }
  return { ok: true, currentValue: state.acceptedValue };
}

export function promise(state: PaxosState, ballot: number): PaxosState {
  if (ballot <= state.promisedBallot) return state;
  return { ...state, promisedBallot: ballot };
}

export function accept(state: PaxosState, ballot: number, _value: string): boolean {
  if (ballot < state.promisedBallot) return false;
  return true;
}

export function accepted(state: PaxosState, ballot: number, value: string): PaxosState {
  if (ballot < state.promisedBallot) return state;
  return { ...state, promisedBallot: ballot, acceptedBallot: ballot, acceptedValue: value };
}
