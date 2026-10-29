import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@laporjalan/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import type { z } from 'zod';
import { Button, TextField } from '@/components/ui';
import { supabase } from '@/services/supabase';

type Values = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', acceptTerms: false as unknown as true },
  });
  const accepted = watch('acceptTerms');

  const onSubmit = handleSubmit(async ({ fullName, email, password }) => {
    setFormError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setFormError('Pendaftaran gagal. Periksa data Anda atau coba lagi nanti.');
      return;
    }
    // Same screen whether or not the email already existed (account-enumeration protection).
    setDone(true);
  });

  if (done) {
    return (
      <ScrollView contentContainerClassName="flex-grow justify-center p-6 bg-background dark:bg-navy">
        <Text accessibilityRole="header" className="mb-2 text-2xl font-bold text-navy dark:text-white">
          Periksa email Anda
        </Text>
        <Text className="mb-6 text-muted">
          Jika pendaftaran dapat diproses, kami telah mengirim tautan verifikasi. Verifikasi email Anda, lalu masuk.
        </Text>
        <Link href="/(auth)/login" className="text-primary">
          Kembali ke halaman masuk
        </Link>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background dark:bg-navy" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerClassName="flex-grow justify-center p-6" keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" className="mb-6 text-3xl font-bold text-navy dark:text-white">
          Daftar
        </Text>

        <Controller control={control} name="fullName" render={({ field }) => (
          <TextField label="Nama lengkap" autoComplete="name" value={field.value} onChangeText={field.onChange} error={errors.fullName?.message} />
        )} />
        <Controller control={control} name="email" render={({ field }) => (
          <TextField label="Email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={field.value} onChangeText={field.onChange} error={errors.email?.message} />
        )} />
        <Controller control={control} name="password" render={({ field }) => (
          <TextField label="Kata sandi" secureTextEntry autoComplete="new-password" value={field.value} onChangeText={field.onChange} error={errors.password?.message} />
        )} />
        <Controller control={control} name="confirmPassword" render={({ field }) => (
          <TextField label="Konfirmasi kata sandi" secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.confirmPassword?.message} />
        )} />

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!accepted }}
          accessibilityLabel="Saya menyetujui Syarat Layanan dan Kebijakan Privasi"
          onPress={() => setValue('acceptTerms', !accepted as unknown as true, { shouldValidate: true })}
          className="mb-2 min-h-12 flex-row items-center"
        >
          <Text className="mr-3 text-2xl text-primary">{accepted ? '☑' : '☐'}</Text>
          <Text className="flex-1 text-navy dark:text-slate-200">
            Saya menyetujui Syarat Layanan dan Kebijakan Privasi LaporJalan.
          </Text>
        </Pressable>
        <View className="mb-2 flex-row gap-4">
          <Link href={{ pathname: '/legal/[doc]', params: { doc: 'terms' } }} className="min-h-8 text-primary">Baca Syarat Layanan</Link>
          <Link href={{ pathname: '/legal/[doc]', params: { doc: 'privacy' } }} className="min-h-8 text-primary">Baca Kebijakan Privasi</Link>
        </View>
        {errors.acceptTerms ? (
          <Text accessibilityRole="alert" className="mb-2 text-sm text-danger">
            {errors.acceptTerms.message}
          </Text>
        ) : null}

        {formError ? <Text accessibilityRole="alert" className="mb-4 text-danger">{formError}</Text> : null}

        <Button title="Daftar" onPress={onSubmit} loading={isSubmitting} />
        <Link href="/(auth)/login" className="mt-6 text-center text-primary">
          Sudah punya akun? Masuk
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
