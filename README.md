# VoteSync - Sistem E-Voting Modern

VoteSync adalah aplikasi E-Voting (pemungutan suara elektronik) full-stack yang dirancang untuk menyediakan platform pemilihan yang aman, efisien, dan transparan. Dikembangkan secara khusus untuk memenuhi kebutuhan digitalisasi di lingkungan sekolah, aplikasi ini hadir sebagai solusi modern untuk mensukseskan agenda demokrasi di SMA Negeri 1 Sapeken, baik dalam pelaksaan Pemilihan Ketua OSIS maupun Pemilihan Ketua Kelas secara praktis dan terintegrasi.

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

- **Daftar Pemilihan**: Melihat pemilihan yang tersedia.
- **Profil Kandidat**: Informasi detail, visi, dan misi setiap kandidat.
- **Real Count**: Menampilkan hasil pemilihan yang sudah berakhir. Hasil pemilihan yang masih berlangsung tidak ditampilkan kepada publik.

### 2. Portal Pemilih

- **Login Sederhana**: Menggunakan ID Pemilih dan password yang telah didistribusikan.
- **One Voter, One Vote**: Sistem memastikan setiap pemilih hanya dapat memberikan satu suara per pemilihan.
- **Antarmuka Intuitif**: Desain yang mudah digunakan.

### 3. Portal Admin

- **Role-Based Access Control (RBAC)**: Manajemen hak akses granular untuk berbagai peran admin.
- **Manajemen Data**:
  - **Pemilih**: CRUD data pemilih, import massal menggunakan XLSX, serta pembuatan dan pengelolaan password.
  - **Kandidat**: Pengelolaan data kandidat, foto, dan nomor urut.
  - **Panitia**: Manajemen struktur panitia pemilihan.
  - **Kategori**: Pengelompokan pemilih dan pengaturan pemilihan yang dapat diikuti.
  - **Pengguna Admin**: Pengelolaan akun administrator sesuai hak akses.
- **Tools**:
  - **Cetak Kartu**: Pembuatan kartu login pemilih. Password sementara ditampilkan untuk kebutuhan distribusi/cetak dan tidak disimpan sebagai plaintext di database.
  - **Rekapitulasi**: Laporan statistik dan hasil pemilihan.
  - **Real Count**: Monitoring hasil seluruh pemilihan untuk admin dengan permission `real_count`.
  - **Pengaturan Real Count**: Memilih satu pemilihan sebagai pemilihan utama pada tampilan Real Count.
  - **Reset System**: Reset sistem pemilihan, hanya dapat dilakukan oleh Super Admin.

---

## 🚀 Instalasi dan Deployment

### A. Development (Local)

1. **Clone Repositori**
   ```bash
   git clone https://github.com/yok2-debug/VoteSync-pgsql.git
   cd VoteSync-pgsql
   ```

2. **Install Dependensi**
   ```bash
   npm install
   ```
   > Perintah ini otomatis menjalankan `prisma generate` melalui script `postinstall`.

3. **Konfigurasi Environment**
   Copy file `env.example` menjadi `.env`:
   ```bash
   cp env.example .env
   ```
   Edit `.env`:
   ```env
   # ----- Keamanan -----

   # Generate dengan: openssl rand -hex 32
   JWT_SECRET_KEY="paste-hasil-openssl-rand-hex-32-disini"

   # Salt untuk anonymisasi suara (SHA-256).
   # JANGAN diubah setelah pemilihan berjalan!
   # Generate dengan: openssl rand -hex 32
   VOTE_SECRET_SALT="paste-hasil-openssl-rand-hex-32-yang-berbeda-disini"

   # Password awal Super Admin.
   # Hanya digunakan saat akun admin belum ada.
   INITIAL_ADMIN_PASSWORD="ganti-dengan-password-awal-super-admin-yang-kuat"

   # ----- Cookie -----

   # Set "false" jika akses melalui HTTP.
   # Untuk HTTPS production gunakan "true".
   COOKIE_SECURE="false"

   # ----- Database PostgreSQL -----

   POSTGRES_USER="votesync"
   POSTGRES_PASSWORD="ganti-dengan-password-kuat-anda"
   POSTGRES_DB="votesync"

   # ----- Aplikasi -----

   APP_PORT="3000"
   ```

4. **Setup Database**
   Pastikan PostgreSQL sudah berjalan, kemudian sinkronkan skema:
   ```bash
   npx prisma db push
   ```

5. **Inisialisasi Akun Admin**
   Jalankan seed:
   ```bash
   node prisma/seed.js
   ```
   Pada instalasi baru, akun Super Admin dibuat dengan:
   - **Username**: `admin`
   - **Password**: nilai `INITIAL_ADMIN_PASSWORD`

   > Jika akun admin sudah ada, seed tidak mengganti password yang sudah ada.

6. **Jalankan Aplikasi**
   ```bash
   npm run dev
   ```
   Akses: [http://localhost:3000](http://localhost:3000)

### B. Deployment ke VPS (Production, Tanpa Docker)

1. **Persiapan Server**
   Pastikan server memiliki:
   - Node.js v20+
   - PostgreSQL

2. **Environment Variables**
   Buat file `.env`:
   ```env
   # ----- Keamanan -----

   JWT_SECRET_KEY="paste-hasil-openssl-rand-hex-32-disini"

   # JANGAN diubah setelah pemilihan berjalan!
   VOTE_SECRET_SALT="paste-hasil-openssl-rand-hex-32-yang-berbeda-disini"

   # Password awal Super Admin
   INITIAL_ADMIN_PASSWORD="ganti-dengan-password-awal-super-admin-yang-kuat"

   # ----- Cookie -----

   COOKIE_SECURE="false"

   # ----- Database PostgreSQL -----

   POSTGRES_USER="votesync"
   POSTGRES_PASSWORD="ganti-dengan-password-kuat-anda"
   POSTGRES_DB="votesync"

   # ----- Aplikasi -----

   APP_PORT="3000"
   ```

3. **Install, Migrasi, dan Seed**
   ```bash
   npm install

   npx prisma db push

   node prisma/seed.js

   npm run build
   ```

4. **Jalankan Aplikasi**

   **Mode Manual:**
   ```bash
   npm start
   ```

   **Menggunakan PM2:**
   ```bash
   npm install -g pm2
   pm2 start npm --name "votesync" -- start
   pm2 save
   pm2 startup
   ```

### C. Deployment Menggunakan Docker

Metode ini menjalankan aplikasi VoteSync dan PostgreSQL menggunakan Docker Compose. Konfigurasi sensitif disimpan melalui file `.env`.

1. **Prasyarat**
   Pastikan Docker dan Docker Compose plugin sudah terinstal:
   ```bash
   docker --version
   docker compose version
   ```

2. **Konfigurasi `.env`**
   ```bash
   cp env.example .env
   ```
   Edit `.env`:
   ```env
   # ----- Keamanan -----

   # Generate dengan: openssl rand -hex 32
   JWT_SECRET_KEY="paste-hasil-openssl-rand-hex-32-disini"

   # Generate dengan: openssl rand -hex 32
   # JANGAN diubah setelah pemilihan berjalan!
   VOTE_SECRET_SALT="paste-hasil-openssl-rand-hex-32-yang-berbeda-disini"

   # Password awal Super Admin.
   INITIAL_ADMIN_PASSWORD="ganti-dengan-password-awal-super-admin-yang-kuat"

   # ----- Cookie -----

   COOKIE_SECURE="false"

   # ----- Database PostgreSQL -----

   POSTGRES_USER="votesync"
   POSTGRES_PASSWORD="ganti-dengan-password-kuat-anda"
   POSTGRES_DB="votesync"

   # ----- Aplikasi -----

   APP_PORT="3000"
   ```

   > 💡 Generate secret dengan perintah berikut. Jalankan **dua kali** dan gunakan hasil yang berbeda untuk `JWT_SECRET_KEY` dan `VOTE_SECRET_SALT`:
   > ```bash
   > openssl rand -hex 32
   > ```

   > ⚠️ **Penting**: Jangan mengubah `VOTE_SECRET_SALT` setelah pemilihan berjalan karena nilai tersebut digunakan dalam proses anonimisasi suara.

3. **Build Image dan Jalankan Container**
   Jalankan dari direktori proyek:
   ```bash
   docker compose up -d --build
   ```

4. **Pastikan Container Berjalan**
   ```bash
   docker compose ps
   ```
   *Pastikan `votesync-app` dan `votesync-db` berjalan dengan baik.*

5. **Inisialisasi Database dan Akun Admin**
   Jalankan:
   ```bash
   docker compose --profile migrate run --rm migrate
   ```
   Perintah tersebut akan:
   - menjalankan `prisma db push`;
   - membuat role Super Admin jika belum ada;
   - membuat akun admin jika belum ada;
   - menggunakan `INITIAL_ADMIN_PASSWORD` sebagai password awal.

   > Jika akun admin sudah ada, password tidak ditimpa oleh seed.

6. **Akses Aplikasi**
   - **Portal Publik**: `http://<IP-SERVER-ANDA>:<APP_PORT>`
   - **Portal Admin**: `http://<IP-SERVER-ANDA>:<APP_PORT>/admin-login`

   Login pertama:
   - **Username**: `admin`
   - **Password**: nilai `INITIAL_ADMIN_PASSWORD`

   > 🔑 Setelah login pertama, disarankan mengganti password administrator.

7. **Perintah Pemeliharaan**

   | Perintah | Fungsi |
   |---|---|
   | `docker compose logs -f app` | Melihat log aplikasi |
   | `docker compose logs -f postgres` | Melihat log PostgreSQL |
   | `docker compose stop` | Menghentikan container |
   | `docker compose start` | Menjalankan kembali container |
   | `docker compose down` | Menghapus container tanpa menghapus volume |
   | `docker compose up -d --build` | Rebuild image dan menjalankan aplikasi |

8. **Backup Database**

   Backup:
   ```bash
   docker exec votesync-db pg_dump -U votesync votesync > votesync-backup-$(date +%Y%m%d).sql
   ```

   Restore:
   ```bash
   cat votesync-backup-YYYYMMDD.sql | docker exec -i votesync-db psql -U votesync -d votesync
   ```

9. **Menyimpan Image Docker**

   Untuk mengetahui nama image aplikasi yang digunakan:
   ```bash
   docker image ls
   ```

   Simpan image aplikasi:
   ```bash
   docker save votesync-pgsql-app -o votesync-app.tar
   ```

   Simpan image PostgreSQL:
   ```bash
   docker save postgres:16-alpine -o postgres.tar
   ```

   Load di server lain:
   ```bash
   docker load -i votesync-app.tar
   docker load -i postgres.tar
   ```

   > ⚠️ File `.tar` hanya menyimpan **image**, bukan data PostgreSQL. Backup database tetap harus dilakukan secara terpisah menggunakan `pg_dump`.

10. **Reset Bersih dari Awal**

    > ⚠️ **PERINGATAN**: Perintah berikut menghapus volume database dan data pemilihan.

    ```bash
    docker compose down -v
    docker rmi postgres:16-alpine 2>/dev/null
    docker rmi $(docker images 'votesync*' -q) 2>/dev/null
    docker builder prune -f
    ```

### D. Deployment Menggunakan Portainer (Via Git Repository)

Jika server menggunakan Portainer, deployment dapat dilakukan melalui repository GitHub.

1. **Buka Portainer**
   - Masuk ke Portainer.
   - Pilih environment.
   - Pilih **Stacks**.
   - Klik **+ Add stack**.

2. **Pilih Repository**
   - **Name**: `votesync`
   - **Build method**: Repository
   - **Repository URL**: `https://github.com/yok2-debug/VoteSync-pgsql`
   - **Repository reference**: `refs/heads/main`
   - **Compose path**: `portainer-docker-compose.yml`

3. **Environment Variables**
   Masukkan:
   ```env
   POSTGRES_USER=votesync
   POSTGRES_PASSWORD=ganti-dengan-password-kuat-anda
   POSTGRES_DB=votesync

   JWT_SECRET_KEY=isi-dengan-hasil-openssl-rand-hex-32
   VOTE_SECRET_SALT=isi-dengan-hasil-openssl-rand-hex-32-yang-berbeda
   INITIAL_ADMIN_PASSWORD=ganti-dengan-password-awal-super-admin-yang-kuat

   COOKIE_SECURE=false
   APP_PORT=3000
   ```

   > 💡 Gunakan nilai yang berbeda untuk `JWT_SECRET_KEY` dan `VOTE_SECRET_SALT`.

4. **Deploy Stack**
   Klik **Deploy the stack**.

   Portainer akan mengambil repository, membangun image aplikasi, dan menjalankan service yang didefinisikan dalam `portainer-docker-compose.yml`.

5. **Inisialisasi Database dan Admin**
   Setelah stack berjalan, buka **Console** pada container `votesync-app`.

   Jalankan:
   ```bash
   npx prisma db push && node prisma/seed.js
   ```

   Pada instalasi baru, akun:
   - **Username**: `admin`
   - **Password**: nilai `INITIAL_ADMIN_PASSWORD`

   > Jika akun admin sudah ada, password tidak akan ditimpa.

---

## 🔑 Akun Default (Seed)

Pada instalasi database baru, seed membuat role dan akun Super Admin:

- **Username**: `admin`
- **Password**: nilai `INITIAL_ADMIN_PASSWORD`

> Password admin disimpan menggunakan bcrypt. Seed tidak mengganti password akun admin yang sudah ada.

---

## 🔐 Catatan Keamanan

### Password Pemilih

Password pemilih tidak disimpan sebagai plaintext di database.

Pada pembuatan/import/reset pemilih:
- sistem menghasilkan password sementara yang dapat dibaca;
- password tersebut dapat ditampilkan untuk kebutuhan pencetakan/distribusi;
- database hanya menyimpan bcrypt hash;
- password plaintext tidak disimpan kembali oleh aplikasi.

> Jika password yang sudah dibagikan hilang, buat/reset password baru dan distribusikan kembali kepada pemilih.

### Password Admin

Password administrator disimpan menggunakan bcrypt.

`INITIAL_ADMIN_PASSWORD` hanya digunakan sebagai password bootstrap ketika akun admin belum ada. Seed tidak mengganti password administrator yang sudah ada.

### Anonimitas Suara

Identitas pemilih dalam data suara dianonimkan menggunakan SHA-256 + `VOTE_SECRET_SALT`.

> ⚠️ Jaga kerahasiaan `VOTE_SECRET_SALT` dan jangan mengubahnya setelah pemilihan berjalan.

### Validasi Voting

Sistem memvalidasi:
- status pemilihan;
- waktu mulai dan berakhir;
- hak kategori pemilih;
- status pemilih;
- satu suara per pemilih pada setiap pemilihan.

Operasi penting terkait pemilihan menggunakan mekanisme locking PostgreSQL untuk mencegah konflik perubahan data selama proses voting.

### Real Count

Hasil suara tidak dipublikasikan kepada publik selama pemilihan masih berlangsung.

Halaman Real Count publik hanya menampilkan hasil pemilihan yang telah mencapai atau melewati `endDate`.

Pada sisi admin, pengguna yang memiliki permission `real_count` dapat memantau seluruh pemilihan melalui halaman Real Count dan memilih satu pemilihan sebagai pemilihan utama melalui Pengaturan Real Count.

### Reset System

Fitur Reset System hanya tersedia untuk Super Admin dan dapat menghapus atau mengatur ulang data pemilihan sesuai fungsi yang tersedia. Gunakan fitur ini dengan hati-hati dan pastikan backup tersedia sebelum melakukan reset.
