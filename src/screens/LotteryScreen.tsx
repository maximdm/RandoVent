import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { generateLottery, LotteryError } from '../engine';
import {
  savedSetsRepo,
  addSavedSet,
  replaceSavedSet,
  removeSavedSet,
  MAX_SAVED_SETS,
  SavedLotterySet,
} from '../storage/savedSets';
import {
  ScrollScreen,
  Card,
  Field,
  Input,
  Button,
  Segmented,
  SectionTitle,
  palette,
} from '../components/ui';

interface Props {
  onBack: () => void;
}

function BoolSegment({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Field label={label}>
      <Segmented
        options={[
          { label: 'On', value: 'on' },
          { label: 'Off', value: 'off' },
        ]}
        selected={value ? 'on' : 'off'}
        onSelect={(v) => onChange(v === 'on')}
      />
    </Field>
  );
}

export function LotteryScreen({ onBack }: Props) {
  const [count, setCount] = useState('6');
  const [min, setMin] = useState('1');
  const [max, setMax] = useState('49');
  const [sets, setSets] = useState('1');
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [sorted, setSorted] = useState(true);
  const [seed, setSeed] = useState('');
  const [result, setResult] = useState<string | string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [savedSets, setSavedSets] = useState<SavedLotterySet[]>([]);
  const [fullHint, setFullHint] = useState(false);

  useEffect(() => {
    let active = true;
    void savedSetsRepo.load().then((loaded) => {
      if (active) setSavedSets(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  const run = () => {
    setError(null);
    try {
      const out = generateLottery({
        count: Number(count),
        min: Number(min),
        max: Number(max),
        sets: Number(sets) || 1,
        allowDuplicates,
        sorted,
        seed: seed.trim() === '' ? undefined : Number(seed),
      });
      setResult(out);
    } catch (e) {
      setResult(null);
      setError(e instanceof LotteryError ? e.message : String(e));
    }
  };

  const persist = useCallback((next: SavedLotterySet[]) => {
    setSavedSets(next);
    void savedSetsRepo.saveAll(next);
  }, []);

  const lines = typeof result === 'string' ? [result] : result ?? [];

  const saveLine = (numbers: string) => {
    const { sets: next, full } = addSavedSet(savedSets, { numbers });
    setFullHint(full);
    if (!full) persist(next);
  };

  const replaceSlot = (id: string) => {
    if (lines.length === 0) return;
    persist(replaceSavedSet(savedSets, id, { numbers: lines[0] }));
  };

  const deleteSlot = (id: string) => {
    persist(removeSavedSet(savedSets, id));
    setFullHint(false);
  };

  const editSlot = (id: string, patch: Partial<Pick<SavedLotterySet, 'label' | 'numbers'>>) => {
    setSavedSets((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const clearAll = () => {
    persist([]);
    setFullHint(false);
  };

  return (
    <ScrollScreen>
      <SectionTitle>Lottery Generator</SectionTitle>

      <Card style={{ marginBottom: 14 }}>
        <View style={styles.grid2}>
          <View style={styles.cell}>
            <Field label="Count">
              <Input value={count} onChangeText={setCount} keyboardType="numeric" />
            </Field>
          </View>
          <View style={styles.cell}>
            <Field label="Sets">
              <Input value={sets} onChangeText={setSets} keyboardType="numeric" />
            </Field>
          </View>
          <View style={styles.cell}>
            <Field label="Min">
              <Input value={min} onChangeText={setMin} keyboardType="numeric" />
            </Field>
          </View>
          <View style={styles.cell}>
            <Field label="Max">
              <Input value={max} onChangeText={setMax} keyboardType="numeric" />
            </Field>
          </View>
        </View>
        <Field label="Seed" hint="Optional — blank = random">
          <Input value={seed} onChangeText={setSeed} keyboardType="numeric" placeholder="blank = random" />
        </Field>
        <BoolSegment label="Allow duplicates" value={allowDuplicates} onChange={setAllowDuplicates} />
        <BoolSegment label="Sorted" value={sorted} onChange={setSorted} />
        <View style={{ marginTop: 4 }}>
          <Button title="Generate" onPress={run} block />
        </View>
      </Card>

      {error && (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>⚠ {error}</Text>
        </Card>
      )}

      {result && (
        <Card style={{ marginBottom: 14 }}>
          <SectionTitle>Result</SectionTitle>
          {lines.map((line, i) => (
            <View key={i} style={styles.resultLine}>
              <Text style={styles.line}>{line}</Text>
              <Button title="Save" onPress={() => saveLine(line)} />
            </View>
          ))}
        </Card>
      )}

      <Card style={{ marginBottom: 14 }}>
        <View style={styles.notebookHeader}>
          <SectionTitle style={{ marginBottom: 0 }}>
            Saved Sets ({savedSets.length}/{MAX_SAVED_SETS})
          </SectionTitle>
          {savedSets.length > 0 && (
            <Button title="Clear all" onPress={clearAll} variant="ghost" />
          )}
        </View>

        {fullHint && (
          <Text style={styles.errorText}>
            Notebook is full ({MAX_SAVED_SETS}). Delete or replace a set to add more.
          </Text>
        )}

        {savedSets.length === 0 && !fullHint && (
          <Text style={styles.muted}>No saved sets yet — generate and tap Save.</Text>
        )}

        {savedSets.map((s) => (
          <View key={s.id} style={styles.savedRow}>
            <Input
              value={s.label}
              placeholder="Note / label"
              onChangeText={(t) => editSlot(s.id, { label: t })}
            />
            <View style={{ marginTop: 8 }}>
              <Input
                value={s.numbers}
                placeholder="03-12-27-..."
                onChangeText={(t) => editSlot(s.id, { numbers: t })}
              />
            </View>
            <View style={styles.savedActions}>
              <Button title="Save" onPress={() => persist(savedSets)} variant="secondary" />
              <Button title="Replace" onPress={() => replaceSlot(s.id)} variant="secondary" />
              <Button title="Delete" onPress={() => deleteSlot(s.id)} variant="danger" />
            </View>
          </View>
        ))}
      </Card>

      <Button title="Back" onPress={onBack} variant="ghost" block />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cell: { width: '48%' },
  resultLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  line: { fontSize: 17, fontFamily: 'monospace', letterSpacing: 1, flex: 1, marginRight: 8 },
  errorCard: { marginBottom: 14, borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  errorText: { color: palette.danger, fontWeight: '600' },
  muted: { color: '#94a3b8', fontStyle: 'italic' },
  notebookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  savedRow: {
    marginTop: 10,
    padding: 10,
    backgroundColor: palette.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  savedActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 6 },
});
