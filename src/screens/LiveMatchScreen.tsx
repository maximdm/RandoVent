import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EventFeed } from '../components/EventFeed';
import { MatchStatsView } from '../components/MatchStatsView';
import { SimResult, runningScore } from '../engine';
import { useMatchPlayback } from '../hooks/useMatchPlayback';
import { Screen, Card, Button, Segmented, palette } from '../components/ui';

interface Props {
  match: SimResult;
  onSummary: () => void;
  onReplay: () => void;
  onAllSports: () => void;
}

type Mode = 'INSTANT' | 'ACCELERATED';
type LiveView = 'feed' | 'stats';

// Accelerated view: clock, running score, controls and the progressively revealed feed.
interface AcceleratedProps {
  match: SimResult;
  onSummary: () => void;
}
function AcceleratedView({ match, onSummary }: AcceleratedProps) {
  const { snapshot, status, pause, resume, reset, jumpToEnd } = useMatchPlayback(match);
  const [a, b] = runningScore(match, snapshot.revealed);
  const { teamAName, teamBName } = match.metadata as { teamAName: string; teamBName: string };
  const progress = snapshot.totalMinutes
    ? Math.min(1, snapshot.currentMinute / snapshot.totalMinutes)
    : 1;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.scoreRow}>
        <Text style={[styles.bigScore, { color: palette.teamA }]}>{a}</Text>
        <Text style={styles.scoreDash}>–</Text>
        <Text style={[styles.bigScore, { color: palette.teamB }]}>{b}</Text>
      </View>
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
        <Button title="Reset" onPress={reset} variant="secondary" />
        <Button title="Skip" onPress={jumpToEnd} variant="secondary" disabled={status === 'finished'} />
      </View>
    </View>
  );
}

export function LiveMatchScreen({ match, onSummary, onReplay, onAllSports }: Props) {
  const [mode, setMode] = useState<Mode>('INSTANT');
  const [liveView, setLiveView] = useState<LiveView>('feed');
  const [a, b] = runningScore(match, match.events);
  const { teamAName, teamBName, seed } = match.metadata as {
    teamAName: string;
    teamBName: string;
    seed?: number;
  };

  return (
    <Screen>
      <Card style={styles.header}>
        <View style={styles.teamNames}>
          <Text style={[styles.teamName, { color: palette.teamA }]}>{teamAName}</Text>
          <Text style={styles.teamName}>vs</Text>
          <Text style={[styles.teamName, { color: palette.teamB }]}>{teamBName}</Text>
        </View>
        <View style={styles.scoreRow}>
          <Text style={[styles.bigScore, { color: palette.teamA }]}>{a}</Text>
          <Text style={styles.scoreDash}>–</Text>
          <Text style={[styles.bigScore, { color: palette.teamB }]}>{b}</Text>
        </View>
        <Text style={styles.seed}>Seed: {seed === undefined ? '—' : seed}</Text>
      </Card>

      <Segmented
        options={[
          { label: 'Instant', value: 'INSTANT' },
          { label: 'Accelerated', value: 'ACCELERATED' },
        ]}
        selected={mode}
        onSelect={(v) => setMode(v as Mode)}
      />

      <Segmented
        options={[
          { label: 'Feed', value: 'feed' },
          { label: 'Stats', value: 'stats' },
        ]}
        selected={liveView}
        onSelect={(v) => setLiveView(v as LiveView)}
      />

      <View style={styles.content}>
        {liveView === 'stats' ? (
          <MatchStatsView match={match} />
        ) : mode === 'INSTANT' ? (
          <View style={styles.feed}>
            <EventFeed events={match.events} />
          </View>
        ) : (
          <AcceleratedView match={match} onSummary={onSummary} />
        )}
      </View>

      <View style={styles.bottomControls}>
        <View style={{ flex: 1 }}>
          <Button title="Same Sport ↻" onPress={onReplay} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Summary" onPress={onSummary} variant="secondary" />
        </View>
      </View>
      <View style={[styles.bottomControls, { marginTop: 10 }]}>
        <Button title="All Sports" onPress={onAllSports} variant="secondary" block />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 12, alignItems: 'center' },
  teamNames: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  teamName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  bigScore: { fontSize: 40, fontWeight: '800' },
  scoreDash: { fontSize: 30, color: '#94a3b8' },
  seed: { fontSize: 13, color: '#64748b', marginTop: 4 },
  clock: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 6 },
  progress: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: palette.primary },
  feed: { flex: 1 },
  content: { flex: 1, marginTop: 12 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6 },
  bottomControls: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
