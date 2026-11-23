import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ScrollView,
  StyleProp,
} from 'react-native';
import { ReactNode } from 'react';
import { Theme, useTheme } from '../theme';

// Shared visual system for RandoVent. Everything funnels through these primitives
// so the app looks consistent and supports light/dark themes without per-screen
// colour duplication. All colours come from the active Theme (see src/theme.tsx).

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function ScrollScreen({
  children,
  style,
  contentContainerStyle,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <ScrollView
      style={[styles.screen, style]}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  );
}

export function Card({
  children,
  style,
  padding = 16,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={[styles.card, { padding }, style]}>{children}</View>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Subtitle({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function SectionTitle({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  block = false,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  block?: boolean;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const base: ViewStyle[] = [styles.btn];
  if (block) base.push(styles.btnBlock);
  let textStyle: TextStyle = styles.btnText;
  if (variant === 'primary') base.push(styles.btnPrimary);
  if (variant === 'secondary') {
    base.push(styles.btnSecondary);
    textStyle = styles.btnSecondaryText;
  }
  if (variant === 'ghost') {
    base.push(styles.btnGhost);
    textStyle = styles.btnGhostText;
  }
  if (variant === 'danger') base.push(styles.btnDanger);
  if (disabled) base.push(styles.btnDisabled);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [base, pressed && !disabled && styles.btnPressed]}
    >
      <Text style={textStyle}>{title}</Text>
    </Pressable>
  );
}

export interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

export function Segmented<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: SegmentedOption<T>[];
  selected: T;
  onSelect: (v: T) => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === selected;
        return (
          <Pressable
            key={o.value}
            onPress={() => onSelect(o.value)}
            style={({ pressed }) => [
              styles.segment,
              active && styles.segmentActive,
              pressed && styles.segmentPressed,
            ]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'numeric';
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.inputWrap}>
      <TextInput
        style={styles.input}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return <View style={[styles.row, style]}>{children}</View>;
}

// Styles are built per-theme (cheap) so colour tokens track the active theme.
function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.text,
      letterSpacing: 0.2,
    },
    subtitle: {
      fontSize: 15,
      color: theme.subtext,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    btn: {
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnBlock: { width: '100%' },
    btnPrimary: {
      backgroundColor: theme.primary,
    },
    btnSecondary: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.borderStrong,
    },
    btnGhost: {
      backgroundColor: 'transparent',
    },
    btnDanger: {
      backgroundColor: theme.danger,
    },
    btnDisabled: {
      backgroundColor: theme.border,
      borderColor: theme.border,
    },
    btnPressed: {
      opacity: 0.85,
    },
    btnText: {
      color: theme.onPrimary,
      fontWeight: '700',
      fontSize: 15,
    },
    btnSecondaryText: {
      color: theme.text,
    },
    btnGhostText: {
      color: theme.primary,
    },
    segmented: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceAlt,
      borderRadius: 10,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.border,
    },
    segment: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
    },
    segmentActive: {
      backgroundColor: theme.surface,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    segmentPressed: {
      opacity: 0.8,
    },
    segmentText: {
      fontWeight: '600',
      color: theme.subtext,
      fontSize: 14,
    },
    segmentTextActive: {
      color: theme.primary,
      fontWeight: '700',
    },
    field: {
      marginBottom: 14,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.subtext,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    fieldHint: {
      fontSize: 12,
      color: theme.subtext,
      marginTop: 4,
    },
    inputWrap: {
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 10,
      backgroundColor: theme.inputBg,
    },
    input: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: theme.text,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
}
