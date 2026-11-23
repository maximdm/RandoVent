import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { MatchSetupScreen } from './src/screens/MatchSetupScreen';
import { LiveMatchScreen } from './src/screens/LiveMatchScreen';
import { MatchSummaryScreen } from './src/screens/MatchSummaryScreen';
import { LotteryScreen } from './src/screens/LotteryScreen';
import { getEngine, SportKey, MatchConfig, SimResult } from './src/engine';

function simulateFootball(seed: number): SimResult {
  const config: MatchConfig = { sport: SportKey.FOOTBALL, mode: 'INSTANT', seed };
  return getEngine(SportKey.FOOTBALL).simulate(config);
}

type TopView = 'home' | 'match' | 'lottery';
type MatchView = 'setup' | 'live' | 'summary';

export default function App() {
  const [view, setView] = useState<TopView>('home');
  const [matchView, setMatchView] = useState<MatchView>('setup');
  const [match, setMatch] = useState<SimResult | null>(null);

  const start = (seed: number) => {
    setMatch(simulateFootball(seed));
    setMatchView('live');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      {view === 'home' && (
        <HomeScreen
          onMatch={() => {
            setMatchView('setup');
            setView('match');
          }}
          onLottery={() => setView('lottery')}
        />
      )}

      {view === 'match' && matchView === 'setup' && (
        <MatchSetupScreen onStart={start} onBack={() => setView('home')} />
      )}
      {view === 'match' && matchView === 'live' && match && (
        <LiveMatchScreen
          match={match}
          onSummary={() => setMatchView('summary')}
          onNewMatch={() => start(Date.now() % 2147483647)}
        />
      )}
      {view === 'match' && matchView === 'summary' && match && (
        <MatchSummaryScreen match={match} onBack={() => setView('home')} />
      )}

      {view === 'lottery' && <LotteryScreen onBack={() => setView('home')} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
