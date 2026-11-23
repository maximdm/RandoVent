import { useCallback, useEffect, useRef, useState } from 'react';
import { SimResult } from '../engine';
import { MatchPlayback, PlaybackSnapshot, PlaybackStatus } from '../engine/playback';

const TICK_MS = 100;

// Drives Accelerated playback: advances a match clock at `minutePerSecond`
// (default 2, per M4) and exposes Pause/Resume/Reset. The underlying SimResult is
// generated once, so the final revealed log matches Instant mode exactly.
export function useMatchPlayback(sim: SimResult, minutePerSecond = 2) {
  const playbackRef = useRef(new MatchPlayback(sim, minutePerSecond));
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<PlaybackStatus>('playing');
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot>(
    playbackRef.current.snapshot(0, 'playing'),
  );

  useEffect(() => {
    if (status !== 'playing') return;
    const id = setInterval(() => setElapsed((prev) => prev + TICK_MS / 1000), TICK_MS);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    const finished =
      status === 'playing' && elapsed >= playbackRef.current.durationSeconds;
    const nextStatus: PlaybackStatus = finished ? 'finished' : status;
    setSnapshot(playbackRef.current.snapshot(elapsed, nextStatus));
    if (finished) setStatus('finished');
  }, [elapsed, status]);

  const pause = useCallback(() => setStatus((s) => (s === 'playing' ? 'paused' : s)), []);
  const resume = useCallback(() => setStatus((s) => (s === 'paused' ? 'playing' : s)), []);
  const reset = useCallback(() => {
    setElapsed(0);
    setStatus('playing');
  }, []);
  const jumpToEnd = useCallback(() => {
    setElapsed(playbackRef.current.durationSeconds);
    setStatus('finished');
  }, []);

  return { snapshot, status, pause, resume, reset, jumpToEnd };
}
