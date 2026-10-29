import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/ui';
import { supabase } from '@/services/supabase';

export type RegionValue = {
  province: string | null;
  regency: string | null;
  district: string | null;
  village: string | null;
};
export const EMPTY_REGION: RegionValue = { province: null, regency: null, district: null, village: null };

type Region = { code: string; name: string };
const LEVELS = [
  { key: 'province', label: 'Provinsi' },
  { key: 'regency', label: 'Kabupaten/Kota' },
  { key: 'district', label: 'Kecamatan' },
  { key: 'village', label: 'Kelurahan/Desa' },
] as const;

async function fetchChildren(level: number, parent: string | null): Promise<Region[]> {
  let q = supabase.from('regions').select('code,name').eq('level', level).order('name').limit(1000);
  if (parent) q = q.eq('parent_code', parent);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

function SelectModal({ title, options, onPick, onClose }: {
  title: string; options: Region[]; onPick: (r: Region) => void; onClose: () => void;
}) {
  const [term, setTerm] = useState('');
  const shown = options.filter((o) => o.name.toLowerCase().includes(term.trim().toLowerCase()));
  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background p-5 pt-14 dark:bg-navy">
        <Text accessibilityRole="header" className="mb-3 text-xl font-bold text-navy dark:text-white">{title}</Text>
        <TextInput
          accessibilityLabel={`Cari ${title}`}
          placeholder="Cari nama wilayah"
          placeholderTextColor="#94A3B8"
          value={term}
          onChangeText={setTerm}
          className="mb-3 min-h-12 rounded-xl border border-border bg-surface px-3 text-base text-navy dark:bg-slate-800 dark:text-white"
        />
        <FlatList
          data={shown}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(r) => r.code}
          ListEmptyComponent={<Text className="text-muted">Tidak ada hasil.</Text>}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" onPress={() => onPick(item)} className="min-h-12 justify-center border-b border-border">
              <Text className="text-base text-navy dark:text-slate-200">{item.name}</Text>
            </Pressable>
          )}
        />
        <View className="mt-3"><Button title="Tutup" variant="secondary" onPress={onClose} /></View>
      </View>
    </Modal>
  );
}

/**
 * Cascading Provinsi -> Kab/Kota -> Kecamatan -> Desa selector backed by the `regions` table.
 * A level is required only when the table actually has children for the chosen parent, so the
 * form still works while only provinces have been imported. `onMissing` reports the first
 * required level that is still empty (or null when complete).
 */
export function RegionPicker({ value, onChange, onMissing }: {
  value: RegionValue; onChange: (v: RegionValue) => void; onMissing: (label: string | null) => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const codes = [value.province, value.regency, value.district, value.village];

  const lists = LEVELS.map((_, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks -- fixed-length array, stable order
    useQuery({
      queryKey: ['regions', i + 1, i === 0 ? null : codes[i - 1]],
      queryFn: () => fetchChildren(i + 1, i === 0 ? null : codes[i - 1]),
      enabled: i === 0 || !!codes[i - 1],
      staleTime: Infinity,
    }),
  );

  const missingIdx = LEVELS.findIndex((_, i) => {
    const l = lists[i];
    const needed = i === 0 || (!!codes[i - 1] && (l.data?.length ?? 0) > 0);
    return needed && !codes[i];
  });
  const missing = missingIdx === -1 ? null : LEVELS[missingIdx].label;
  useEffect(() => onMissing(missing), [missing, onMissing]);

  const pick = (i: number, code: string) => {
    const next = [...codes];
    next[i] = code;
    for (let j = i + 1; j < 4; j++) next[j] = null; // changing a parent clears its children
    onChange({ province: next[0], regency: next[1], district: next[2], village: next[3] });
    setOpen(null);
  };

  return (
    <View className="gap-3">
      {LEVELS.map((lv, i) => {
        const l = lists[i];
        if (i > 0 && (!codes[i - 1] || (l.isSuccess && l.data.length === 0))) return null;
        const name = l.data?.find((r) => r.code === codes[i])?.name;
        return (
          <View key={lv.key}>
            <Text className="mb-1 text-sm font-medium text-navy dark:text-slate-200">{lv.label}{i === 0 ? ' *' : ''}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${lv.label}: ${name ?? 'belum dipilih'}`}
              onPress={() => l.isSuccess && setOpen(i)}
              className="min-h-12 justify-center rounded-xl border border-border bg-surface px-3 dark:bg-slate-800"
            >
              <Text className={name ? 'text-navy dark:text-white' : 'text-muted'}>
                {l.isLoading ? 'Memuat…' : l.isError ? 'Gagal memuat' : name ?? `Pilih ${lv.label.toLowerCase()}`}
              </Text>
            </Pressable>
            {l.isError ? <Text accessibilityRole="alert" className="mt-1 text-sm text-danger" onPress={() => l.refetch()}>Ketuk untuk mencoba lagi.</Text> : null}
            {open === i && l.data ? <SelectModal title={lv.label} options={l.data} onPick={(r) => pick(i, r.code)} onClose={() => setOpen(null)} /> : null}
          </View>
        );
      })}
      {lists[1].isSuccess && value.province && lists[1].data.length === 0 ? (
        <Text className="text-sm text-warning">
          Data kabupaten/kota untuk provinsi ini belum tersedia. Laporan hanya akan terlihat oleh admin tingkat provinsi.
        </Text>
      ) : null}
    </View>
  );
}
