import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { SportPickerScreen } from './src/screens/SportPickerScreen';
import { MatchOptionsScreen } from './src/screens/MatchOptionsScreen';
import { LiveMatchScreen } from './src/screens/LiveMatchScreen';
import { MatchSummaryScreen } from './src/screens/MatchSummaryScreen';
import { LotteryScreen } from './src/screens/LotteryScreen';
import { getEngine, SportKey, MatchConfig, SimResult } from './src/engine';

function simulate(config: MatchConfig): SimResult {
  return getEngine(config.sport).simulate(config);
}

// A fresh random 32-bit seed, so a new match without an explicit seed differs every time.
function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

type TopView = 'home' | 'pick' | 'options' | 'match' | 'lottery';
type MatchView = 'live' | 'summary';

export default function App() {
  const [view, setView] = useState<TopView>('home');
  const [selectedSport, setSelectedSport] = useState<SportKey>(SportKey.FOOTBALL);
  const [matchView, setMatchView] = useState<MatchView>('live');
  const [match, setMatch] = useState<SimResult | null>(null);

  const start = (config: MatchConfig) => {
    const seed = config.seed ?? randomSeed();
    const sim = simulate({ ...config, seed });
    // Record the seed actually used so the result is reproducible from the UI.
    setMatch({ ...sim, metadata: { ...sim.metadata, seed } });
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
        <SportPickerScreen
          onPick={(sport) => {
            setSelectedSport(sport);
            setView('options');
          }}
          onBack={() => setView('home')}
        />
      )}

      {view === 'options' && (
        <MatchOptionsScreen
          sport={selectedSport}
          onStart={start}
          onBack={() => setView('pick')}
        />
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
