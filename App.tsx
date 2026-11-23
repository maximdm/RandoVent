import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { SportPickerScreen } from './src/screens/SportPickerScreen';
import { LiveMatchScreen } from './src/screens/LiveMatchScreen';
import { MatchSummaryScreen } from './src/screens/MatchSummaryScreen';
import { LotteryScreen } from './src/screens/LotteryScreen';
import { getEngine, defaultMatchConfig, SportKey, SimResult } from './src/engine';

function simulate(sport: SportKey, seed: number): SimResult {
  return getEngine(sport).simulate(defaultMatchConfig(sport, seed));
}

type TopView = 'home' | 'pick' | 'match' | 'lottery';
type MatchView = 'live' | 'summary';

export default function App() {
  const [view, setView] = useState<TopView>('home');
  const [matchView, setMatchView] = useState<MatchView>('live');
  const [match, setMatch] = useState<SimResult | null>(null);

  const start = (sport: SportKey) => {
    setMatch(simulate(sport, Date.now() % 2147483647));
    setMatchView('live');
    setView('match');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      {view === 'home' && (
        <HomeScreen
          onMatch={() => setView('pick')}
          onLottery={() => setView('lottery')}
        />
      )}

      {view === 'pick' && (
        <SportPickerScreen onPick={start} onBack={() => setView('home')} />
      )}

      {view === 'match' && matchView === 'live' && match && (
        <LiveMatchScreen
          match={match}
          onSummary={() => setMatchView('summary')}
          onNewMatch={() => setView('pick')}
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
