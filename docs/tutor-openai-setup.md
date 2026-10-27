# Setup AI Tutor MOODEE

Tutor menggunakan Supabase Edge Functions dan OpenAI. Frontend tetap di GitHub Pages. Kunci OpenAI dan service role tidak boleh memakai prefiks `VITE_`, dimasukkan ke GitHub Pages, atau dikirim dalam chat.

## 1. OpenAI

1. Buat project di OpenAI Platform, aktifkan billing, dan buat project API key yang dapat memanggil Responses API dengan `gpt-4.1-mini`.
2. Di Supabase Dashboard → Edge Functions → Secrets, tambahkan `OPENAI_API_KEY`.
3. Opsional: tambahkan `OPENAI_TUTOR_MODEL=gpt-4.1-mini` untuk mengganti model default. Model harus mendukung Responses API dan Structured Outputs.
4. Gunakan pengaturan budget/alert project OpenAI untuk memantau biaya. Kuota aplikasi adalah jumlah permintaan, bukan batas nominal tagihan.

Referensi: [API keys](https://developers.openai.com/api/reference/overview), [model](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## 2. Akses tamu tanpa login atau CAPTCHA

1. Di Supabase Dashboard → Authentication → Sign In / Providers, aktifkan **Anonymous Sign-Ins**.
2. Di Authentication → Settings/Security, pastikan **CAPTCHA protection tidak aktif**. Jika sebelumnya memakai Turnstile, nonaktifkan proteksi tersebut agar signup tamu tanpa token CAPTCHA diterima.
3. Pengguna langsung menulis pertanyaan dan menekan Send. Aplikasi membuat sesi anonim di belakang layar saat penggunaan pertama. Tidak ada widget CAPTCHA, tombol login wajib, atau konfigurasi Cloudflare.
4. Pertahankan rate limit anonymous signup Supabase. Tamu memiliki UUID dengan role `authenticated`; izin Calendar dan tabel privat tetap memeriksa status anonim/akses server. Akun Google yang sudah aktif tidak membuat akun tamu baru.

[Anonymous users](https://supabase.com/docs/guides/auth/auth-anonymous). Kuota per tamu melekat pada sesi anonim perangkat. Tanpa CAPTCHA, pengguna yang membuat sesi baru dapat memperoleh identitas baru; batas global 300 request/hari tetap berlaku untuk seluruh aplikasi.

## 3. Google OAuth dan callback

Google provider Supabase menggunakan client ID/secret yang sama dengan Calendar. Authorized redirect URI di Google Cloud tetap `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.

Di Supabase Authentication → URL Configuration, pastikan redirect allowlist menerima:

```text
https://i0kyung.github.io/moodee/**
http://localhost:5173/**
http://127.0.0.1:5173/**
```

Tutor memakai scope identitas `openid email profile`. Calendar meminta scope Calendar melalui tombol Connect sendiri. Callback membawa `oauth_destination=tutor` atau `calendar`; callback Tutor tidak membuat koneksi Calendar. Google sign-in di Tutor hanya tersedia sebelum sesi aktif agar redirect tidak menghilangkan timer.

## 4. Database dan Edge Function

Di repo yang sudah terhubung ke project Supabase:

```powershell
npx supabase db push --dry-run
npx supabase db push
npx supabase functions deploy tutor --no-verify-jwt
```

Periksa daftar migrasi pada dry-run sebelum menerapkannya. Migrasi Tutor membuat `private.tutor_usage_daily` dan RPC `public.tutor_usage`. Hanya service role backend yang boleh mengakses keduanya. JWT tetap diverifikasi oleh fungsi melalui Supabase Auth `getUser`, termasuk untuk tamu.

Tambahkan atau pertahankan `APP_ORIGINS` pada Supabase Edge Function secrets:

```text
https://i0kyung.github.io,http://localhost:5173,http://127.0.0.1:5173
```

Jika memakai port lain, tambahkan origin port tersebut. Origin tidak menyertakan path. `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` tersedia otomatis untuk hosted Edge Functions.

Restart server dev setelah mengubah `.env`. Untuk Pages, konfigurasi frontend hanya memerlukan URL dan publishable key Supabase yang sudah digunakan Calendar. Tidak ada environment variable Turnstile.

## 5. Pemeriksaan langsung

1. Buka Classroom → Tutor sebelum sesi. Sebagai tamu tanpa login, tulis pertanyaan dan tekan Send. Pastikan sesi anonim otomatis dibuat, jawaban muncul, dan kuota berkurang.
2. Buka Quiz me, tegaskan topik, dan buat kuis. Jawab tiga pertanyaan; penilaian tidak memakai request tambahan.
3. Tutup/buka Tutor; periksa History. Refresh perangkat yang sama dan lanjutkan riwayat. Akun berbeda tidak menampilkan riwayat akun sebelumnya.
4. Login Google dari Tutor sebelum sesi. Pastikan tidak ada permintaan izin Calendar; Calendar tetap lokal sampai Connect dilakukan.
5. Mulai timer/Pomodoro, buka Tutor, dan pastikan waktu terus berjalan. Dialog return/exit dan reward tetap mendapat prioritas.
6. Di DevTools, periksa bahwa request hanya menuju backend Tutor dan tidak mengandung kunci OpenAI. Respons hanya berisi jawaban/kuis serta metadata kuota.

## Batas dan operasi

- 10 request/tamu/hari, 30/akun/hari, 300/aplikasi/hari, tiga/menit/pengguna. Reset pukul 00.00 Asia/Jakarta; penghitung direservasi atomik sebelum memanggil OpenAI.
- Satu balasan atau kuis memakai satu request. Request yang sudah dikirim ke OpenAI tetap dihitung jika gagal. Tidak ada retry otomatis.
- Backend menggunakan `store: false`; isi percakapan tetap dikirim ke OpenAI untuk menjawab. Pengaturan retensi provider mengikuti project OpenAI; aplikasi tidak menjanjikan retensi nol pada provider.
- Riwayat aplikasi hanya pada perangkat, maksimal 20 percakapan/2 MB. Data dapat hilang jika browser dibersihkan. Tamu dan akun tidak digabung.
- Supabase tidak otomatis membersihkan anonymous users. Jadwalkan pemeliharaan untuk akun anonim yang tidak dipakai dan penghitung lama sesuai kebutuhan; jangan menghapus akun tamu yang masih digunakan.
- Jika secrets/migrasi belum tersedia, Tutor menampilkan unavailable dan Classroom tetap dapat digunakan. Live smoke test memerlukan seluruh setup di atas.

Pengujian: `npm test`, `npm run test:rules`, `npm run build`. Untuk kuota atomik gunakan `node scripts/test-tutor-quotas.mjs postgresql://postgres@127.0.0.1:55432/postgres` terhadap database lokal terisolasi dengan role Supabase dan migrasi Tutor; script ini menghapus data penghitung dalam database pengujian tersebut.
