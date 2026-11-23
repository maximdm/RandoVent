import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Button, ScrollView, Switch } from 'react-native';
import { generateLottery, LotteryError } from '../engine';
import {
  savedSetsRepo,
  addSavedSet,
  replaceSavedSet,
  removeSavedSet,
  MAX_SAVED_SETS,
  SavedLotterySet,
} from '../storage/savedSets';

interface Props {
  onBack: () => void;
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

  // Load any previously saved notebook on mount.
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
    <View style={styles.container}>
      <Text style={styles.title}>Lottery Generator</Text>
      <ScrollView style={styles.form}>
        <Text style={styles.label}>Count</Text>
        <TextInput style={styles.input} keyboardType="number-pad" value={count} onChangeText={setCount} />
        <Text style={styles.label}>Min</Text>
        <TextInput style={styles.input} keyboardType="number-pad" value={min} onChangeText={setMin} />
        <Text style={styles.label}>Max</Text>
        <TextInput style={styles.input} keyboardType="number-pad" value={max} onChangeText={setMax} />
        <Text style={styles.label}>Sets</Text>
        <TextInput style={styles.input} keyboardType="number-pad" value={sets} onChangeText={setSets} />

        <View style={styles.row}>
          <Text style={styles.label}>Allow duplicates</Text>
          <Switch value={allowDuplicates} onValueChange={setAllowDuplicates} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Sorted</Text>
          <Switch value={sorted} onValueChange={setSorted} />
        </View>

        <Text style={styles.label}>Seed (optional)</Text>
        <TextInput style={styles.input} keyboardType="number-pad" value={seed} onChangeText={setSeed} />

        <Button title="Generate" onPress={run} />

        {error && <Text style={styles.error}>⚠ {error}</Text>}

        {result && (
          <View style={styles.result}>
            <Text style={styles.resultTitle}>Result</Text>
            {lines.map((line, i) => (
              <View key={i} style={styles.resultLine}>
                <Text style={styles.line}>{line}</Text>
                <View style={styles.lineActions}>
                  <Button title="Save" onPress={() => saveLine(line)} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Saved notebook */}
        <View style={styles.notebook}>
          <View style={styles.notebookHeader}>
            <Text style={styles.resultTitle}>
              Saved Sets ({savedSets.length}/{MAX_SAVED_SETS})
            </Text>
            {savedSets.length > 0 && <Button title="Clear all" onPress={clearAll} />}
          </View>

          {fullHint && (
            <Text style={styles.error}>
              Notebook is full ({MAX_SAVED_SETS}). Delete or replace a set to add more.
            </Text>
          )}

          {savedSets.length === 0 && (
            <Text style={styles.muted}>No saved sets yet — generate and tap Save.</Text>
          )}

          {savedSets.map((s) => (
            <View key={s.id} style={styles.savedRow}>
              <TextInput
                style={styles.noteInput}
                value={s.label}
                placeholder="Note / label"
                onChangeText={(t) => editSlot(s.id, { label: t })}
              />
              <TextInput
                style={styles.numbersInput}
                value={s.numbers}
                placeholder="03-12-27-..."
                onChangeText={(t) => editSlot(s.id, { numbers: t })}
              />
              <View style={styles.savedActions}>
                <Button title="Save" onPress={() => persist(savedSets)} />
                <Button title="Replace" onPress={() => replaceSlot(s.id)} />
                <Button title="Delete" onPress={() => deleteSlot(s.id)} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <Button title="Back" onPress={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  form: { flex: 1 },
  label: { fontSize: 13, color: '#555', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  error: { color: '#c62828', marginTop: 12, fontWeight: '600' },
  muted: { color: '#777', marginTop: 8, fontStyle: 'italic' },
  result: { marginTop: 16, padding: 12, backgroundColor: '#f1f5f9', borderRadius: 8 },
  resultTitle: { fontWeight: '700', marginBottom: 6 },
  resultLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  line: { fontSize: 18, fontFamily: 'monospace', letterSpacing: 1 },
  lineActions: { marginLeft: 8 },
  notebook: { marginTop: 20, padding: 12, backgroundColor: '#fafafa', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  notebookHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  savedRow: { marginBottom: 12, padding: 8, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    marginBottom: 4,
  },
  numbersInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 16,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  savedActions: { flexDirection: 'row', justifyContent: 'space-around' },
});
