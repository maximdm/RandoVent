import { View, Text, StyleSheet, Button } from 'react-native';
import { SampleMatch } from '../types';

interface Props {
  match: SampleMatch;
  onBack: () => void;
}

export function MatchSummaryScreen({ match, onBack }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Match Summary</Text>
      <Text style={styles.score}>
        TeamA {match.homeGoals} - {match.awayGoals} TeamB
      </Text>
      <Text style={styles.stat}>Total events: {match.events.length}</Text>
      <Text style={styles.stat}>Goals: {match.homeGoals + match.awayGoals}</Text>
      <Button title="Back to Live" onPress={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  score: { fontSize: 20, textAlign: 'center' },
  stat: { fontSize: 16, color: '#444' },
});
