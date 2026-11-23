import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './ui';
import { useTheme } from '../theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

// Catches render-time exceptions in any screen so a single uncaught throw cannot
// take down the whole app. Without this, a crash in e.g. a sports engine or a
// screen would white-screen the user. We log the error and offer a recovery
// action (re-mount the subtree) rather than exiting.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // In production this is where you'd forward to a crash reporter (Sentry, etc.).
    console.error('Uncaught error in RandoVent:', error, info.componentStack);
  }

  private reset = (): void => this.setState({ error: null });

  render(): React.ReactNode {
    if (this.state.error) {
      return <ErrorView error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

function ErrorView({ error, onReset }: { error: Error; onReset: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: theme.subtext }]}>
        The screen hit an unexpected error. You can try again without closing the app.
      </Text>
      <Text style={[styles.detail, { color: theme.muted }]} numberOfLines={3} ellipsizeMode="tail">
        {error.message}
      </Text>
      <View style={styles.actions}>
        <Button title="Try again" onPress={onReset} block />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  message: { fontSize: 15, textAlign: 'center', marginBottom: 12 },
  detail: { fontSize: 12, textAlign: 'center', marginBottom: 16, fontFamily: 'monospace' },
  actions: { width: '100%', maxWidth: 280 },
});
