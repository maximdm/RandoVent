import { View, Text } from 'react-native';
import { ScrollScreen, Card, Title, Subtitle, Button } from '../components/ui';

interface Props {
  onMatch: () => void;
  onLottery: () => void;
}

export function HomeScreen({ onMatch, onLottery }: Props) {
  return (
    <ScrollScreen contentContainerStyle={{ paddingTop: 40 }}>
      <View style={{ paddingHorizontal: 4, marginBottom: 20 }}>
        <Title>RandoVent</Title>
        <Subtitle>Multi-sport realistic match simulator &amp; lottery generator</Subtitle>
      </View>

      <Card style={{ marginBottom: 14 }}>
        <Text style={titleStyle}>⚽ Simulate Match</Text>
        <Text style={bodyStyle}>
          Pick from 9 sports, tune the rules, and watch a realistic, play-by-play
          match unfold with live stats and player leaders.
        </Text>
        <View style={{ marginTop: 12 }}>
          <Button title="Start a match" onPress={onMatch} block />
        </View>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <Text style={titleStyle}>🎲 Lottery Generator</Text>
        <Text style={bodyStyle}>
          Draw lucky number sets with custom ranges, duplicates, sorting and a
          seeded RNG. Save up to 10 sets in your notebook.
        </Text>
        <View style={{ marginTop: 12 }}>
          <Button title="Open lottery" onPress={onLottery} variant="secondary" block />
        </View>
      </Card>
    </ScrollScreen>
  );
}

const titleStyle = {
  fontSize: 19,
  fontWeight: '800' as const,
  color: '#0f172a',
};
const bodyStyle = {
  fontSize: 14,
  color: '#475569',
  marginTop: 6,
  lineHeight: 20,
};
