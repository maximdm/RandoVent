import { useState } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { EventFeed } from '../components/EventFeed';
import { MatchStatsView } from '../components/MatchStatsView';
import { SimResult, runningScore } from '../engine';
import { useMatchPlayback } from '../hooks/useMatchPlayback';

interface Props {
  match: SimResult;
  onSummary: () => void;
  onNewMatch: () => void;
}

type Mode = 'INSTANT' | 'ACCELERATED';
type LiveView = 'feed' | 'stats';

// Self-contained Accelerated view: clock, running score, controls, and the
// progressively revealed feed. Kept as its own component so the playback hook is
// only mounted in Accelerated mode (React hooks rules).
function AcceleratedView({ match, onSummary, onNewMatch }: Props) {
  const { snapshot, status, pause, resume, reset, jumpToEnd } = useMatchPlayback(match);
  const [a, b] = runningScore(match, snapshot.revealed);
  const { teamAName, teamBName } = match.metadata as { teamAName: string; teamBName: string };
  const progress = snapshot.totalMinutes
    ? Math.min(1, snapshot.currentMinute / snapshot.totalMinutes)
    : 1;

  return (
    <View style={styles.container}>
      <Text style={styles.score}>
        {teamAName} {a} - {b} {teamBName}
      </Text>
      <Text style={styles.clock}>
        Match clock {Math.floor(snapshot.currentMinute)} / {snapshot.totalMinutes} ·{' '}
        {snapshot.revealedCount}/{snapshot.totalCount} events
      </Text>
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.feed}>
        <EventFeed events={snapshot.revealed} />
      </View>

      <View style={styles.controls}>
        {status === 'playing' ? (
          <Button title="Pause" onPress={pause} />
        ) : (
          <Button title="Resume" onPress={resume} disabled={status === 'finished'} />
        )}
        <Button title="Reset" onPress={reset} />
        <Button title="Skip" onPress={jumpToEnd} disabled={status === 'finished'} />
      </View>
    </View>
  );
}

export function LiveMatchScreen({ match, onSummary, onNewMatch }: Props) {
  const [mode, setMode] = useState<Mode>('INSTANT');
  const [liveView, setLiveView] = useState<LiveView>('feed');
  const [a, b] = runningScore(match, match.events);
  const { teamAName, teamBName, seed } = match.metadata as {
    teamAName: string;
    teamBName: string;
    seed?: number;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.score}>
        {teamAName} {a} - {b} {teamBName}
      </Text>
      <Text style={styles.seed}>Seed: {seed === undefined ? '—' : seed}</Text>

      <View style={styles.modeToggle}>
        <Button title="Instant" onPress={() => setMode('INSTANT')} />
        <Button title="Accelerated" onPress={() => setMode('ACCELERATED')} />
      </View>

      {liveView === 'stats' ? (
        <MatchStatsView match={match} />
      ) : mode === 'INSTANT' ? (
        <View style={styles.feed}>
          <EventFeed events={match.events} />
        </View>
      ) : (
        <AcceleratedView match={match} onSummary={onSummary} onNewMatch={onNewMatch} />
      )}

      <View style={styles.controls}>
        <Button title={liveView === 'stats' ? 'Feed' : 'Stats'} onPress={() => setLiveView(liveView === 'stats' ? 'feed' : 'stats')} />
        <Button title="Summary" onPress={onSummary} />
        <Button title="New Match" onPress={onNewMatch} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  score: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  seed: { fontSize: 13, color: '#777', textAlign: 'center', marginBottom: 8 },
  clock: { fontSize: 13, color: '#555', textAlign: 'center', marginBottom: 6 },
  progress: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: '#1565c0' },
  feed: { flex: 1 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
  },
  modeToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
});
