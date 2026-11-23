import { useState } from 'react';
import { View, Text } from 'react-native';
import { SportKey, MatchConfig } from '../engine';
import { useTheme } from '../theme';
import {
  ScrollScreen,
  Card,
  Field,
  Input,
  Segmented,
  Button,
  SectionTitle,
  SegmentedOption,
} from '../components/ui';

interface Props {
  sport: SportKey;
  onStart: (config: MatchConfig) => void;
  onBack: () => void;
}

// Generic segmented control bound to a typed value array (string or number).
function OptionSegment<T extends string | number>({
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
  const options: SegmentedOption<string>[] = values.map((v) => ({
    label: String(v),
    value: String(v),
  }));
  return (
    <Field label={label}>
      <Segmented
        options={options}
        selected={String(value)}
        onSelect={(s) => {
          const found = values.find((v) => String(v) === s);
          if (found) onSelect(found);
        }}
      />
    </Field>
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
  const theme = useTheme();
  const [teamAName, setTeamAName] = useState('TeamA');
  const [teamBName, setTeamBName] = useState('TeamB');
  const [seedText, setSeedText] = useState('');

  const [tennisFormat, setTennisFormat] = useState<'BO3' | 'BO5'>('BO3');
  const [quarterLength, setQuarterLength] = useState<10 | 12>(12);
  const [rugbyCode, setRugbyCode] = useState<'UNION' | 'LEAGUE'>('UNION');
  const [ttFormat, setTtFormat] = useState<'BO5' | 'BO7'>('BO5');
  const [sets, setSets] = useState<'BO3' | 'BO5'>('BO3');
  const [bestOf, setBestOf] = useState<1 | 3 | 5>(3);
  const [roundTarget, setRoundTarget] = useState<13 | 16>(13);

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
    <ScrollScreen>
      <SectionTitle>{SPORT_LABEL[sport]} — Match setup</SectionTitle>

      <Card style={{ marginBottom: 14 }}>
        <Field label="Team A name">
          <Input value={teamAName} onChangeText={setTeamAName} placeholder="Team A" />
        </Field>
        <Field label="Team B name">
          <Input value={teamBName} onChangeText={setTeamBName} placeholder="Team B" />
        </Field>
        <Field label="Seed" hint="Optional — leave blank for a random match">
          <Input
            value={seedText}
            onChangeText={setSeedText}
            placeholder="blank = random"
            keyboardType="numeric"
          />
        </Field>
      </Card>

      {(sport === SportKey.TENNIS ||
        sport === SportKey.BASKETBALL ||
        sport === SportKey.RUGBY ||
        sport === SportKey.TABLE_TENNIS ||
        sport === SportKey.VOLLEYBALL ||
        sport === SportKey.E_SPORT) && (
        <Card style={{ marginBottom: 14 }}>
          {sport === SportKey.TENNIS && (
            <OptionSegment
              label="Match format"
              value={tennisFormat}
              values={['BO3', 'BO5'] as const}
              onSelect={setTennisFormat}
            />
          )}
          {sport === SportKey.BASKETBALL && (
            <OptionSegment
              label="Quarter length (min)"
              value={quarterLength}
              values={[10, 12] as const}
              onSelect={setQuarterLength}
            />
          )}
          {sport === SportKey.RUGBY && (
            <OptionSegment
              label="Code"
              value={rugbyCode}
              values={['UNION', 'LEAGUE'] as const}
              onSelect={setRugbyCode}
            />
          )}
          {sport === SportKey.TABLE_TENNIS && (
            <OptionSegment
              label="Match format"
              value={ttFormat}
              values={['BO5', 'BO7'] as const}
              onSelect={setTtFormat}
            />
          )}
          {sport === SportKey.VOLLEYBALL && (
            <OptionSegment
              label="Sets"
              value={sets}
              values={['BO3', 'BO5'] as const}
              onSelect={setSets}
            />
          )}
          {sport === SportKey.E_SPORT && (
            <>
              <OptionSegment
                label="Best of (maps)"
                value={bestOf}
                values={[1, 3, 5] as const}
                onSelect={setBestOf}
              />
              <OptionSegment
                label="Round target"
                value={roundTarget}
                values={[13, 16] as const}
                onSelect={setRoundTarget}
              />
            </>
          )}
        </Card>
      )}

      {(sport === SportKey.FOOTBALL || sport === SportKey.HOCKEY || sport === SportKey.E_SOCCER) && (
        <Card style={{ marginBottom: 14 }}>
          <Text style={{ color: theme.subtext, fontSize: 14 }}>
            No extra options — standard match format.
          </Text>
        </Card>
      )}

      <View style={{ gap: 10, marginTop: 4 }}>
        <Button
          title="Simulate"
          onPress={() => onStart(buildConfig())}
          block
          disabled={seedText.trim() !== '' && !validSeed}
        />
        <Button title="Back" onPress={onBack} variant="ghost" block />
      </View>
    </ScrollScreen>
  );
}
