import { SimEvent } from './EventTypes';

// Events that mark the end of a period/match must always appear after any
// in-match event, even if their `minute` is numerically smaller (e.g. a football
// stoppage-time goal at minute 93 sorts after the minute-90 full-time marker, and
// a basketball overtime at minute 53 after the minute-48 regulation end).
const END_PRIORITY: Partial<Record<SimEvent['kind'], number>> = {
  PERIOD_END: 1,
  QUARTER_END: 1,
  OVERTIME: 1,
  MATCH_END: 2,
};

export function sortEvents(events: SimEvent[]): void {
  events.sort((a, b) => {
    const pa = END_PRIORITY[a.kind] ?? 0;
    const pb = END_PRIORITY[b.kind] ?? 0;
    if (pa !== pb) return pa - pb;
    return a.minute - b.minute || a.id.localeCompare(b.id);
  });
}
