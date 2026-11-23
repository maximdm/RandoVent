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

// Shared visual system for RandoVent. Everything funnels through these primitives
// so the app looks consistent without per-screen style duplication.
export const palette = {
  bg: '#eef2f7',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  onPrimary: '#ffffff',
  teamA: '#2563eb',
  teamB: '#dc2626',
  text: '#0f172a',
  subtext: '#64748b',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  accent: '#0d9488',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
};

export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function ScrollScreen({
  children,
  style,
  contentContainerStyle,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
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
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}) {
  return <View style={[styles.card, { padding }, style]}>{children}</View>;
}

export function Title({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function SectionTitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
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
  if (variant === 'danger') {
    base.push(styles.btnDanger);
  }
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
  children: React.ReactNode;
}) {
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
  return (
    <View style={styles.inputWrap}>
      <TextInput
        style={styles.input}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={palette.subtext}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

// Reusable row container.
export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 15,
    color: palette.subtext,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: palette.text,
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
    backgroundColor: palette.primary,
  },
  btnSecondary: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnDanger: {
    backgroundColor: palette.danger,
  },
  btnDisabled: {
    backgroundColor: palette.border,
    borderColor: palette.border,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnText: {
    color: palette.onPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  btnSecondaryText: {
    color: palette.text,
  },
  btnGhostText: {
    color: palette.primary,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: palette.surfaceAlt,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: palette.border,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: palette.surface,
    shadowColor: '#0f172a',
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
    color: palette.subtext,
    fontSize: 14,
  },
  segmentTextActive: {
    color: palette.primary,
    fontWeight: '700',
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.subtext,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fieldHint: {
    fontSize: 12,
    color: palette.subtext,
    marginTop: 4,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: palette.borderStrong,
    borderRadius: 10,
    backgroundColor: palette.surface,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: palette.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
