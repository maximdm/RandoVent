import { View, Text, StyleSheet, Button } from 'react-native';

interface Props {
  onStart: () => void;
}

export function MatchSetupScreen({ onStart }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RandoVent</Text>
      <Text style={styles.subtitle}>Multi-Sport Realistic Match Simulator</Text>
      <Button title="Start Match" onPress={onStart} />
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
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
});
