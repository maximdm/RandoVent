import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, BackHandler, Alert } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { SportPickerScreen } from './src/screens/SportPickerScreen';
import { MatchOptionsScreen } from './src/screens/MatchOptionsScreen';
import { LiveMatchScreen } from './src/screens/LiveMatchScreen';
import { MatchSummaryScreen } from './src/screens/MatchSummaryScreen';
import { LotteryScreen } from './src/screens/LotteryScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { getEngine, SportKey, MatchConfig, SimResult, randomSeed } from './src/engine';
import {
  historyRepo,
  addMatch,
  MatchRecord,
} from './src/storage/matchHistory';
import { ThemeProvider, useTheme, useThemeControls } from './src/theme';

function simulate(config: MatchConfig): SimResult {
  return getEngine(config.sport).simulate(config);
}

type TopView = 'home' | 'pick' | 'options' | 'match' | 'lottery' | 'history';
type MatchView = 'live' | 'summary';

export default function App() {
  return (
    <ThemeProvider>
      <AppRoot />
    </ThemeProvider>
  );
}

function AppRoot() {
  const theme = useTheme();
  const { isDark } = useThemeControls();
  const [view, setView] = useState<TopView>('home');
  const [selectedSport, setSelectedSport] = useState<SportKey>(SportKey.FOOTBALL);
  const [matchView, setMatchView] = useState<MatchView>('live');
  const [match, setMatch] = useState<SimResult | null>(null);
  const [lastConfig, setLastConfig] = useState<MatchConfig | null>(null);
  const [history, setHistory] = useState<MatchRecord[]>([]);

  // Load persisted match history once on mount.
  useEffect(() => {
    let active = true;
    void historyRepo.load().then((loaded) => {
      if (active) setHistory(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist a match record (newest first, capped).
  const recordMatch = (entry: Omit<MatchRecord, 'id' | 'createdAt'>) => {
    const next = addMatch(history, entry);
    setHistory(next);
    void historyRepo.saveAll(next);
  };

  // Simulate and show a match, recording the seed actually used for reproducibility.
  const launch = (config: MatchConfig) => {
    const seed = config.seed ?? randomSeed();
    const sim = simulate({ ...config, seed });
    setMatch({ ...sim, metadata: { ...sim.metadata, seed } });
    setMatchView('live');
    setView('match');
    const meta = sim.metadata as { teamAName?: string; teamBName?: string };
    recordMatch({
      sport: config.sport,
      scoreA: sim.scoreA,
      scoreB: sim.scoreB,
      winner: sim.winner,
      seed,
      // Store the resolved config (with the actual seed) so a replay reproduces
      // this exact match.
      config: { ...config, seed },
      label: `${meta.teamAName ?? 'Team A'} ${sim.scoreA}–${sim.scoreB} ${meta.teamBName ?? 'Team B'}`,
    });
  };

  const start = (config: MatchConfig) => {
    setLastConfig(config);
    launch(config);
  };

  // Re-roll the same sport/options with a fresh random seed.
  const replay = () => {
    if (lastConfig) launch({ ...lastConfig, seed: undefined });
  };

  // Re-simulate a historical match from its stored seed (deterministic) and jump
  // straight to the summary.
  const replayRecord = (record: MatchRecord) => {
    const sim = simulate(record.config);
    setMatch({ ...sim, metadata: { ...sim.metadata, seed: record.seed } });
    setMatchView('summary');
    setView('match');
  };

  // Android hardware back button: step back through the in-app stack; at the home
  // screen let the OS handle it (so the app can exit) unless history is open.
  useEffect(() => {
    const onBackPress = () => {
      if (view === 'pick' || view === 'lottery' || view === 'history') {
        setView('home');
        return true;
      }
      if (view === 'options') {
        setView('pick');
        return true;
      }
      if (view === 'match') {
        if (matchView === 'summary') {
          // Summary came from live; return to the live view rather than home.
          setMatchView('live');
        } else {
          setView('options');
        }
        return true;
      }
      // home: allow default behaviour (exit on Android).
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [view, matchView]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {view === 'home' && (
        <HomeScreen
          onMatch={() => setView('pick')}
          onLottery={() => setView('lottery')}
          onHistory={() => setView('history')}
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
          onBack={() => setView('options')}
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

      {view === 'history' && (
        <HistoryScreen onBack={() => setView('home')} onReplay={replayRecord} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
