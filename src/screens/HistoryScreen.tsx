import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Share, Clipboard } from 'react-native';
import { ScrollScreen, Card, Button, SectionTitle } from '../components/ui';
import { useTheme } from '../theme';
import { SPORT_LABEL } from '../engine';
import {
  historyRepo,
  addMatch,
  removeMatch,
  clearHistory,
  MatchRecord,
} from '../storage/matchHistory';

interface Props {
  onBack: () => void;
  onReplay: (record: MatchRecord) => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function winnerLabel(w: MatchRecord['winner'], record: MatchRecord): string {
  if (w === 'DRAW') return 'Draw';
  const meta = record.config.participants;
  const name = w === 'A' ? meta?.teamAName ?? 'Team A' : meta?.teamBName ?? 'Team B';
  return `${name} wins`;
}

export function HistoryScreen({ onBack, onReplay }: Props) {
  const theme = useTheme();
  const [records, setRecords] = useState<MatchRecord[]>([]);

  useEffect(() => {
    let active = true;
    void historyRepo.load().then((loaded) => {
      if (active) setRecords(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  const commit = (next: MatchRecord[]) => {
    setRecords(next);
    void historyRepo.saveAll(next);
  };

  const deleteOne = (record: MatchRecord) => {
    Alert.alert('Delete match', 'Remove this match from history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => commit(removeMatch(records, record.id)) },
    ]);
  };

  const clearAll = () => {
    if (records.length === 0) return;
    Alert.alert('Clear history', `Delete all ${records.length} match record(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => commit(clearHistory()) },
    ]);
  };

  const historyToText = (): string => {
    if (records.length === 0) return 'No matches recorded yet.';
    const lines = records.map((r) => {
      const a = r.config.participants?.teamAName ?? 'Team A';
      const b = r.config.participants?.teamBName ?? 'Team B';
      return `${SPORT_LABEL[r.sport] ?? r.sport}: ${a} ${r.scoreA} – ${r.scoreB} ${b} (${winnerLabel(r.winner, r)})`;
    });
    return ['RandoVent — Match History', '='.repeat(28), ...lines].join('\n');
  };

  const exportHistory = (): void => {
    if (records.length === 0) return;
    Clipboard.setString(historyToText());
    Alert.alert('Copied', `History (${records.length} match record(s)) copied to clipboard.`);
  };

  const shareHistory = async (): Promise<void> => {
    if (records.length === 0) return;
    try {
      await Share.share({ message: historyToText(), title: 'RandoVent Match History' });
    } catch {
      // Share sheet dismissed or unavailable — nothing to do.
    }
  };

  return (
    <ScrollScreen>
      <SectionTitle>
        Match History ({records.length})
      </SectionTitle>

      {records.length === 0 && (
        <Card>
          <Text style={[styles.muted, { color: theme.muted }]}>
            No matches yet. Simulate a match and it will be recorded here so you can replay it later.
          </Text>
        </Card>
      )}

      {records.map((record) => (
        <Card key={record.id} style={styles.row}>
          <View style={styles.rowTop}>
            <Text style={[styles.sport, { color: theme.text }]}>
              {SPORT_LABEL[record.sport] ?? record.sport}
            </Text>
            <Text style={[styles.date, { color: theme.subtext }]}>
              {formatDate(record.createdAt)}
            </Text>
          </View>
          <Text style={[styles.score, { color: theme.text }]}>
            {record.config.participants?.teamAName ?? 'Team A'} {record.scoreA}
            {' – '}
            {record.scoreB} {record.config.participants?.teamBName ?? 'Team B'}
          </Text>
          <Text style={[styles.winner, { color: theme.primary }]}>
            {winnerLabel(record.winner, record)}
          </Text>
          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Button title="Replay ↻" onPress={() => onReplay(record)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Delete" onPress={() => deleteOne(record)} variant="danger" />
            </View>
          </View>
        </Card>
      ))}

      {records.length > 0 && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title="Export 📋" onPress={exportHistory} variant="secondary" accessibilityLabel="Copy history to clipboard" />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Share ↗" onPress={shareHistory} variant="secondary" accessibilityLabel="Share history" />
            </View>
          </View>
          <Button title="Clear all" onPress={clearAll} variant="ghost" block accessibilityLabel="Clear all match history" />
        </View>
      )}

      <Button title="Back" onPress={onBack} variant="ghost" block accessibilityLabel="Back to home screen" />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  muted: { fontStyle: 'italic' },
  row: { marginBottom: 14 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sport: { fontSize: 16, fontWeight: '800' },
  date: { fontSize: 12 },
  score: { fontSize: 18, fontWeight: '700' },
  winner: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
});
