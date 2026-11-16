// Deterministic "randomness": the same album renders the same tilts and tapes every time, in the preview and the PDF.
export function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}

/** A value in [0, 1) derived from the seed and a salt. */
export function unit(seed: string, salt = "") {
  let state = hashString(`${seed}:${salt}`) || 1;
  state = Math.imul(state ^ (state >>> 15), 2246822507);
  state = Math.imul(state ^ (state >>> 13), 3266489909);
  return ((state ^ (state >>> 16)) >>> 0) / 4294967296;
}

export function pick<T>(items: readonly T[], seed: string, salt = "") {
  return items[Math.floor(unit(seed, salt) * items.length)];
}
