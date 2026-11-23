// Zero-padded id factory. Ids sort lexically in the same order they were created
// (e.g. "e000009" < "e000010"), which the event sort relies on for events that
// share a minute. Without padding, "e9" < "e10" would be false.
export function createIdFactory(prefix: string): () => string {
  let n = 0;
  return () => `${prefix}${String(n++).padStart(6, '0')}`;
}
