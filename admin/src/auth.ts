import type { SupabaseClient } from '@supabase/supabase-js'

export async function signInAdmin(client: SupabaseClient, identifier: string, password: string) {
  const normalized = identifier.trim().toLowerCase()
  const email = normalized.includes('@') ? normalized : `${normalized}@laporjalan.app`
  const { data, error } = await client.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.code === 'invalid_credentials') {
      throw new Error('Username/email atau password salah. Gunakan akun yang sudah dibuat di Supabase.')
    }
    if (error.code === 'email_not_confirmed') {
      throw new Error('Email akun ini belum dikonfirmasi. Konfirmasikan akun di Supabase → Authentication → Users.')
    }
    if (error.status === 429) {
      throw new Error('Terlalu banyak percobaan login. Tunggu sebentar, lalu coba lagi.')
    }
    throw new Error(`Login gagal: ${error.message}`)
  }

  if (!data.user) throw new Error('Sesi login tidak tersedia. Silakan coba lagi.')

  try {
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError) {
      throw new Error('Login berhasil, tetapi profil tidak bisa dibaca. Periksa tabel profiles dan aturan aksesnya di Supabase.')
    }
    if (!profile) {
      throw new Error('Profil akun belum tersedia di tabel profiles. Hubungi pengelola untuk melengkapi profil akun.')
    }
    if (profile.role !== 'admin' && profile.role !== 'instansi') {
      throw new Error('Akun ini belum memiliki akses admin/instansi. Ubah role akun di tabel profiles melalui Supabase.')
    }
  } catch (error) {
    await client.auth.signOut({ scope: 'local' })
    throw error
  }
}
