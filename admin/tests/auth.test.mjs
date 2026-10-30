import assert from 'node:assert/strict'
import test from 'node:test'
import { signInAdmin } from '../src/auth.ts'

function mockClient({ role = 'admin', missingProfile = false, profileError = null, authError = null } = {}) {
  const calls = { login: null, signOut: 0 }
  const client = {
    auth: {
      async signInWithPassword(credentials) {
        calls.login = credentials
        return { data: { user: authError ? null : { id: 'account-id' } }, error: authError }
      },
      async signOut() { calls.signOut++ },
    },
    from(table) {
      assert.equal(table, 'profiles')
      return {
        select() {
          return {
            eq(column, value) {
              assert.equal(column, 'id')
              assert.equal(value, 'account-id')
              return {
                async maybeSingle() {
                  return { data: missingProfile ? null : { role }, error: profileError }
                },
              }
            },
          }
        },
      }
    },
  }
  return { client, calls }
}

test('admin can sign in with username or full email without changing the password', async () => {
  for (const [input, email] of [
    [' Admin ', 'admin@laporjalan.app'],
    [' Admin@laporjalan.app ', 'admin@laporjalan.app'],
    [' Operator@Example.com ', 'operator@example.com'],
  ]) {
    const { client, calls } = mockClient()
    await signInAdmin(client, input, ' password ')
    assert.deepEqual(calls.login, { email, password: ' password ' })
    assert.equal(calls.signOut, 0)
  }
})

test('ordinary accounts cannot access admin and their local session is cleared', async () => {
  const { client, calls } = mockClient({ role: 'user' })
  await assert.rejects(signInAdmin(client, 'user', 'password'), /belum memiliki akses admin/)
  assert.equal(calls.signOut, 1)
})

test('missing and unreadable profiles produce separate errors and clear the session', async () => {
  for (const [options, message] of [
    [{ missingProfile: true }, /Profil akun belum tersedia/],
    [{ profileError: { message: 'permission denied' } }, /profil tidak bisa dibaca/],
  ]) {
    const { client, calls } = mockClient(options)
    await assert.rejects(signInAdmin(client, 'admin', 'password'), message)
    assert.equal(calls.signOut, 1)
  }
})

test('authentication errors distinguish credentials, verification, rate limits, and connection failures', async () => {
  for (const [authError, message] of [
    [{ code: 'invalid_credentials' }, /Username\/email atau password salah/],
    [{ code: 'email_not_confirmed' }, /belum dikonfirmasi/],
    [{ status: 429 }, /Terlalu banyak percobaan/],
    [{ message: 'Failed to fetch' }, /Login gagal: Failed to fetch/],
  ]) {
    const { client } = mockClient({ authError })
    await assert.rejects(signInAdmin(client, 'admin', 'password'), message)
  }
})
