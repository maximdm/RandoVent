import { View, Text, StyleSheet, Button } from 'react-native';
import { SimResult } from '../engine';

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
  const { teamAName, teamBName } = match.metadata as { teamAName: string; teamBName: string };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Match Summary</Text>
      <Text style={styles.score}>
        {teamAName} {match.scoreA} - {match.scoreB} {teamBName}
      </Text>
      <Text style={styles.stat}>Result: {WINNER_LABEL[match.winner]}</Text>
      <Text style={styles.stat}>Total events: {match.events.length}</Text>
      <Text style={styles.stat}>Goals: {match.scoreA + match.scoreB}</Text>
      <Button title="Back to Live" onPress={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  score: { fontSize: 20, textAlign: 'center' },
  stat: { fontSize: 16, color: '#444' },
});
