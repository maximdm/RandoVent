import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import { MatchSetupScreen } from './src/screens/MatchSetupScreen';
import { LiveMatchScreen } from './src/screens/LiveMatchScreen';
import { MatchSummaryScreen } from './src/screens/MatchSummaryScreen';
import { FootballEngine, SportKey, MatchConfig, SimResult } from './src/engine';

const engine = new FootballEngine();

function simulateFootball(seed: number): SimResult {
  const config: MatchConfig = {
    sport: SportKey.FOOTBALL,
    mode: 'INSTANT',
    seed,
  };
  return engine.simulate(config);
}

type Screen = 'setup' | 'live' | 'summary';

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup');
  const [match, setMatch] = useState<SimResult | null>(null);

  const start = (seed: number) => {
    setMatch(simulateFootball(seed));
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
          onNewMatch={() => start(Date.now() % 2147483647)}
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
