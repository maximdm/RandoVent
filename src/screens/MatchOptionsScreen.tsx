import { useState } from 'react';
import { View, Text, StyleSheet, Button, TextInput, ScrollView } from 'react-native';
import { SportKey, MatchConfig } from '../engine';

interface Props {
  sport: SportKey;
  onStart: (config: MatchConfig) => void;
  onBack: () => void;
}

// Cycles through a fixed list of allowed values (e.g. BO3/BO5) via a single tap.
function CycleButton<T extends string | number>({
  label,
  value,
  values,
  onSelect,
}: {
  label: string;
  value: T;
  values: T[];
  onSelect: (v: T) => void;
}) {
  const idx = values.indexOf(value);
  const next = values[(idx + 1) % values.length];
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Button title={`${String(value)}  ▸  ${String(next)}`} onPress={() => onSelect(next)} />
    </View>
  );
}

const SPORT_LABEL: Record<SportKey, string> = {
  [SportKey.FOOTBALL]: 'Football',
  [SportKey.TENNIS]: 'Tennis',
  [SportKey.BASKETBALL]: 'Basketball',
  [SportKey.HOCKEY]: 'Ice Hockey',
  [SportKey.VOLLEYBALL]: 'Volleyball',
  [SportKey.TABLE_TENNIS]: 'Table Tennis',
  [SportKey.RUGBY]: 'Rugby',
  [SportKey.E_SOCCER]: 'E-Soccer',
  [SportKey.E_SPORT]: 'E-Sport',
};

export function MatchOptionsScreen({ sport, onStart, onBack }: Props) {
  const [teamAName, setTeamAName] = useState('TeamA');
  const [teamBName, setTeamBName] = useState('TeamB');
  const [seedText, setSeedText] = useState('');

  // Per-sport option state (only the relevant one is used when building config).
  const [tennisFormat, setTennisFormat] = useState<'BO3' | 'BO5'>('BO3');
  const [quarterLength, setQuarterLength] = useState<10 | 12>(12);
  const [rugbyCode, setRugbyCode] = useState<'UNION' | 'LEAGUE'>('UNION');
  const [ttFormat, setTtFormat] = useState<'BO5' | 'BO7'>('BO5');
  const [sets, setSets] = useState<'BO3' | 'BO5'>('BO3');
  const [bestOf, setBestOf] = useState<1 | 3 | 5>(3);
  const [roundTarget, setRoundTarget] = useState<13 | 16>(13);

  // Blank seed => a random match each time. A typed non-negative integer is honoured
  // for reproducible results.
  const trimmed = seedText.trim();
  const parsedSeed = trimmed === '' ? undefined : Number(trimmed);
  const validSeed = parsedSeed === undefined || (Number.isInteger(parsedSeed) && parsedSeed >= 0);

  const buildConfig = (): MatchConfig => {
    const participants = { teamAName, teamBName };
    const base = {
      sport,
      mode: 'INSTANT' as const,
      ...(parsedSeed !== undefined ? { seed: parsedSeed } : {}),
      participants,
    };
    switch (sport) {
      case SportKey.TENNIS:
        return { ...base, options: { matchFormat: tennisFormat } } as MatchConfig;
      case SportKey.BASKETBALL:
        return { ...base, options: { quarterLength } } as MatchConfig;
      case SportKey.RUGBY:
        return { ...base, options: { code: rugbyCode } } as MatchConfig;
      case SportKey.TABLE_TENNIS:
        return { ...base, options: { matchFormat: ttFormat } } as MatchConfig;
      case SportKey.VOLLEYBALL:
        return { ...base, options: { sets } } as MatchConfig;
      case SportKey.E_SPORT:
        return { ...base, options: { bestOf, roundTarget } } as MatchConfig;
      default:
        return base as MatchConfig;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{SPORT_LABEL[sport]}</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Team A name</Text>
        <TextInput style={styles.input} value={teamAName} onChangeText={setTeamAName} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Team B name</Text>
        <TextInput style={styles.input} value={teamBName} onChangeText={setTeamBName} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Seed (optional — leave blank for a random match)</Text>
        <TextInput
          style={styles.input}
          value={seedText}
          onChangeText={setSeedText}
          keyboardType="numeric"
          placeholder="blank = random"
        />
      </View>

      {sport === SportKey.TENNIS && (
        <CycleButton label="Match format" value={tennisFormat} values={['BO3', 'BO5'] as const} onSelect={setTennisFormat} />
      )}
      {sport === SportKey.BASKETBALL && (
        <CycleButton label="Quarter length (min)" value={quarterLength} values={[10, 12] as const} onSelect={setQuarterLength} />
      )}
      {sport === SportKey.RUGBY && (
        <CycleButton label="Code" value={rugbyCode} values={['UNION', 'LEAGUE'] as const} onSelect={setRugbyCode} />
      )}
      {sport === SportKey.TABLE_TENNIS && (
        <CycleButton label="Match format" value={ttFormat} values={['BO5', 'BO7'] as const} onSelect={setTtFormat} />
      )}
      {sport === SportKey.VOLLEYBALL && (
        <CycleButton label="Sets" value={sets} values={['BO3', 'BO5'] as const} onSelect={setSets} />
      )}
      {sport === SportKey.E_SPORT && (
        <>
          <CycleButton label="Best of (maps)" value={bestOf} values={[1, 3, 5] as const} onSelect={setBestOf} />
          <CycleButton label="Round target" value={roundTarget} values={[13, 16] as const} onSelect={setRoundTarget} />
        </>
      )}
      {sport === SportKey.FOOTBALL && (
        <Text style={styles.note}>No extra options — standard 90-minute match.</Text>
      )}
      {sport === SportKey.HOCKEY && (
        <Text style={styles.note}>No extra options — 3 x 20-min periods (shootout if tied).</Text>
      )}
      {sport === SportKey.E_SOCCER && (
        <Text style={styles.note}>No extra options — virtual 90-minute match.</Text>
      )}

      <View style={styles.actions}>
        <Button
          title="Simulate"
          onPress={() => onStart(buildConfig())}
          disabled={seedText.trim() !== '' && !validSeed}
        />
        <Button title="Back" onPress={onBack} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  field: { marginVertical: 8 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
  },
  note: { fontStyle: 'italic', color: '#666', marginVertical: 8 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, marginBottom: 24 },
});
