import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, ScrollView, Switch } from 'react-native';
import { generateLottery, LotteryError } from '../engine';

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
            {Array.isArray(result) ? (
              result.map((line, i) => (
                <Text key={i} style={styles.line}>
                  {line}
                </Text>
              ))
            ) : (
              <Text style={styles.line}>{result}</Text>
            )}
          </View>
        )}
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
  result: { marginTop: 16, padding: 12, backgroundColor: '#f1f5f9', borderRadius: 8 },
  resultTitle: { fontWeight: '700', marginBottom: 6 },
  line: { fontSize: 18, fontFamily: 'monospace', letterSpacing: 1 },
});
