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

3. **Konfigurasi Environment**
   Buat file `.env` (copy dari `env.example`) dan sesuaikan:

   ```env
   # Koneksi Database PostgreSQL
   DATABASE_URL="postgresql://user:password@localhost:5432/votesync_db?schema=public"

   # Secret Key untuk Session
   JWT_SECRET_KEY="rahasia_super_aman_anda_disini"
   ```

4. **Setup Database**
   ```bash
   npx prisma migrate dev
   ```

5. **Jalankan Aplikasi**
   ```bash
   npm run dev
   ```
   Akses aplikasi di [http://localhost:3000](http://localhost:3000).

### B. Deployment ke VPS (Production)

1. **Persiapan Server**
   Pastikan Node.js (v18+) dan PostgreSQL sudah terinstall.

2. **Environment Variables**
   Buat file `.env` di server. Penting untuk menambahkan `COOKIE_SECURE` jika Anda tidak menggunakan HTTPS.

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/votesync_production"
   JWT_SECRET_KEY="string_acak_yang_sangat_panjang_dan_aman"
   
   # PENTING: Set "false" jika akses via HTTP (tanpa SSL/HTTPS)
   # Jika menggunakan HTTPS (rekomendasi), set "true" atau hapus baris ini
   COOKIE_SECURE="false"
   ```

3. **Build dan Migrasi**
   ```bash
   # Install dependencies
   npm install

   # Build aplikasi
   npm run build

   # Jalankan migrasi database production
   npx prisma migrate deploy
   ```

4. **Jalankan Aplikasi**
   
   **Mode Manual:**
   ```bash
   npm start
   ```

   **Menggunakan PM2 (Rekomendasi):**
   ```bash
   npm install -g pm2
   pm2 start npm --name "votesync" -- start
   pm2 save
   pm2 startup
   ```

---

## 🔑 Akun Default (Seed)

Jika Anda menjalankan seed database, akun administrator default biasanya adalah:
- **Username**: `admin`
- **Password**: `admin`

*(Pastikan untuk mengubah password ini di environment produksi!)*

## 📝 Catatan Keamanan

- **Password Pemilih**: Aplikasi ini dikonfigurasi untuk menyimpan password pemilih dalam format **plain text**. Hal ini disengaja untuk memudahkan distribusi kredensial (cetak kartu fisik) kepada pemilih dalam lingkungan tertutup. Pastikan database Anda terlindungi dengan baik.
- **Password Admin**: Password administrator tetap di-hash menggunakan bcrypt untuk keamanan.
