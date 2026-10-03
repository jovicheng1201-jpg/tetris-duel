import { PIECE_TYPES, type PieceType, type RandomState } from "./types";

export function createRandomState(seed: number): RandomState {
  const normalized = (Math.trunc(seed) >>> 0) || 0x6d2b79f5;
  return { seed: normalized, bag: [], bagIndex: 0 };
}

function nextUint32(state: RandomState): number {
  let value = state.seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.seed = value >>> 0;
  return state.seed;
}

function refillBag(state: RandomState): void {
  const bag = [...PIECE_TYPES];
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = nextUint32(state) % (index + 1);
    [bag[index], bag[swapIndex]] = [bag[swapIndex]!, bag[index]!];
  }
  state.bag = bag;
  state.bagIndex = 0;
}

export function drawPiece(state: RandomState): PieceType {
  if (state.bagIndex >= state.bag.length) refillBag(state);
  const piece = state.bag[state.bagIndex];
  state.bagIndex += 1;
  return piece ?? "T";
}

export function fillQueue(state: RandomState, queue: PieceType[], minimum = 6): void {
  while (queue.length < minimum) queue.push(drawPiece(state));
}

export function nextRandomInt(state: RandomState, upperExclusive: number): number {
  if (!Number.isInteger(upperExclusive) || upperExclusive <= 0) return 0;
  return nextUint32(state) % upperExclusive;
}
