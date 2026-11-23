import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { SportKey } from '../engine';
import { ScrollScreen, Card, Button } from '../components/ui';
import { useTheme } from '../theme';

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
  { key: SportKey.HANDBALL, label: 'Handball', tag: '2 x 30 min · 7m', emoji: '🤾' },
  { key: SportKey.E_SOCCER, label: 'E-Soccer', tag: 'Virtual 90 min', emoji: '🎮' },
  { key: SportKey.E_SPORT, label: 'E-Sport', tag: 'Best of maps', emoji: '🕹️' },
];

// Choose a column count from the available width so the grid stays compact on
// phones (2-up), comfortable on small tablets, and airy on large screens — while
// a max-width container keeps cards from stretching absurdly wide on desktop/web.
function columnsForWidth(width: number): number {
  if (width >= 1024) return 5;
  if (width >= 768) return 4;
  if (width >= 520) return 3;
  return 2;
}

export function SportPickerScreen({ onPick, onBack }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const cols = columnsForWidth(width);
  const cellWidth = `${(100 / cols) - 2}%`; // 2% total reserved for the row gap

  return (
    <ScrollScreen>
      <View style={styles.gridWrap}>
        <View style={[styles.grid, { gap: 12 }]}>
          {SPORTS.map((s) => (
            <Card key={s.key} style={[styles.cell, { width: cellWidth }]}>
              <Text style={styles.emoji}>{s.emoji}</Text>
              <Text style={[styles.label, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
                {s.label}
              </Text>
              <Text style={[styles.tag, { color: theme.subtext }]} numberOfLines={1} ellipsizeMode="tail">
                {s.tag}
              </Text>
              <View style={styles.spacer} />
              <Button
                title="Select"
                onPress={() => onPick(s.key)}
                block
                accessibilityLabel={`Select ${s.label}`}
                accessibilityHint={s.tag}
              />
            </Card>
          ))}
        </View>
      </View>
      <View style={{ marginTop: 16 }}>
        <Button title="Back" onPress={onBack} variant="ghost" block />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  gridWrap: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  cell: {
    marginBottom: 12,
  },
  emoji: { fontSize: 30 },
  label: { fontSize: 17, fontWeight: '700', marginTop: 6 },
  tag: { fontSize:12, marginTop: 2 },
  spacer: { flex: 1, minHeight: 10 },
});
