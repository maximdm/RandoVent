import { View, Text, StyleSheet, Button } from 'react-native';

interface Props {
  onMatch: () => void;
  onLottery: () => void;
}

export function HomeScreen({ onMatch, onLottery }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RandoVent</Text>
      <Text style={styles.subtitle}>Multi-Sport Realistic Match Simulator</Text>
      <View style={styles.buttons}>
        <Button title="Simulate Match" onPress={onMatch} />
        <View style={styles.gap} />
        <Button title="Lottery Generator" onPress={onLottery} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  title: { fontSize: 30, fontWeight: '700' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 16, textAlign: 'center' },
  buttons: { width: 260 },
  gap: { height: 12 },
});
