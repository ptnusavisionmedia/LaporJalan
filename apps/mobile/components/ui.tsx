import { REPORT_STATUSES, labelOf } from '@laporjalan/shared';
import { ActivityIndicator, Pressable, Text, TextInput, View, type PressableProps, type TextInputProps } from 'react-native';

type ButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

const variants = {
  primary: 'bg-primary',
  secondary: 'bg-surface border border-border dark:bg-navy',
  danger: 'bg-danger',
} as const;

export function Button({ title, onPress, loading, disabled, variant = 'primary' }: ButtonProps) {
  const inactive = loading || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      // min-h-12 keeps the touch target at >= 48dp
      className={`min-h-12 items-center justify-center rounded-xl px-4 ${variants[variant]} ${inactive ? 'opacity-60' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? '#2563EB' : '#fff'} />
      ) : (
        <Text className={`text-base font-semibold ${variant === 'secondary' ? 'text-navy dark:text-white' : 'text-white'}`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

type FieldProps = TextInputProps & { label: string; error?: string };

export function TextField({ label, error, ...props }: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm font-medium text-navy dark:text-slate-200">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#94A3B8"
        className={`min-h-12 rounded-xl border bg-surface px-3 text-base text-navy dark:bg-navy dark:text-white ${error ? 'border-danger' : 'border-border'}`}
        {...props}
      />
      {error ? (
        <Text accessibilityRole="alert" className="mt-1 text-sm text-danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className={`min-h-12 justify-center rounded-xl border px-4 ${selected ? 'border-primary bg-primary' : 'border-border bg-surface dark:bg-navy'}`}
    >
      <Text className={selected ? 'font-semibold text-white' : 'text-navy dark:text-slate-200'}>{label}</Text>
    </Pressable>
  );
}

// Pressable so `<Link asChild>` can make a card tappable; inert when no onPress is injected.
export function Card({ children, ...props }: PressableProps & { children?: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole={props.onPress ? 'button' : undefined}
      className="mb-3 rounded-2xl border border-border bg-surface p-4 dark:border-slate-700 dark:bg-slate-800"
      {...props}
    >
      {children}
    </Pressable>
  );
}

export function Skeleton({ height = 64 }: { height?: number }) {
  return <View style={{ height }} className="mb-3 rounded-2xl bg-slate-200 dark:bg-slate-700" accessibilityLabel="Memuat" />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="items-center p-6">
      <Text accessibilityRole="alert" className="mb-3 text-center text-danger">{message}</Text>
      <Button title="Coba lagi" variant="secondary" onPress={onRetry} />
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const label = labelOf(REPORT_STATUSES, status);
  const color =
    status === 'selesai' ? 'bg-success' : status === 'ditolak' ? 'bg-danger' : status === 'dalam_penanganan' ? 'bg-warning' : 'bg-primary';
  return (
    <View className={`self-start rounded-full px-3 py-1 ${color}`}>
      <Text className="text-xs font-semibold text-white">{label}</Text>
    </View>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="mb-2 text-lg font-semibold text-navy dark:text-white">{title}</Text>
      <Text className="text-center text-muted">{message}</Text>
    </View>
  );
}
