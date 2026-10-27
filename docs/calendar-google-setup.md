# Kalender MOODEE: setup untuk penguji terbatas

Fitur tamu langsung berjalan tanpa layanan eksternal. Rencana tamu hanya tersimpan di browser perangkat itu dan penanda pengingat hanya tampil saat game terbuka. Agar acara bertahan di Google Calendar dan pengingat popup/email dapat bekerja saat game tertutup, siapkan Google Cloud dan Supabase berikut.

## 1. Google Cloud

1. Buat project Google Cloud khusus MOODEE. Aktifkan **Google Calendar API**.
2. Buka **Google Auth Platform / OAuth consent screen**. Pilih **External**, status **Testing**, isi nama aplikasi dan email kontak, lalu tambahkan alamat Google semua penguji sebagai **Test users**.
3. Tambahkan scope `openid`, `email`, `profile`, `https://www.googleapis.com/auth/calendar.readonly`, dan `https://www.googleapis.com/auth/calendar.app.created`. Scope pertama dipakai untuk login; dua scope Calendar memungkinkan pembacaan agenda dan pengelolaan kalender sekunder yang dibuat aplikasi. Periksa tampilan consent dan batas penguji di Cloud Console.
4. Buat **OAuth Client ID → Web application**. Pada **Authorized JavaScript origins**, masukkan origin aplikasi, misalnya `https://i0kyung.github.io` dan `http://localhost:5173` untuk pengembangan. Pada **Authorized redirect URIs**, salin **Callback URL** dari **Supabase Dashboard → Authentication → Providers → Google**. Bentuknya `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`; ganti `YOUR_PROJECT_REF` dengan ID project Supabase Anda, tanpa tanda kurung atau teks placeholder. URL GitHub Pages lengkap (`https://i0kyung.github.io/moodee/`) didaftarkan di **Supabase Authentication → URL Configuration**, bukan di kolom redirect URI Google.
5. Simpan Client ID dan Client Secret di tempat aman. Client Secret hanya dimasukkan di dashboard Supabase dan Edge Function, tidak di Vite atau GitHub Pages.

Google dapat membuat refresh token untuk aplikasi External dalam mode Testing kedaluwarsa setelah tujuh hari. UI menyediakan **Reconnect Google** ketika ini terjadi. Untuk rilis publik, tinjau verifikasi OAuth dan kebijakan Google lebih lanjut.

## 2. Supabase

1. Buat project Supabase. Di **Authentication → Providers → Google**, aktifkan provider dan masukkan OAuth Client ID serta Secret dari langkah 1.
2. Di **Authentication → URL Configuration**, isi **Site URL** dengan `https://i0kyung.github.io/moodee/` dan tambahkan redirect URL `https://i0kyung.github.io/moodee/` serta `http://localhost:5173/**` untuk pengembangan lokal. Jika alamat Pages berubah, sesuaikan di sini dan di konfigurasi aplikasi.
3. Jalankan migrasi [`202609300001_google_calendar_connections.sql`](../supabase/migrations/202609300001_google_calendar_connections.sql) melalui Supabase CLI (`supabase db push`) atau SQL Editor. Tabel berisi ID kalender dan refresh token terenkripsi, memiliki RLS aktif tanpa policy klien, dan akses `anon`/`authenticated` dicabut.
4. Buat kunci enkripsi acak 32 byte berbentuk Base64. Contoh lokal: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Simpan nilainya di **Supabase Dashboard → Edge Functions → Secrets**, dengan nama `GOOGLE_TOKEN_ENCRYPTION_KEY`, atau gunakan `supabase secrets set GOOGLE_TOKEN_ENCRYPTION_KEY=<nilai>`. Jangan mengubahnya setelah akun terhubung tanpa migrasi token, sebab token lama tak dapat didekripsi.
5. Set Edge Function secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_ENCRYPTION_KEY`, dan `APP_ORIGINS`. Isi `APP_ORIGINS` dengan daftar origin dipisahkan koma, misalnya `https://i0kyung.github.io,http://localhost:5173` (tanpa `/moodee/`). `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` disediakan lingkungan Supabase Functions. Jangan menaruh service role key di frontend.
6. Deploy fungsi [`calendar`](../supabase/functions/calendar/index.ts) dengan langkah CLI di bawah. Fungsi tetap memvalidasi JWT Supabase sendiri lewat `auth.getUser`, sehingga preflight CORS dapat dilayani.

### Deploy fungsi `calendar` dari PowerShell

Jalankan perintah berikut dari folder root repo (`moodee`). CLI Supabase sudah terpasang sebagai dev dependency; gunakan `npx supabase`:

```powershell
npm install
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase secrets list
npx supabase functions deploy calendar --no-verify-jwt --use-api
```

Ganti `YOUR_PROJECT_REF` dengan ID project dari URL dashboard `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`. Periksa ID sebelum `db push`, karena perintah itu menerapkan migrasi ke database project yang terhubung. Bila migrasi SQL sudah dijalankan lewat SQL Editor, lewati `db push`. Pastikan keempat secret pada langkah 5 muncul di `secrets list` sebelum deploy; daftar itu menampilkan nama secret, bukan nilainya. Opsi `--use-api` melakukan bundling tanpa Docker. Setelah berhasil, fungsi tersedia di `https://YOUR_PROJECT_REF.supabase.co/functions/v1/calendar`. Untuk pengujian, buka aplikasi dan gunakan tombol **Connect**; pemanggilan `calendar` tanpa sesi Supabase akan ditolak oleh fungsi.

Untuk frontend lokal, salin [`.env.example`](../.env.example) menjadi `.env.local` dan isi `VITE_SUPABASE_URL` serta `VITE_SUPABASE_PUBLISHABLE_KEY`. Nama lama `VITE_SUPABASE_ANON_KEY` juga didukung. Jalankan `npm run dev`. Untuk **Edge Function lokal** (`supabase start` atau `supabase functions serve`), buat file terpisah `supabase/functions/.env` berisi `GOOGLE_TOKEN_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan `APP_ORIGINS`. File tersebut diabaikan Git. Dua nilai `VITE_` memang publik; kredensial Google dan service role key tidak boleh menggunakan prefiks `VITE_`.

Untuk build GitHub Pages, simpan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` di repository **Actions Secrets** atau **Actions Variables**. Workflow memakai Secrets lebih dahulu, lalu Variables sebagai cadangan; nama lama `VITE_SUPABASE_ANON_KEY` juga didukung. Nilai `VITE_` masuk ke bundle browser sehingga hanya URL project dan publishable/anon key yang boleh dipakai di sini. Jangan masukkan Google Client Secret, service role key, atau `GOOGLE_TOKEN_ENCRYPTION_KEY`. Setiap push ke `main` membangun ulang GitHub Pages; workflow akan gagal dengan pesan jelas bila dua nilai publik yang diperlukan tidak tersedia.

## 3. Uji koneksi langsung setelah konfigurasi

Jika Connect menampilkan `Google Calendar could not list calendars (403: SERVICE_DISABLED)`, buka **Google Cloud Console → APIs & Services → Library → Google Calendar API** pada project yang memiliki OAuth Client ID MOODEE, lalu klik **Enable**. Pastikan halaman API/Service Details menunjukkan **Status: Enabled** sebelum mengulangi Connect. Scope OAuth saja belum mengaktifkan API untuk project tersebut.

1. Dengan akun yang termasuk Test users, buka aplikasi dan pilih **Calendar → Connect**. Setujui scope Calendar. Setelah kembali, pastikan status menampilkan alamat email yang benar.
2. Buat rencana berpengingat 10 menit. Buka kalender sekunder **MOODEE** di Google Calendar dan pastikan acara, popup, dan email reminder tampil. Pengiriman notifikasi tetap bergantung pada pengaturan Google Calendar dan perangkat.
3. Sunting judul/waktu acara di Google Calendar, lalu tekan **Refresh** di MOODEE. Pastikan perubahan muncul. Hapus acara di Google, Refresh lagi, pastikan hilang. Agenda kalender Google lain harus tampil sebagai baca saja.
4. Buat rencana sebagai tamu, kemudian hubungkan Google dan pilih **Move upcoming plans**. Simulasikan kegagalan jaringan sebagian; hanya rencana yang berhasil dibuat di Google yang boleh dihapus dari browser. Ulangi migrasi dan periksa tidak ada duplikat.
5. Gunakan dua akun penguji berbeda. Pastikan satu akun tidak melihat acara MOODEE atau cache agenda akun lain. Periksa browser Storage: yang tersimpan hanya sesi Supabase, rencana tamu, dan cache agenda; `provider_token` serta `provider_refresh_token` Google tidak boleh muncul. Periksa pula respons `agenda` tidak memuat token.
6. Cabut akses Google atau tunggu token Testing kedaluwarsa, lalu pastikan agenda tersimpan tampil baca saja dan **Reconnect Google** tersedia.

## Perilaku dan batas

- Saat terhubung, daftar agenda dimuat ulang saat layar Calendar dibuka, browser kembali aktif, minggu diganti, atau tombol Refresh ditekan. Cache per pengguna/per minggu hanya dipakai ketika jaringan atau akses gagal; cache tidak dapat disunting.
- MOODEE hanya membuat/mengubah/menghapus acara di kalender sekunder **MOODEE**. Kalender Google lain dibaca saja. Perubahan bersamaan ditolak melalui ETag; aplikasi memuat versi terbaru dan pengguna mengulang suntingan.
- Disconnect mencabut refresh token dan menghapus hubungan akun di Supabase. Kalender dan acara yang sudah ada tetap berada di Google Calendar; bila akun yang sama terhubung lagi, kalender MOODEE yang ada dipakai ulang.
- Token Google melewati browser sementara selama OAuth Supabase, tetapi penyimpanan sesi menyaring `provider_token` dan `provider_refresh_token`. Refresh token kemudian dikirim sekali ke Edge Function, dienkripsi dengan AES-GCM, dan tidak dikembalikan di respons agenda.
- Pengujian otomatis memakai respons Google tiruan. OAuth dan pengingat langsung perlu diuji memakai akun yang termasuk **Test users** setelah backend dideploy.

Referensi: [scope Google Calendar](https://developers.google.com/workspace/calendar/api/auth), [pengingat acara](https://developers.google.com/workspace/calendar/api/concepts/reminders), [OAuth Google di Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google), [batas mode Testing](https://support.google.com/cloud/answer/15549945).
