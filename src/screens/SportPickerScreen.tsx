import { View, Text, StyleSheet } from 'react-native';
import { SportKey } from '../engine';
import { ScrollScreen, Card, Button } from '../components/ui';

interface Props {
  onPick: (sport: SportKey) => void;
  onBack: () => void;
}

const SPORTS: Array<{ key: SportKey; label: string; tag: string; emoji: string }> = [
  { key: SportKey.FOOTBALL, label: 'Football', tag: '11 v 11 · 90 min', emoji: '⚽' },
  { key: SportKey.TENNIS, label: 'Tennis', tag: 'Best of 3 / 5 sets', emoji: '🎾' },
  { key: SportKey.BASKETBALL, label: 'Basketball', tag: '4 quarters', emoji: '🏀' },
  { key: SportKey.HOCKEY, label: 'Ice Hockey', tag: '3 periods · shootout', emoji: '🏒' },
  { key: SportKey.VOLLEYBALL, label: 'Volleyball', tag: 'Rally · sets', emoji: '🏐' },
  { key: SportKey.TABLE_TENNIS, label: 'Table Tennis', tag: 'Best of 5 / 7', emoji: '🏓' },
  { key: SportKey.RUGBY, label: 'Rugby', tag: 'Tries & goals', emoji: '🏉' },
  { key: SportKey.E_SOCCER, label: 'E-Soccer', tag: 'Virtual 90 min', emoji: '🎮' },
  { key: SportKey.E_SPORT, label: 'E-Sport', tag: 'Best of maps', emoji: '🕹️' },
];

export function SportPickerScreen({ onPick, onBack }: Props) {
  return (
    <ScrollScreen>
      <View style={styles.grid}>
        {SPORTS.map((s) => (
          <Card key={s.key} style={styles.cell}>
            <Text style={styles.emoji}>{s.emoji}</Text>
            <Text style={styles.label}>{s.label}</Text>
            <Text style={styles.tag}>{s.tag}</Text>
            <View style={styles.spacer} />
            <Button title="Select" onPress={() => onPick(s.key)} block />
          </Card>
        ))}
      </View>
      <View style={{ marginTop: 16 }}>
        <Button title="Back" onPress={onBack} variant="ghost" block />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cell: {
    width: '48.5%',
    marginBottom: 12,
  },
  emoji: { fontSize: 30 },
  label: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginTop: 6 },
  tag: { fontSize: 12, color: '#64748b', marginTop: 2 },
  spacer: { flex: 1, minHeight: 10 },
});
