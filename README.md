# VoteSync - Sistem E-Voting Modern

VoteSync adalah aplikasi E-Voting (pemungutan suara elektronik) full-stack yang dirancang untuk menyediakan platform pemilihan yang aman, efisien, dan transparan. Dibangun menggunakan teknologi web modern terkini.

## 🛠️ Teknologi Stack

Aplikasi ini dibangun menggunakan:
- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Bahasa**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Visualisasi Data**: [Recharts](https://recharts.org/)

---

## ✨ Fitur Utama

### 1. Portal Publik
- **Daftar Pemilihan**: Melihat pemilihan yang sedang berlangsung.
- **Profil Kandidat**: Informasi detail, visi, dan misi setiap kandidat.
- **Real Count**: Dasbor publik untuk memantau hasil suara sementara secara real-time.

### 2. Portal Pemilih
- **Login Sederhana**: Menggunakan ID Pemilih dan Password yang telah didistribusikan.
- **One Voter, One Vote**: Sistem memastikan setiap pemilih hanya dapat memberikan satu suara per pemilihan.
- **Antarmuka Intuitif**: Desain yang mudah digunakan oleh semua kalangan.

### 3. Portal Admin
- **Role-Based Access Control (RBAC)**: Manajemen hak akses granular untuk berbagai peran admin (misal: Komisi Pemilihan, Pengawas, Operator).
- **Manajemen Data**:
  - **Pemilih**: CRUD data pemilih, import massal dari CSV, dan manajemen password plain-text untuk keperluan cetak kartu.
  - **Kandidat**: Pengelolaan data kandidat, foto, dan nomor urut.
  - **Panitia**: Manajemen struktur panitia pemilihan.
  - **Kategori**: Pengelompokan pemilih dan kandidat.
- **Tools**:
  - **Cetak Kartu**: Pembuatan kartu login pemilih secara otomatis.
  - **Rekapitulasi**: Laporan statistik lengkap dan Berita Acara.
  - **Reset Data**: Fitur aman untuk mereset data pemilihan jika diperlukan.

---

## 🚀 Instalasi dan Deployment

### A. Development (Local)

1. **Clone Repositori**
   ```bash
   git clone https://github.com/yok2-debug/VoteSync-pgsql.git
   cd VoteSync
   ```

2. **Install Dependensi**
   ```bash
   npm install
   ```
   > Perintah ini otomatis menjalankan `prisma generate` via script `postinstall`.

3. **Konfigurasi Environment**
   Copy file `env.example` menjadi `.env` dan sesuaikan isinya:
   ```bash
   cp env.example .env
   ```
   Isi file `.env`:
   ```env
   # Koneksi Database PostgreSQL
   DATABASE_URL="postgresql://user:password@localhost:5432/votesync"

   # Secret Key untuk Session JWT (gunakan string acak yang kuat)
   JWT_SECRET_KEY="rahasia_super_aman_anda_disini"

   # Set "false" jika akses via HTTP (tanpa HTTPS) — aktifkan untuk dev lokal
   COOKIE_SECURE="false"
   ```

4. **Setup Database**
   Pastikan PostgreSQL sudah berjalan, lalu sinkronkan skema database:
   ```bash
   npx prisma db push
   ```

5. **Inisialisasi Akun Admin**
   Buat peran dan akun Super Admin default:
   ```bash
   node prisma/seed.js
   ```
   *Login: **Username** `admin` / **Password** `admin`*

6. **Jalankan Aplikasi**
   ```bash
   npm run dev
   ```
   Akses aplikasi di [http://localhost:3000](http://localhost:3000).

### B. Deployment ke VPS (Production, Tanpa Docker)

1. **Persiapan Server**
   Pastikan **Node.js v20+** dan PostgreSQL sudah terinstall di server VPS.

2. **Environment Variables**
   Buat file `.env` di server. Sesuaikan dengan kredensial database dan akses HTTP/HTTPS Anda:

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/votesync"
   JWT_SECRET_KEY="string_acak_yang_sangat_panjang_dan_aman"

   # PENTING: Set "false" jika akses via HTTP (tanpa SSL/HTTPS)
   # Jika menggunakan HTTPS (rekomendasi), hapus baris ini
   COOKIE_SECURE="false"
   ```

3. **Install, Migrasi, dan Seed**
   ```bash
   # Install dependencies
   npm install

   # Sinkronkan skema database ke PostgreSQL
   npx prisma db push

   # Buat akun Super Admin default (hanya perlu dijalankan sekali)
   node prisma/seed.js

   # Build aplikasi untuk production
   npm run build
   ```

4. **Jalankan Aplikasi**

   **Mode Manual:**
   ```bash
   npm start
   ```

   **Menggunakan PM2 (Rekomendasi agar otomatis restart):**
   ```bash
   npm install -g pm2
   pm2 start npm --name "votesync" -- start
   pm2 save
   pm2 startup
   ```

### C. Deployment Menggunakan Docker (Rekomendasi untuk Linux / Debian VM)

Metode ini menjalankan aplikasi VoteSync (Next.js) dan database PostgreSQL secara terisolasi menggunakan Docker Compose. Pastikan file-file berikut sudah ada di direktori proyek Anda: `Dockerfile`, `.dockerignore`, `docker-compose.yml`.

1. **Prasyarat**
   Pastikan Docker dan Docker Compose plugin sudah terinstal di server/VM Anda:
   ```bash
   docker --version
   docker compose version
   ```

2. **Konfigurasi `docker-compose.yml`**
   Buka file `docker-compose.yml`, lalu sesuaikan nilai berikut:

   - **Generate JWT Secret Key** yang kuat dengan perintah:
     ```bash
     openssl rand -hex 32
     ```
   - Masukkan hasil string tersebut ke baris `JWT_SECRET_KEY`.
   - Sesuaikan `POSTGRES_PASSWORD` dan `DATABASE_URL` jika Anda ingin mengganti password database.
   - Pastikan `COOKIE_SECURE=false` jika akses via HTTP (tanpa HTTPS).

   Contoh konfigurasi service `app`:
   ```yaml
   environment:
     - DATABASE_URL=postgresql://votesync:PASSWORD_ANDA@postgres:5432/votesync
     - JWT_SECRET_KEY=paste_string_rahasia_anda_disini
     - COOKIE_SECURE=false
   ```

3. **(Opsional) Reset Bersih dari Awal**
   Jika sebelumnya sudah pernah menjalankan container/volume lama dan ingin memulai ulang dari nol:
   ```bash
   docker compose down -v
   docker rmi postgres:16-alpine 2>/dev/null
   docker rmi $(docker images 'votesync*' -q) 2>/dev/null
   docker builder prune -f
   ```

4. **Build Image dan Jalankan Container**
   Jalankan perintah ini di dalam direktori proyek. Docker akan otomatis men-download PostgreSQL, mem-build image aplikasi Next.js, dan menyalakan keduanya secara bersamaan:
   ```bash
   docker compose up -d --build
   ```
   > ⚠️ Proses build pertama kali memakan waktu beberapa menit karena RAM VM yang terbatas. Swap akan digunakan secara otomatis. Harap bersabar.

5. **Pastikan Container Berjalan**
   Periksa status container setelah build selesai:
   ```bash
   docker compose ps
   ```
   *Pastikan `votesync-app` dan `votesync-db` berstatus **Up**.*

6. **Inisialisasi Tabel Database + Akun Admin (Satu Perintah)**
   Jalankan perintah berikut untuk membuat seluruh tabel database sekaligus membuat akun Super Admin default secara otomatis:
   ```bash
   docker compose --profile migrate run --rm migrate
   ```
   *Output yang sukses:*
   ```text
   Prisma schema loaded from prisma/schema.prisma
   🚀 Your database is now in sync with your Prisma schema.
   Seeding database...
   Role Super Admin verified/created.
   Admin user 'admin' verified/created with default password: admin
   ```
   > Perintah ini menggunakan service `migrate` yang telah dikonfigurasi di `docker-compose.yml` dengan full `node_modules` (stage builder), sehingga kompatibel penuh dengan Prisma 7.

7. **Akses Aplikasi**
   - **Portal Publik**: `http://<IP-SERVER-ANDA>:3000`
   - **Portal Admin**: `http://<IP-SERVER-ANDA>:3000/admin-login`
   - Login pertama: **Username** `admin` / **Password** `admin`

8. **Perintah Pemeliharaan (Maintenance)**
   - Melihat log aplikasi: `docker compose logs -f app`
   - Melihat log database: `docker compose logs -f postgres`
   - Menghentikan semua container: `docker compose stop`
   - Menjalankan kembali: `docker compose start`

9. **Backup Data Database**
   Data database disimpan di Docker Volume (terpisah dari image). Gunakan `pg_dump` untuk backup:
   ```bash
   # Backup data ke file SQL
   docker exec votesync-db pg_dump -U votesync votesync > votesync-data.sql

   # Restore data dari file SQL
   cat votesync-data.sql | docker exec -i votesync-db psql -U votesync -d votesync
   ```

10. **Menyimpan Image ke File `.tar` (Portabilitas)**
    ```bash
    # Simpan image aplikasi
    docker save votesync-app -o votesync-app.tar

    # Simpan image PostgreSQL
    docker save postgres:16-alpine -o votesync-db.tar

    # Load image di server lain
    docker load -i votesync-app.tar
    docker load -i votesync-db.tar
    ```
    > ⚠️ File `.tar` hanya menyimpan image (blueprint), **bukan data database**. Selalu backup data secara terpisah menggunakan `pg_dump` (lihat langkah 9).

---

## 🔑 Akun Default (Seed)

Jika Anda menjalankan seed database, akun administrator default biasanya adalah:
- **Username**: `admin`
- **Password**: `admin`

*(Pastikan untuk mengubah password ini di environment produksi!)*

## 📝 Catatan Keamanan

- **Password Pemilih**: Aplikasi ini dikonfigurasi untuk menyimpan password pemilih dalam format **plain text**. Hal ini disengaja untuk memudahkan distribusi kredensial (cetak kartu fisik) kepada pemilih dalam lingkungan tertutup. Pastikan database Anda terlindungi dengan baik.
- **Password Admin**: Password administrator tetap di-hash menggunakan bcrypt untuk keamanan.
