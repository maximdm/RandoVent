import { View, Text, StyleSheet, Button } from 'react-native';

interface Props {
  onStart: (seed: number) => void;
}

export function MatchSetupScreen({ onStart }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RandoVent</Text>
      <Text style={styles.subtitle}>Multi-Sport Realistic Match Simulator</Text>
      <Text style={styles.note}>
        Football (Instant). Leave blank for a random seed, or set one for a reproducible match.
      </Text>
      <Button title="Start Match" onPress={() => onStart(Date.now() % 2147483647)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 16, textAlign: 'center' },
  note: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 8 },
});
