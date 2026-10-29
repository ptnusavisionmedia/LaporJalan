import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { DRAFT_NOTICE, PRIVACY, TERMS } from '@/constants/legal';
import { EmptyState } from '@/components/ui';

// Reachable while signed out (linked from the registration form), so it lives outside (auth)/(tabs).
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const content = doc === 'privacy' ? PRIVACY : doc === 'terms' ? TERMS : null;
  if (!content) return <EmptyState title="Dokumen tidak ditemukan" message="Kembali dan pilih dokumen yang tersedia." />;

  return (
    <ScrollView className="flex-1 bg-background dark:bg-navy" contentContainerClassName="p-5">
      <Stack.Screen options={{ headerShown: true, title: content.title }} />
      <View className="mb-4 rounded-xl border border-warning bg-amber-50 p-3">
        <Text className="text-sm text-navy">{DRAFT_NOTICE}</Text>
      </View>
      {content.sections.map((s) => (
        <View key={s.heading} className="mb-4">
          <Text accessibilityRole="header" className="mb-1 text-lg font-semibold text-navy dark:text-white">{s.heading}</Text>
          <Text className="text-navy dark:text-slate-200">{s.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
