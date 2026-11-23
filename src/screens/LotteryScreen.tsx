import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { generateLottery, LotteryError, randomSeed } from '../engine';
import {
  slipRepo,
  addSlipSet,
  removeSlipSet,
  rerollSlipSet,
  replaceSlipSet,
  MAX_SLIP_SETS,
  SlipSet,
  SlipSetConfig,
} from '../storage/slip';
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

function describe(config: SlipSetConfig): string {
  const dup = config.allowDuplicates ? 'repeats allowed' : 'unique';
  const sort = config.sorted ? 'sorted' : 'as drawn';
  return `${config.count} from ${config.min}–${config.max} · ${dup} · ${sort}`;
}

export function LotteryScreen({ onBack }: Props) {
  const [count, setCount] = useState('6');
  const [min, setMin] = useState('1');
  const [max, setMax] = useState('49');
  const [sets, setSets] = useState('1');
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [sorted, setSorted] = useState(true);
  const [seed, setSeed] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [slip, setSlip] = useState<SlipSet[]>([]);
  const [fullHint, setFullHint] = useState(false);

  useEffect(() => {
    let active = true;
    void slipRepo.load().then((loaded) => {
      if (active) setSlip(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist the whole slip (single source of truth on disk).
  const persist = useCallback((next: SlipSet[]) => {
    setSlip(next);
    void slipRepo.saveAll(next);
  }, []);

  const run = () => {
    setError(null);
    try {
      const cfg: SlipSetConfig = {
        count: Number(count),
        min: Number(min),
        max: Number(max),
        allowDuplicates,
        sorted,
      };
      const seedVal = seed.trim() === '' ? undefined : Number(seed);
      const out = generateLottery({ ...cfg, sets: Number(sets) || 1, seed: seedVal });
      const lines = typeof out === 'string' ? [out] : out;

      let next = slip;
      let full = false;
      for (const line of lines) {
        const res = addSlipSet(next, {
          numbers: line,
          config: cfg,
          seed: seedVal ?? randomSeed(),
        });
        if (res.full) {
          full = true;
          break;
        }
        next = res.sets;
      }
      persist(next);
      setFullHint(full);
      if (full) {
        setError(`Slip is full (${MAX_SLIP_SETS}). Reroll or delete a set to add more.`);
      }
    } catch (e) {
      setError(e instanceof LotteryError ? e.message : String(e));
    }
  };

  const reroll = (id: string) => {
    const next = rerollSlipSet(slip, id, (cfg) => {
      const s = randomSeed();
      const numbers = generateLottery({ ...cfg, sets: 1, seed: s }) as string;
      return { numbers, seed: s };
    });
    persist(next);
  };

  const deleteSlot = (id: string) => {
    persist(removeSlipSet(slip, id));
    setFullHint(false);
  };

  const editLabel = (id: string, label: string) => {
    persist(replaceSlipSet(slip, id, { label }));
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
            <Field label="Sets (1–10)">
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
          <Input
            value={seed}
            onChangeText={setSeed}
            keyboardType="numeric"
            placeholder="blank = random"
          />
        </Field>
        <BoolSegment label="Allow duplicates" value={allowDuplicates} onChange={setAllowDuplicates} />
        <BoolSegment label="Sorted" value={sorted} onChange={setSorted} />
        <View style={{ marginTop: 4 }}>
          <Button title="Add to Slip" onPress={run} block />
        </View>
      </Card>

      {error && (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>⚠ {error}</Text>
        </Card>
      )}

      <Card style={{ marginBottom: 14 }}>
        <View style={styles.slipHeader}>
          <SectionTitle style={{ marginBottom: 0 }}>
            Your Slip ({slip.length}/{MAX_SLIP_SETS})
          </SectionTitle>
          {slip.length > 0 && (
            <Button title="Clear all" onPress={clearAll} variant="ghost" />
          )}
        </View>

        {slip.length === 0 && (
          <Text style={styles.muted}>No sets yet — draw some numbers above to fill your slip.</Text>
        )}

        {slip.map((s) => (
          <View key={s.id} style={styles.slipRow}>
            <Input
              value={s.label}
              placeholder="Note / label"
              onChangeText={(t) => editLabel(s.id, t)}
            />
            <View style={{ marginTop: 8 }}>
              <Text style={styles.numbers}>{s.numbers}</Text>
            </View>
            <Text style={styles.conditions}>{describe(s.config)}</Text>
            <View style={styles.slipActions}>
              <View style={{ flex: 1 }}>
                <Button title="Reroll ↻" onPress={() => reroll(s.id)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Delete"
                  onPress={() => deleteSlot(s.id)}
                  variant="danger"
                />
              </View>
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
  errorCard: { marginBottom: 14, borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  errorText: { color: palette.danger, fontWeight: '600' },
  muted: { color: '#94a3b8', fontStyle: 'italic' },
  slipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slipRow: {
    marginTop: 12,
    padding: 12,
    backgroundColor: palette.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  numbers: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1,
    color: palette.text,
  },
  conditions: { fontSize: 12, color: palette.subtext, marginTop: 4 },
  slipActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
});
