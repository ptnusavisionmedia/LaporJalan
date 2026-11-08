# LaporJalan – Web Admin

Dasbor admin/instansi (React + Vite + Supabase).

## Jalankan lokal

```bash
npm install
cp .env.example .env   # isi URL & anon key Supabase
npm run dev
```

## Hosting di Vercel

1. Push repo ke GitHub, lalu di Vercel pilih **Add New → Project** dan impor repo ini.
2. **Root Directory**: `admin` (Framework otomatis terdeteksi sebagai Vite; `vercel.json` sudah mengatur build).
3. Di **Environment Variables** isi:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (anon/publishable key, **bukan** service-role key)
4. Klik **Deploy**.
5. Setelah dapat alamat (misal `https://laporjalan-admin.vercel.app`), buka Supabase → **Authentication → URL Configuration**, lalu tambahkan alamat itu di **Site URL** / **Redirect URLs**.

Variabel `VITE_*` ditanam saat build, jadi setelah mengubahnya lakukan **Redeploy**.
Hosting statis lain (Netlify, Cloudflare Pages) juga bisa: build command `npm run build`, output `dist`.
