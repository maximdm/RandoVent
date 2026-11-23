import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { SportPickerScreen } from './src/screens/SportPickerScreen';
import { MatchOptionsScreen } from './src/screens/MatchOptionsScreen';
import { LiveMatchScreen } from './src/screens/LiveMatchScreen';
import { MatchSummaryScreen } from './src/screens/MatchSummaryScreen';
import { LotteryScreen } from './src/screens/LotteryScreen';
import { getEngine, SportKey, MatchConfig, SimResult, randomSeed } from './src/engine';

function simulate(config: MatchConfig): SimResult {
  return getEngine(config.sport).simulate(config);
}

type TopView = 'home' | 'pick' | 'options' | 'match' | 'lottery';
type MatchView = 'live' | 'summary';

export default function App() {
  const [view, setView] = useState<TopView>('home');
  const [selectedSport, setSelectedSport] = useState<SportKey>(SportKey.FOOTBALL);
  const [matchView, setMatchView] = useState<MatchView>('live');
  const [match, setMatch] = useState<SimResult | null>(null);
  const [lastConfig, setLastConfig] = useState<MatchConfig | null>(null);

  // Simulate and show a match, recording the seed actually used for reproducibility.
  const launch = (config: MatchConfig) => {
    const seed = config.seed ?? randomSeed();
    const sim = simulate({ ...config, seed });
    setMatch({ ...sim, metadata: { ...sim.metadata, seed } });
    setMatchView('live');
    setView('match');
  };

  const start = (config: MatchConfig) => {
    setLastConfig(config);
    launch(config);
  };

  // Re-roll the same sport/options with a fresh random seed.
  const replay = () => {
    if (lastConfig) launch({ ...lastConfig, seed: undefined });
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
          onReplay={replay}
          onAllSports={() => setView('pick')}
        />
      )}
      {view === 'match' && matchView === 'summary' && match && (
        <MatchSummaryScreen
          match={match}
          onBack={() => setView('home')}
          onReplay={replay}
          onAllSports={() => setView('pick')}
        />
      )}

      {view === 'lottery' && <LotteryScreen onBack={() => setView('home')} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
