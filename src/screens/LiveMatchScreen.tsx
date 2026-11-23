import { View, Text, StyleSheet, Button } from 'react-native';
import { EventFeed } from '../components/EventFeed';
import { SampleMatch } from '../types';

interface Props {
  match: SampleMatch;
  onSummary: () => void;
  onNewMatch: () => void;
}

export function LiveMatchScreen({ match, onSummary, onNewMatch }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.score}>
        TeamA {match.homeGoals} - {match.awayGoals} TeamB
      </Text>
      <View style={styles.feed}>
        <EventFeed events={match.events} />
      </View>
      <View style={styles.controls}>
        <Button title="Summary" onPress={onSummary} />
        <Button title="New Match" onPress={onNewMatch} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  score: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  feed: { flex: 1 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
});
