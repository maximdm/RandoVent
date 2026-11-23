import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import { MatchSetupScreen } from './src/screens/MatchSetupScreen';
import { LiveMatchScreen } from './src/screens/LiveMatchScreen';
import { MatchSummaryScreen } from './src/screens/MatchSummaryScreen';
import { createRng, poisson } from './src/engine/core/Distributions';
import { MatchEvent, SampleMatch } from './src/types';

// Demo match generator. Replace with a real sport engine (M1–M3) that consumes
// a MatchConfig; this only exercises the seeded PRNG + Poisson helpers end-to-end.
function generateSampleMatch(seed = 12345): SampleMatch {
  const rng = createRng(seed);
  const homeGoals = poisson(1.4, rng);
  const awayGoals = poisson(1.2, rng);
  const events: MatchEvent[] = [];
  for (let i = 0; i < homeGoals; i++) {
    events.push({
      id: `h${i}`,
      minute: 10 + Math.floor(rng() * 80),
      type: 'GOAL',
      detail: `TeamA goal — PlayerTeamANo${7 + Math.floor(rng() * 5)}`,
    });
  }
  for (let i = 0; i < awayGoals; i++) {
    events.push({
      id: `a${i}`,
      minute: 10 + Math.floor(rng() * 80),
      type: 'GOAL',
      detail: `TeamB goal — PlayerTeamBNo${7 + Math.floor(rng() * 5)}`,
    });
  }
  events.sort((a, b) => a.minute - b.minute);
  return { homeGoals, awayGoals, events };
}

type Screen = 'setup' | 'live' | 'summary';

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup');
  const [match, setMatch] = useState<SampleMatch | null>(null);

  const start = () => {
    setMatch(generateSampleMatch());
    setScreen('live');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      {screen === 'setup' && <MatchSetupScreen onStart={start} />}
      {screen === 'live' && match && (
        <LiveMatchScreen
          match={match}
          onSummary={() => setScreen('summary')}
          onNewMatch={start}
        />
      )}
      {screen === 'summary' && match && (
        <MatchSummaryScreen match={match} onBack={() => setScreen('live')} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
