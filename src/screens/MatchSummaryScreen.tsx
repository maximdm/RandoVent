import { View, Text, StyleSheet, Share, Clipboard, Alert } from 'react-native';
import { SimResult, computePlayerStats, topBy, PlayerStat } from '../engine';
import { SPORT_LABEL } from '../engine';
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
      <Text style={[styles.teamName, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
        {team}
      </Text>
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
  if ((r.saves ?? 0) > 0) parts.push(`${r.saves} sv`);
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

  const matchToText = (): string => {
    const sport = SPORT_LABEL[match.sport as keyof typeof SPORT_LABEL] ?? match.sport;
    const result = WINNER_LABEL[match.winner];
    return [
      'RandoVent — Match Result',
      `${sport}`,
      `${teamAName} ${match.scoreA} – ${match.scoreB} ${teamBName}`,
      result,
      `Seed: ${seed === undefined ? '—' : seed} · ${match.events.length} events`,
    ].join('\n');
  };

  const copyResult = (): void => {
    Clipboard.setString(matchToText());
    Alert.alert('Copied', 'Match result copied to clipboard.');
  };

  const shareResult = async (): Promise<void> => {
    try {
      await Share.share({ message: matchToText(), title: `${teamAName} vs ${teamBName}` });
    } catch {
      // Share sheet dismissed or unavailable — nothing to do.
    }
  };

  return (
    <ScrollScreen>
      <Card style={styles.hero}>
        <View style={styles.teamNames}>
          <Text style={[styles.teamName, { color: theme.teamA }]} numberOfLines={1} ellipsizeMode="tail">
            {teamAName}
          </Text>
          <Text style={[styles.teamName, { color: theme.subtext }]}>vs</Text>
          <Text style={[styles.teamName, { color: theme.teamB }]} numberOfLines={1} ellipsizeMode="tail">
            {teamBName}
          </Text>
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
        <Button title="Same Sport ↻" onPress={onReplay} block accessibilityLabel="Replay same sport with a new random seed" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button title="Share ↗" onPress={shareResult} variant="secondary" accessibilityLabel="Share match result" />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Copy 📋" onPress={copyResult} variant="secondary" accessibilityLabel="Copy match result to clipboard" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button title="All Sports" onPress={onAllSports} variant="secondary" accessibilityLabel="Back to sport picker" />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Home" onPress={onBack} variant="secondary" accessibilityLabel="Back to home screen" />
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
