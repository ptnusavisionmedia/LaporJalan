import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@laporjalan/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import type { z } from 'zod';
import { Button, TextField } from '@/components/ui';
import { supabase } from '@/services/supabase';

type Values = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    // One message for every credential failure, so the response does not reveal which emails exist.
    if (error) {
      setFormError(
        /confirm/i.test(error.message)
          ? 'Email belum diverifikasi. Periksa kotak masuk Anda.'
          : 'Email atau kata sandi salah.',
      );
    }
    // On success the session store updates and the root layout redirects.
  });

  return (
    <KeyboardAvoidingView className="flex-1 bg-background dark:bg-navy" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerClassName="flex-grow justify-center p-6" keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" className="mb-1 text-3xl font-bold text-navy dark:text-white">
          Masuk
        </Text>
        <Text className="mb-8 text-muted">Laporkan kerusakan jalan di sekitar Anda.</Text>

        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              label="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <TextField
              label="Kata sandi"
              secureTextEntry
              autoComplete="password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.password?.message}
            />
          )}
        />

        {formError ? (
          <Text accessibilityRole="alert" className="mb-4 text-danger">
            {formError}
          </Text>
        ) : null}

        <Button title="Masuk" onPress={onSubmit} loading={isSubmitting} />

        <View className="mt-6 items-center gap-3">
          <Link href="/(auth)/register" className="text-primary">
            Belum punya akun? Daftar
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
