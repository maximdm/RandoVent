import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import { SimResult, SportEventKind, computePlayerStats, computeMatchStats, STAT_LABELS, topBy, PlayerStat } from '../engine';

interface Props {
  match: SimResult;
  onBack: () => void;
}

const WINNER_LABEL: Record<SimResult['winner'], string> = {
  A: 'Team A wins',
  B: 'Team B wins',
  DRAW: 'Draw',
};

// Rows of a (label, teamA, teamB) table.
function StatTable({ teamAName, teamBName, rows }: { teamAName: string; teamBName: string; rows: Array<{ label: string; a: number; b: number }> }) {
  if (rows.length === 0) return null;
  return (
    <View style={styles.table}>
      <View style={styles.tableHead}>
        <Text style={[styles.cell, styles.cellLabel]}> </Text>
        <Text style={[styles.cell, styles.cellTeam]}>{teamAName}</Text>
        <Text style={[styles.cell, styles.cellTeam]}>{teamBName}</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={styles.tableRow}>
          <Text style={[styles.cell, styles.cellLabel]}>{r.label}</Text>
          <Text style={[styles.cell, styles.cellNum]}>{r.a}</Text>
          <Text style={[styles.cell, styles.cellNum]}>{r.b}</Text>
        </View>
      ))}
    </View>
  );
}

export function MatchSummaryScreen({ match, onBack }: Props) {
  const { teamAName, teamBName } = match.metadata as { teamAName: string; teamBName: string };
  const stats = computePlayerStats(match);
  const mstats = computeMatchStats(match);
  const hasStats = stats.A.length > 0 || stats.B.length > 0;
  const hasFouls = stats.A.some((s) => s.fouls > 0) || stats.B.some((s) => s.fouls > 0);

  // Stat rows: every labelled event kind with at least one team > 0.
  const statRows = (Object.keys(STAT_LABELS) as SportEventKind[])
    .map((k) => ({ label: STAT_LABELS[k] as string, a: mstats.countsA[k], b: mstats.countsB[k] }))
    .filter((r) => r.a > 0 || r.b > 0);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Match Summary</Text>
      <Text style={styles.score}>
        {teamAName} {match.scoreA} - {match.scoreB} {teamBName}
      </Text>
      <Text style={styles.stat}>Result: {WINNER_LABEL[match.winner]}</Text>
      <Text style={styles.stat}>Total events: {match.events.length}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Match Stats</Text>
        <StatTable teamAName={teamAName} teamBName={teamBName} rows={statRows} />
      </View>

      {mstats.periods.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Period Breakdown</Text>
          <StatTable teamAName={teamAName} teamBName={teamBName} rows={mstats.periods.map((p) => ({ label: p.label, a: p.scoreA, b: p.scoreB }))} />
        </View>
      )}

      {mstats.sets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Set Breakdown</Text>
          <StatTable teamAName={teamAName} teamBName={teamBName} rows={mstats.sets.map((s) => ({ label: s.label, a: s.scoreA, b: s.scoreB }))} />
        </View>
      )}

      {(mstats.tiebreaks > 0 || mstats.deuces > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tennis Detail</Text>
          <Text style={styles.stat}>Tiebreaks: {mstats.tiebreaks} · Deuces: {mstats.deuces}</Text>
        </View>
      )}

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
  table: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 6, overflow: 'hidden' },
  tableHead: { flexDirection: 'row', backgroundColor: '#eef2f7', paddingVertical: 4 },
  tableRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  cell: { flex: 1, paddingHorizontal: 8, paddingVertical: 4, fontSize: 14 },
  cellLabel: { flex: 2, color: '#444' },
  cellTeam: { fontWeight: '700', textAlign: 'center' },
  cellNum: { textAlign: 'center', fontVariant: ['tabular-nums'] },
  teamBlock: { marginBottom: 10 },
  teamName: { fontSize: 15, fontWeight: '600', color: '#1565c0' },
  playerRow: { fontSize: 14, color: '#333', paddingVertical: 2 },
  actions: { marginTop: 16 },
});
