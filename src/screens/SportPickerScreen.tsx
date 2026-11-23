import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import { SportKey } from '../engine';

interface Props {
  onPick: (sport: SportKey) => void;
  onBack: () => void;
}

const SPORTS: Array<{ key: SportKey; label: string }> = [
  { key: SportKey.FOOTBALL, label: 'Football' },
  { key: SportKey.TENNIS, label: 'Tennis' },
  { key: SportKey.BASKETBALL, label: 'Basketball' },
  { key: SportKey.HOCKEY, label: 'Ice Hockey' },
  { key: SportKey.VOLLEYBALL, label: 'Volleyball' },
  { key: SportKey.TABLE_TENNIS, label: 'Table Tennis' },
  { key: SportKey.RUGBY, label: 'Rugby' },
  { key: SportKey.E_SOCCER, label: 'E-Soccer' },
  { key: SportKey.E_SPORT, label: 'E-Sport' },
];

export function SportPickerScreen({ onPick, onBack }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a Sport</Text>
      <ScrollView style={styles.list}>
        {SPORTS.map((s) => (
          <View key={s.key} style={styles.row}>
            <Button title={s.label} onPress={() => onPick(s.key)} />
          </View>
        ))}
      </ScrollView>
      <Button title="Back" onPress={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  list: { flex: 1 },
  row: { marginVertical: 4 },
});
