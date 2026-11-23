import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { generateLottery, LotteryError, randomSeed } from '../engine';
import {
  slipRepo,
  createSlip,
  renameSlip,
  setSlipCollapsed,
  removeSlip,
  addSetToSlip,
  replaceSetInSlip,
  removeSetFromSlip,
  rerollSetInSlip,
  MAX_SLIPS,
  MAX_SLIP_SETS,
  Slip,
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
} from '../components/ui';
import { useTheme } from '../theme';

interface Props {
  onBack: () => void;
}

const NEW = '__new__';

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
  const theme = useTheme();
  const [count, setCount] = useState('6');
  const [min, setMin] = useState('1');
  const [max, setMax] = useState('49');
  const [sets, setSets] = useState('1');
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [sorted, setSorted] = useState(true);
  const [seed, setSeed] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [slips, setSlips] = useState<Slip[]>([]);
  const [target, setTarget] = useState<string>(NEW);
  const [fullHint, setFullHint] = useState(false);

  useEffect(() => {
    let active = true;
    void slipRepo.load().then((loaded) => {
      if (active) setSlips(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  const commit = (next: Slip[]) => {
    setSlips(next);
    void slipRepo.saveAll(next);
  };

  // The slip new sets should be added to (a real id, or NEW to create one).
  const effectiveTarget = target === NEW || slips.some((s) => s.id === target)
    ? target
    : slips[0]?.id ?? NEW;

  const run = () => {
    setError(null);
    setFullHint(false);
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

      let next = slips;
      let newId: string | null = null;
      if (effectiveTarget === NEW) {
        const res = createSlip(next);
        if (res.full) {
          setError(`Slip limit reached (${MAX_SLIPS}). Delete a slip to add more.`);
          setFullHint(true);
          return;
        }
        next = res.slips;
        newId = res.created!.id;
      }
      const slipId = newId ?? effectiveTarget;

      let full = false;
      for (const line of lines) {
        const r = addSetToSlip(next, slipId, {
          numbers: line,
          config: cfg,
          seed: seedVal ?? randomSeed(),
        });
        next = r.slips;
        if (r.full) {
          full = true;
          break;
        }
      }
      commit(next);
      if (newId) {
        setTarget(newId);
      }
      if (full) {
        setError(`That slip is full (${MAX_SLIP_SETS}). Reroll or delete a set.`);
        setFullHint(true);
      }
    } catch (e) {
      setError(e instanceof LotteryError ? e.message : String(e));
    }
  };

  const newSlip = () => {
    const res = createSlip(slips);
    if (res.full) {
      setError(`Slip limit reached (${MAX_SLIPS}). Delete a slip to add more.`);
      setFullHint(true);
      return;
    }
    commit(res.slips);
    const id = res.created!.id;
    setTarget(id);
  };

  const toggleCollapse = (id: string) => {
    const slip = slips.find((s) => s.id === id);
    if (!slip) return;
    commit(setSlipCollapsed(slips, id, !slip.collapsed));
  };

  const confirmDeleteSlip = (slip: Slip) => {
    Alert.alert(
      'Delete slip',
      `Delete “${slip.name}” and its ${slip.sets.length} set(s)? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            commit(removeSlip(slips, slip.id));
            if (target === slip.id) setTarget(NEW);
          },
        },
      ],
    );
  };

  const reroll = (slipId: string, setId: string) => {
    commit(
      rerollSetInSlip(slips, slipId, setId, (cfg) => {
        const s = randomSeed();
        const numbers = generateLottery({ ...cfg, sets: 1, seed: s }) as string;
        return { numbers, seed: s };
      }),
    );
  };

  const deleteSet = (slipId: string, setId: string) => {
    commit(removeSetFromSlip(slips, slipId, setId));
  };

  const confirmDeleteSet = (slip: Slip, set: SlipSet) => {
    Alert.alert('Delete set', `Delete this set (“${set.label}”: ${set.numbers})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteSet(slip.id, set.id),
      },
    ]);
  };

  const editLabel = (slipId: string, setId: string, label: string) => {
    commit(replaceSetInSlip(slips, slipId, setId, { label }));
  };

  const renameSlipById = (id: string, name: string) => {
    commit(renameSlip(slips, id, name));
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

        <Field label="Add to slip">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {slips.map((s) => (
              <Chip
                key={s.id}
                label={s.name}
                active={effectiveTarget === s.id}
                onPress={() => setTarget(s.id)}
              />
            ))}
            <Chip label="＋ New" active={effectiveTarget === NEW} onPress={() => setTarget(NEW)} />
          </ScrollView>
        </Field>

        <View style={{ marginTop: 4 }}>
          <Button title="Generate & Add" onPress={run} block />
        </View>
      </Card>

      {error && (
        <Card
          style={[
            styles.errorCard,
            { borderColor: theme.dangerBorder, backgroundColor: theme.dangerBg },
          ]}
        >
          <Text style={[styles.errorText, { color: theme.danger }]}>⚠ {error}</Text>
        </Card>
      )}

      <Card style={{ marginBottom: 14 }}>
        <View style={styles.slipHeader}>
          <SectionTitle style={{ marginBottom: 0 }}>
            Your Slips ({slips.length}/{MAX_SLIPS})
          </SectionTitle>
          <Button title="＋ New Slip" onPress={newSlip} variant="ghost" />
        </View>

        {slips.length === 0 && (
          <Text style={[styles.muted, { color: theme.muted }]}>
            No slips yet — generate a set above (it creates a new slip) or tap “＋ New Slip”.
          </Text>
        )}

        {slips.map((slip) => {
          const isOpen = !slip.collapsed;
          return (
            <View
              key={slip.id}
              style={[styles.slipCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
            >
              <View style={styles.slipTop}>
                <Pressable
                  onPress={() => toggleCollapse(slip.id)}
                  hitSlop={8}
                  style={styles.chevron}
                >
                  <Text style={[styles.chevronText, { color: theme.subtext }]}>{isOpen ? '▼' : '▶'}</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Input
                    value={slip.name}
                    placeholder="Slip name"
                    onChangeText={(t) => renameSlipById(slip.id, t)}
                  />
                </View>
                <Text style={[styles.countBadge, { color: theme.subtext }]}>
                  {slip.sets.length}/{MAX_SLIP_SETS}
                </Text>
                <Pressable
                  onPress={() => confirmDeleteSlip(slip)}
                  hitSlop={8}
                  style={styles.trash}
                >
                  <Text style={styles.trashText}>🗑</Text>
                </Pressable>
              </View>

              {isOpen && (
                <View style={styles.slipBody}>
                  {slip.sets.length === 0 && (
                    <Text style={[styles.muted, { color: theme.muted }]}>
                      Empty — add sets from the generator above.
                    </Text>
                  )}
                  {slip.sets.map((s: SlipSet) => (
                    <View
                      key={s.id}
                      style={[styles.setRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    >
                      <Input
                        value={s.label}
                        placeholder="Note / label"
                        onChangeText={(t) => editLabel(slip.id, s.id, t)}
                      />
                      <View style={{ marginTop: 8 }}>
                        <Text style={[styles.numbers, { color: theme.text }]}>{s.numbers}</Text>
                      </View>
                      <Text style={[styles.conditions, { color: theme.subtext }]}>
                        {describe(s.config)}
                      </Text>
                      <View style={styles.setActions}>
                        <View style={{ flex: 1 }}>
                          <Button title="Reroll ↻" onPress={() => reroll(slip.id, s.id)} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            title="Delete"
                            onPress={() => confirmDeleteSet(slip, s)}
                            variant="danger"
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </Card>

      <Button title="Back" onPress={onBack} variant="ghost" block />
    </ScrollScreen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: theme.chipBg, borderColor: theme.border },
        active && { backgroundColor: theme.primary, borderColor: theme.primary },
        pressed && styles.chipPressed,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: theme.chipText },
          active && styles.chipTextActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid2: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: { width: '48%' },
  errorCard: { marginBottom: 14 },
  errorText: { fontWeight: '600' },
  muted: { fontStyle: 'italic' },
  slipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chips: { flexGrow: 0, marginVertical: 4 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  chipActive: {},
  chipPressed: { opacity: 0.8 },
  chipText: { fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  slipCard: {
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  slipTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chevron: { paddingHorizontal: 4 },
  chevronText: { fontSize: 14 },
  countBadge: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 34,
    textAlign: 'center',
  },
  trash: { paddingHorizontal: 4 },
  trashText: { fontSize: 16 },
  slipBody: { marginTop: 10 },
  setRow: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  numbers: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  conditions: { fontSize: 12, marginTop: 4 },
  setActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
});
