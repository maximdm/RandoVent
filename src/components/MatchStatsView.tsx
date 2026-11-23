import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SimResult, SportEventKind, computeMatchStats, STAT_LABELS } from '../engine';

// A (label, teamA, teamB) table. Pure — no scrolling, so it can be embedded in any
// parent scroll container.
export function StatTable({
  teamAName,
  teamBName,
  rows,
}: {
  teamAName: string;
  teamBName: string;
  rows: Array<{ label: string; a: number; b: number }>;
}) {
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

// The full set of stats blocks (match tallies, period/set breakdowns, tennis detail).
// Shared by the Summary screen and the live stats toggle.
export function MatchStatsSections({ match }: { match: SimResult }) {
  const { teamAName, teamBName } = match.metadata as { teamAName: string; teamBName: string };
  const mstats = computeMatchStats(match);

  const statRows = (Object.keys(STAT_LABELS) as SportEventKind[])
    .map((k) => ({ label: STAT_LABELS[k] as string, a: mstats.countsA[k], b: mstats.countsB[k] }))
    .filter((r) => r.a > 0 || r.b > 0);

  return (
    <View>
      <Text style={styles.sectionTitle}>Match Stats</Text>
      <StatTable teamAName={teamAName} teamBName={teamBName} rows={statRows} />

      {mstats.periods.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Period Breakdown</Text>
          <StatTable
            teamAName={teamAName}
            teamBName={teamBName}
            rows={mstats.periods.map((p) => ({ label: p.label, a: p.scoreA, b: p.scoreB }))}
          />
        </View>
      )}

      {mstats.sets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Set Breakdown</Text>
          <StatTable
            teamAName={teamAName}
            teamBName={teamBName}
            rows={mstats.sets.map((s) => ({ label: s.label, a: s.scoreA, b: s.scoreB }))}
          />
        </View>
      )}

      {(mstats.tiebreaks > 0 || mstats.deuces > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tennis Detail</Text>
          <Text style={styles.stat}>Tiebreaks: {mstats.tiebreaks} · Deuces: {mstats.deuces}</Text>
        </View>
      )}
    </View>
  );
}

// Standalone, scrollable stats view (used by the live toggle).
export function MatchStatsView({ match }: { match: SimResult }) {
  return (
    <ScrollView style={styles.container}>
      <MatchStatsSections match={match} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  stat: { fontSize: 16, color: '#444' },
  table: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 6, overflow: 'hidden' },
  tableHead: { flexDirection: 'row', backgroundColor: '#eef2f7', paddingVertical: 4 },
  tableRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  cell: { flex: 1, paddingHorizontal: 8, paddingVertical: 4, fontSize: 14 },
  cellLabel: { flex: 2, color: '#444' },
  cellTeam: { fontWeight: '700', textAlign: 'center' },
  cellNum: { textAlign: 'center', fontVariant: ['tabular-nums'] },
});
