import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import { SimResult, computePlayerStats, topBy, PlayerStat } from '../engine';
import { MatchStatsSections } from '../components/MatchStatsView';

interface Props {
  match: SimResult;
  onBack: () => void;
}

const WINNER_LABEL: Record<SimResult['winner'], string> = {
  A: 'Team A wins',
  B: 'Team B wins',
  DRAW: 'Draw',
};

export function MatchSummaryScreen({ match, onBack }: Props) {
  const { teamAName, teamBName, seed } = match.metadata as {
    teamAName: string;
    teamBName: string;
    seed?: number;
  };
  const stats = computePlayerStats(match);
  const hasStats = stats.A.length > 0 || stats.B.length > 0;
  const hasFouls = stats.A.some((s) => s.fouls > 0) || stats.B.some((s) => s.fouls > 0);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Match Summary</Text>
      <Text style={styles.score}>
        {teamAName} {match.scoreA} - {match.scoreB} {teamBName}
      </Text>
      <Text style={styles.stat}>Result: {WINNER_LABEL[match.winner]}</Text>
      <Text style={styles.stat}>Seed: {seed === undefined ? '—' : seed}</Text>
      <Text style={styles.stat}>Total events: {match.events.length}</Text>

      <View style={styles.section}>
        <MatchStatsSections match={match} />
      </View>

      {hasStats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Scorers</Text>
          <PlayerTable team={teamAName} rows={topBy(stats.A, 'points')} />
          <PlayerTable team={teamBName} rows={topBy(stats.B, 'points')} />
        </View>
      )}

      {hasStats && hasFouls && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discipline Leaders (Fouls)</Text>
          <PlayerTable team={teamAName} rows={topBy(stats.A, 'fouls').filter((s) => s.fouls > 0)} />
          <PlayerTable team={teamBName} rows={topBy(stats.B, 'fouls').filter((s) => s.fouls > 0)} />
        </View>
      )}

      <View style={styles.actions}>
        <Button title="Back to Live" onPress={onBack} />
      </View>
    </ScrollView>
  );
}

function PlayerTable({ team, rows }: { team: string; rows: PlayerStat[] }) {
  if (rows.length === 0) return null;
  return (
    <View style={styles.teamBlock}>
      <Text style={styles.teamName}>{team}</Text>
      {rows.map((r) => (
        <Text key={r.name} style={styles.playerRow}>
          {r.name}: {r.points} pts{hasFoulsRow(r) ? `, ${r.fouls} fouls` : ''}
        </Text>
      ))}
    </View>
  );
}

function hasFoulsRow(r: PlayerStat): boolean {
  return r.fouls > 0;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  score: { fontSize: 20, textAlign: 'center', marginBottom: 4 },
  stat: { fontSize: 16, color: '#444' },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  teamBlock: { marginBottom: 10 },
  teamName: { fontSize: 15, fontWeight: '600', color: '#1565c0' },
  playerRow: { fontSize: 14, color: '#333', paddingVertical: 2 },
  actions: { marginTop: 16 },
});
