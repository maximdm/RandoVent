import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SimResult, SportEventKind, computeMatchStats, STAT_LABELS } from '../engine';
import { useTheme } from '../theme';

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
  const theme = useTheme();
  return (
    <View style={[styles.table, { borderColor: theme.tableBorder }]}>
      <View style={[styles.tableHead, { backgroundColor: theme.tableHeadBg }]}>
        <Text style={[styles.cell, styles.cellLabel, { color: theme.textDim }]}> </Text>
        <Text style={[styles.cell, styles.cellTeam, { color: theme.text }]}>{teamAName}</Text>
        <Text style={[styles.cell, styles.cellTeam, { color: theme.text }]}>{teamBName}</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={[styles.tableRow, { borderColor: theme.tableRowBorder }]}>
          <Text style={[styles.cell, styles.cellLabel, { color: theme.textDim }]}>{r.label}</Text>
          <Text style={[styles.cell, styles.cellNum, { color: theme.text }]}>{r.a}</Text>
          <Text style={[styles.cell, styles.cellNum, { color: theme.text }]}>{r.b}</Text>
        </View>
      ))}
    </View>
  );
}

// The full set of stats blocks (match tallies, period/set breakdowns, tennis detail).
// Shared by the Summary screen and the live stats toggle.
export function MatchStatsSections({ match }: { match: SimResult }) {
  const theme = useTheme();
  const { teamAName, teamBName } = match.metadata as { teamAName: string; teamBName: string };
  const mstats = computeMatchStats(match);

  const statRows = (Object.keys(STAT_LABELS) as SportEventKind[])
    .map((k) => ({ label: STAT_LABELS[k] as string, a: mstats.countsA[k], b: mstats.countsB[k] }))
    .filter((r) => r.a > 0 || r.b > 0);

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Match Stats</Text>
      <StatTable teamAName={teamAName} teamBName={teamBName} rows={statRows} />

      {mstats.periods.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Period Breakdown</Text>
          <StatTable
            teamAName={teamAName}
            teamBName={teamBName}
            rows={mstats.periods.map((p) => ({ label: p.label, a: p.scoreA, b: p.scoreB }))}
          />
        </View>
      )}

      {mstats.sets.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Set Breakdown</Text>
          <StatTable
            teamAName={teamAName}
            teamBName={teamBName}
            rows={mstats.sets.map((s) => ({ label: s.label, a: s.scoreA, b: s.scoreB }))}
          />
        </View>
      )}

      {(mstats.tiebreaks > 0 || mstats.deuces > 0) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Tennis Detail</Text>
          <Text style={[styles.stat, { color: theme.textDim }]}>
            Tiebreaks: {mstats.tiebreaks} · Deuces: {mstats.deuces}
          </Text>
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
  stat: { fontSize: 16 },
  table: { borderWidth: 1, borderRadius: 6, overflow: 'hidden' },
  tableHead: { flexDirection: 'row', paddingVertical: 4 },
  tableRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  cell: { flex: 1, paddingHorizontal: 8, paddingVertical: 4, fontSize: 14 },
  cellLabel: { flex: 2 },
  cellTeam: { fontWeight: '700', textAlign: 'center' },
  cellNum: { textAlign: 'center', fontVariant: ['tabular-nums'] },
});
