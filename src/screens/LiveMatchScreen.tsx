import { View, Text, StyleSheet, Button } from 'react-native';
import { EventFeed } from '../components/EventFeed';
import { SimResult } from '../engine';

interface Props {
  match: SimResult;
  onSummary: () => void;
  onNewMatch: () => void;
}

export function LiveMatchScreen({ match, onSummary, onNewMatch }: Props) {
  const { teamAName, teamBName } = match.metadata as { teamAName: string; teamBName: string };
  return (
    <View style={styles.container}>
      <Text style={styles.score}>
        {teamAName} {match.scoreA} - {match.scoreB} {teamBName}
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
