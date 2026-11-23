import { View, Text } from 'react-native';
import { ScrollScreen, Card, Title, Subtitle, Button, Segmented } from '../components/ui';
import { useTheme, useThemeControls } from '../theme';

interface Props {
  onMatch: () => void;
  onLottery: () => void;
}

export function HomeScreen({ onMatch, onLottery }: Props) {
  const theme = useTheme();
  const { mode, setMode } = useThemeControls();
  return (
    <ScrollScreen contentContainerStyle={{ paddingTop: 40 }}>
      <View style={{ paddingHorizontal: 4, marginBottom: 20 }}>
        <Title>RandoVent</Title>
        <Subtitle>Multi-sport realistic match simulator &amp; lottery generator</Subtitle>
      </View>

      <Card style={{ marginBottom: 14 }}>
        <Text style={[titleStyle, { color: theme.text }]}>⚽ Simulate Match</Text>
        <Text style={[bodyStyle, { color: theme.textDim }]}>
          Pick from 9 sports, tune the rules, and watch a realistic, play-by-play
          match unfold with live stats and player leaders.
        </Text>
        <View style={{ marginTop: 12 }}>
          <Button title="Start a match" onPress={onMatch} block />
        </View>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <Text style={[titleStyle, { color: theme.text }]}>🎲 Lottery Generator</Text>
        <Text style={[bodyStyle, { color: theme.textDim }]}>
          Draw lucky number sets with custom ranges, duplicates, sorting and a
          seeded RNG. Organise them into named, collapsible slips.
        </Text>
        <View style={{ marginTop: 12 }}>
          <Button title="Open lottery" onPress={onLottery} variant="secondary" block />
        </View>
      </Card>

      <Card>
        <Text style={[bodyStyle, { color: theme.subtext, marginBottom: 8 }]}>Appearance</Text>
        <Segmented
          options={[
            { label: 'System', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ]}
          selected={mode}
          onSelect={(v) => setMode(v as 'system' | 'light' | 'dark')}
        />
      </Card>
    </ScrollScreen>
  );
}

const titleStyle = {
  fontSize: 19,
  fontWeight: '800' as const,
};
const bodyStyle = {
  fontSize: 14,
  marginTop: 6,
  lineHeight: 20,
};
