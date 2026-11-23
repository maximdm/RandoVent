import { Text, View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MatchEvent } from '../types';

interface EventFeedProps {
  events: MatchEvent[];
}

// High-volume play-by-play feed. FlashList (per agents.md §6) is required here
// because Instant mode can dump 150+ events at once; FlatList is the fallback.
export function EventFeed({ events }: EventFeedProps) {
  return (
    <FlashList
      data={events}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.minute}>{item.minute}'</Text>
          <Text style={styles.detail}>{item.detail}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  minute: { width: 44, fontWeight: '700', color: '#555' },
  detail: { flex: 1 },
});
