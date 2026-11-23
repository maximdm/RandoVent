import { memo } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SimEvent } from '../engine';

interface EventFeedProps {
  events: SimEvent[];
}

// Key events get a bold badge + accent so goals/cards/big plays stand out.
const KEY_EVENTS = new Set<SimEvent['kind']>(['GOAL', 'RED_CARD', 'POINTS_3', 'SET_WIN']);

const Row = memo(function Row({ item }: { item: SimEvent }) {
  const isKey = KEY_EVENTS.has(item.kind);
  const accent = item.team === 'A' ? '#1565c0' : item.team === 'B' ? '#c62828' : '#555';
  const label = item.kind.replace(/_/g, ' ');
  return (
    <View style={styles.row}>
      <Text style={styles.minute}>{item.minute}'</Text>
      {isKey ? (
        <View style={[styles.badge, { backgroundColor: accent }]}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
      ) : (
        <Text style={[styles.kind, { color: accent }]}>{label}</Text>
      )}
      <Text style={styles.detail}>{item.detail}</Text>
    </View>
  );
});

// High-volume play-by-play feed. FlashList (per agents.md §6) is required here
// because Instant mode can dump 150+ events at once; FlatList is the fallback.
export function EventFeed({ events }: EventFeedProps) {
  return (
    <FlashList
      data={events}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <Row item={item} />}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    gap: 8,
  },
  minute: { width: 38, fontWeight: '700', color: '#444' },
  kind: { width: 96, fontWeight: '600', fontSize: 12 },
  badge: { width: 96, borderRadius: 4, paddingVertical: 2, paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 11, textAlign: 'center' },
  detail: { flex: 1, fontSize: 13 },
});
