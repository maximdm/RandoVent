import { View, Text, StyleSheet } from 'react-native';
import { SimResult, computePlayerStats, topBy, PlayerStat } from '../engine';
import { MatchStatsSections } from '../components/MatchStatsView';
import { ScrollScreen, Card, Button, SectionTitle } from '../components/ui';
import { useTheme } from '../theme';

interface Props {
  match: SimResult;
  onBack: () => void;
  onReplay: () => void;
  onAllSports: () => void;
}

const WINNER_LABEL: Record<SimResult['winner'], string> = {
  A: 'Team A wins',
  B: 'Team B wins',
  DRAW: 'Draw',
};

function PlayerTable({ team, rows }: { team: string; rows: PlayerStat[] }) {
  const theme = useTheme();
  if (rows.length === 0) return null;
  return (
    <View style={styles.teamBlock}>
      <Text style={[styles.teamName, { color: theme.text }]}>{team}</Text>
      {rows.map((r) => (
        <Text key={r.name} style={[styles.playerRow, { color: theme.textDim }]}>
          {boxLine(r)}
        </Text>
      ))}
    </View>
  );
}

// Render a compact box-score line, only showing the categories a player actually
// accumulated (so sports without rebounds/kills don't show noise).
function boxLine(r: PlayerStat): string {
  const parts = [`${r.points} pts`];
  if (r.fouls > 0) parts.push(`${r.fouls} fouls`);
  if ((r.rebounds ?? 0) > 0) parts.push(`${r.rebounds} reb`);
  if ((r.assists ?? 0) > 0) parts.push(`${r.assists} ast`);
  if ((r.steals ?? 0) > 0) parts.push(`${r.steals} stl`);
  if ((r.blocks ?? 0) > 0) parts.push(`${r.blocks} blk`);
  if ((r.kills ?? 0) > 0) parts.push(`${r.kills} kills`);
  return `${r.name}: ${parts.join(', ')}`;
}

export function MatchSummaryScreen({ match, onBack, onReplay, onAllSports }: Props) {
  const theme = useTheme();
  const { teamAName, teamBName, seed } = match.metadata as {
    teamAName: string;
    teamBName: string;
    seed?: number;
  };
  const stats = computePlayerStats(match);
  const hasStats = stats.A.length > 0 || stats.B.length > 0;
  const hasFouls = stats.A.some((s) => s.fouls > 0) || stats.B.some((s) => s.fouls > 0);

  return (
    <ScrollScreen>
      <Card style={styles.hero}>
        <View style={styles.teamNames}>
          <Text style={[styles.teamName, { color: theme.teamA }]}>{teamAName}</Text>
          <Text style={[styles.teamName, { color: theme.subtext }]}>vs</Text>
          <Text style={[styles.teamName, { color: theme.teamB }]}>{teamBName}</Text>
        </View>
        <View style={styles.scoreRow}>
          <Text style={[styles.bigScore, { color: theme.teamA }]}>{match.scoreA}</Text>
          <Text style={[styles.scoreDash, { color: theme.subtext }]}>–</Text>
          <Text style={[styles.bigScore, { color: theme.teamB }]}>{match.scoreB}</Text>
        </View>
        <Text style={[styles.result, { color: theme.text }]}>{WINNER_LABEL[match.winner]}</Text>
        <Text style={[styles.meta, { color: theme.subtext }]}>
          Seed: {seed === undefined ? '—' : seed} · {match.events.length} events
        </Text>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <MatchStatsSections match={match} />
      </Card>

      {hasStats && (
        <Card style={{ marginBottom: 14 }}>
          <SectionTitle>Top Scorers</SectionTitle>
          <PlayerTable team={teamAName} rows={topBy(stats.A, 'points')} />
          <PlayerTable team={teamBName} rows={topBy(stats.B, 'points')} />
        </Card>
      )}

      {hasStats && hasFouls && (
        <Card style={{ marginBottom: 14 }}>
          <SectionTitle>Discipline Leaders (Fouls)</SectionTitle>
          <PlayerTable team={teamAName} rows={topBy(stats.A, 'fouls').filter((s) => s.fouls > 0)} />
          <PlayerTable team={teamBName} rows={topBy(stats.B, 'fouls').filter((s) => s.fouls > 0)} />
        </Card>
      )}

      <View style={{ gap: 10 }}>
        <Button title="Same Sport ↻" onPress={onReplay} block />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button title="All Sports" onPress={onAllSports} variant="secondary" />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Home" onPress={onBack} variant="secondary" />
          </View>
        </View>
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: 14, alignItems: 'center' },
  teamNames: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  teamName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  bigScore: { fontSize: 44, fontWeight: '800' },
  scoreDash: { fontSize: 32, color: '#94a3b8' },
  result: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 4 },
  meta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  teamBlock: { marginBottom: 10 },
  playerRow: { fontSize: 14, color: '#334155', paddingVertical: 2 },
});
