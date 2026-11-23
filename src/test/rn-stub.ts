// Test-only stub for `react-native`, used by the Vite/Vitest node environment which
// cannot bundle the real React Native package (it is meant for the Metro bundler).
// This keeps theme/engine unit tests runnable without pulling in RN's native source.
// The real app (Metro) still resolves the genuine `react-native` module — this alias
// lives only in vitest.config.ts.
export function useColorScheme(): 'light' | 'dark' | null | undefined {
  return 'light';
}

export const StatusBar = { setBarStyle: () => {} };
export const View = 'View';
export const Text = 'Text';
export const Pressable = 'Pressable';
export const TextInput = 'TextInput';
export const ScrollView = 'ScrollView';
export const StyleSheet = { create: (s: unknown) => s, hairlineWidth: 1 };
export const SafeAreaView = 'SafeAreaView';
export const useColorSchemeMock = useColorScheme;
