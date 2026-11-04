# Implementation Plan: Migrasi Database ke MS SQL Server Local

Dokumen ini berisi panduan dan rencana teknis lengkap untuk memigrasikan database **SiteTracker CMD** dari **PostgreSQL (Neon Serverless)** ke **Microsoft SQL Server Local (On-Premise)** menggunakan Prisma ORM di kemudian hari.

---

## 1. Prasyarat & Persiapan Environment MS SQL Server Lokal

Sebelum mengubah kode aplikasi, pastikan environment MS SQL Server di komputer/server lokal sudah siap:

1. **Aktifkan TCP/IP Protocol**
   - Buka **SQL Server Configuration Manager** → **SQL Server Network Configuration** → **Protocols for MSSQLSERVER (atau SQLEXPRESS)**.
   - Ubah status **TCP/IP** menjadi **Enabled**.
   - Klik kanan **TCP/IP** → **Properties** → tab **IP Addresses** → scroll ke paling bawah (**IPAll**), pastikan **TCP Port** diisi `1433` (dan kosongkan *TCP Dynamic Ports*).
   - Restart service SQL Server.

2. **Aktifkan Mixed Mode Authentication (SQL Server & Windows Auth)**
   - Buka **SQL Server Management Studio (SSMS)** → Klik kanan Server → **Properties** → **Security**.
   - Pilih **SQL Server and Windows Authentication mode**.
   - Pastikan akun `sa` (atau user khusus aplikasi, misal `sitetracker_user`) aktif dan memiliki password serta hak akses `db_owner` pada database target.

3. **Format Connection String (`.env`)**
   Ubah variabel `DATABASE_URL` pada file `.env`:
   ```env
   # Format Umum MS SQL Server di Prisma
   DATABASE_URL="sqlserver://localhost:1433;database=SiteTrackerDB;user=sa;password=PasswordAnda;encrypt=true;trustServerCertificate=true"

   # Jika menggunakan Named Instance (misal SQLEXPRESS):
   # DATABASE_URL="sqlserver://localhost\SQLEXPRESS;database=SiteTrackerDB;user=sa;password=PasswordAnda;encrypt=true;trustServerCertificate=true"
   ```

---

## 2. Perubahan pada `prisma/schema.prisma`

MS SQL Server memiliki beberapa perbedaan kapabilitas dibandingkan PostgreSQL di Prisma ORM. Berikut daftar perubahan wajib pada `prisma/schema.prisma`:

### A. Ubah Datasource Provider
```prisma
datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}
```

### B. Hapus `enum` Native & Ubah Menjadi `String`
Connector `sqlserver` di Prisma **tidak mendukung tipe `enum`**. Ketiga enum saat ini harus dihapus dari `schema.prisma` dan diganti dengan `String` (`@db.VarChar(50)`):

- `enum Role` → Hapus dari schema, ubah field `role` di model `User` menjadi `String @db.VarChar(50)`.
- `enum Category` → Hapus dari schema, ubah field `category` di model `Finding` menjadi `String @db.VarChar(50)`.
- `enum FindingStatus` → Hapus dari schema, ubah field `status` di model `Finding` menjadi `String @default("OPEN") @db.VarChar(50)`.

> **Keuntungan Tambahan:** Dengan mengubah `role` menjadi `String`, kita tidak perlu lagi menjalankan raw SQL `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS ...` yang ada di `src/lib/actions.ts` baris 824 dan 4585.

### C. Tambahkan Kolom `passwordHash` di Model `User` (Pengganti Skema `neon_auth`)
Saat ini di PostgreSQL, autentikasi password disimpan di skema eksternal `"neon_auth"."user"` dan `"neon_auth"."account"` yang diakses menggunakan raw SQL (`$queryRawUnsafe` / `$executeRawUnsafe` di `src/lib/authPassword.ts` dan `src/lib/actions.ts`).
Di MS SQL Server lokal, skema `neon_auth` tidak ada. Solusi paling bersih adalah menyimpan hash password langsung di tabel `users`:
```prisma
model User {
  // ... field lainnya
  passwordHash String?  @map("password_hash") @db.VarChar(255)
}
```

### D. Ubah Scalar Array (`String[]`) Menjadi JSON String (`@db.NVarChar(Max)`)
MS SQL Server **tidak mendukung tipe array primitif** (`String[]`).
- Pada model `User`:
  ```prisma
  // SEBELUM (PostgreSQL):
  projectIds String[] @default([]) @map("project_ids")

  // SESUDAH (MS SQL Server):
  projectIds String   @default("[]") @map("project_ids") @db.NVarChar(Max)
  ```

### E. Atasi Aturan *Multiple Cascade Paths* (Cyclic Referential Actions)
MS SQL Server menolak pembuatan Foreign Key jika terdapat lebih dari satu jalur `CASCADE` atau `SET NULL` menuju tabel yang sama (error SQL Server `1785`).
Pada model `Project`, `User`, dan `Finding`, terdapat relasi dua arah:
- `Project` memiliki `pmId`, `gmId`, `dmId`, `scId` yang mengarah ke `User`.
- `User` memiliki `projectId` yang mengarah ke `Project`.
- `Finding` memiliki `projectId` (ke `Project`), `picId` (ke `User`), dan `reporterId` (ke `User`).

**Solusi di `schema.prisma`:**
Gunakan `onDelete: NoAction, onUpdate: NoAction` pada relasi sekunder agar tidak terjadi siklus cascade di SQL Server:
```prisma
model Project {
  id        String    @id @default(uuid())
  code      String?   @unique @db.VarChar(50)
  name      String    @db.VarChar(255)
  location  String    @db.VarChar(255)
  division  String?   @db.VarChar(100)
  pmId      String?   @map("pm_id")
  pm        User?     @relation("ProjectPM", fields: [pmId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  gmId      String?   @map("gm_id")
  gm        User?     @relation("ProjectGM", fields: [gmId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  dmId      String?   @map("dm_id")
  dm        User?     @relation("ProjectDM", fields: [dmId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  scId      String?   @map("sc_id")
  sc        User?     @relation("ProjectSC", fields: [scId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  createdAt DateTime  @default(now()) @map("created_at")

  users     User[]
  findings  Finding[]

  @@map("projects")
}

model User {
  id           String   @id @default(uuid())
  name         String   @db.VarChar(255)
  email        String   @unique @db.VarChar(255)
  role         String   @db.VarChar(50)
  phoneNumber  String   @map("phone_number") @db.VarChar(50)
  employeeCode String?  @map("employee_code") @db.VarChar(50)
  division     String?  @db.VarChar(100)
  passwordHash String?  @map("password_hash") @db.VarChar(255)
  projectId    String?  @map("project_id")
  project      Project? @relation(fields: [projectId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  projectIds   String   @default("[]") @map("project_ids") @db.NVarChar(Max)
  // ...
}

model Finding {
  // ...
  projectId  String  @map("project_id")
  project    Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  picId      String  @map("pic_id")
  pic        User    @relation("PicFindings", fields: [picId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  reporterId String  @map("reporter_id")
  reporter   User    @relation("ReporterFindings", fields: [reporterId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  // ...
}
```
*(Catatan: Saat menghapus `User` di `src/lib/actions.ts`, pastikan meng-update `pmId/gmId/dmId/scId` di `Project` menjadi `null` terlebih dahulu via Prisma sebelum `prisma.user.delete` dijalankan).*

### F. Ganti `@db.Text` Menjadi `@db.NVarChar(Max)`
Di MS SQL Server, tipe data `TEXT` dan `NTEXT` sudah *deprecated*. Ganti semua anotasi `@db.Text` menjadi `@db.NVarChar(Max)`:
- `Finding`: `description`, `photoFindingUrl`, `picResponse`, `photoResolutionUrl`, `rejectionNote`
- `PatrolReport`: `recipients`, `messageNote`
- `AuditLog`: `details`
- `SystemSetting`: `value`

---

## 3. Daftar File Kode Aplikasi yang Perlu Disesuaikan

Berdasarkan hasil audit kode (`src/` dan `prisma/`), berikut titik-titik spesifik yang perlu diubah saat migrasi:

### A. `src/lib/authPassword.ts`
- Saat ini fungsi `updateNeonAuthAccountPassword` menggunakan `$queryRawUnsafe` dan `$executeRawUnsafe` dengan sintaks spesifik PostgreSQL (`"neon_auth"."user"`, `"neon_auth"."account"`, `$1::uuid`, `ON CONFLICT DO UPDATE`, `NOW()`).
- **Perubahan:** Sederhanakan fungsi tersebut menggunakan Prisma Client standar untuk meng-update field `passwordHash` langsung pada tabel `User`:
  ```ts
  const hashedPassword = await hashPasswordScrypt(newPasswordPlain);
  await prisma.user.update({
    where: { email: cleanEmail },
    data: { passwordHash: hashedPassword },
  });
  ```

### B. `src/lib/actions.ts`
1. **Hapus Raw SQL PostgreSQL (`$queryRawUnsafe` / `$executeRawUnsafe`):**
   - **Baris ~415:** Query `SELECT password FROM "neon_auth"."account"` saat login → Ganti dengan membaca `dbUser.passwordHash` langsung dari objek `User` hasil query Prisma.
   - **Baris ~824 & ~4585:** Query `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS ...` → Hapus karena kolom `role` di SQL Server sudah bertipe `String` (`VarChar(50)`).
   - **Baris ~860, ~868, ~876:** Fallback raw SQL `UPDATE users` / `INSERT INTO users` yang menggunakan placeholder PostgreSQL `$1, $2` dan `::"Role"` → Hapus atau gunakan `prisma.user.upsert` / `prisma.user.update` standar.
   - **Baris ~2038 & ~2119:** Query raw ke `"neon_auth"."user"` dan `public.users` → Ganti dengan `prisma.user.findMany()` standar.

2. **Handling `projectIds` (JSON String vs Array):**
   - Buat helper `parseProjectIds(raw)` dan `serializeProjectIds(arr)` di `src/lib/actions.ts`.
   - Pada pembacaan user (baris ~366, ~1428, ~1593, ~1758, ~1881, ~1955, ~2105), ubah `Array.isArray(dbUser.projectIds)` menjadi `parseProjectIds(dbUser.projectIds)`.
   - Pada penyimpanan user (`prisma.user.create` / `prisma.user.update` di baris ~1437, ~1467, ~1603, ~1620, ~1769, ~1828, ~1895, ~1965), bungkus nilai `projectIds` dengan `JSON.stringify(...)`.
   - Pada query filter `{ projectIds: { has: projectId } }` (baris ~2074 & ~2079), ubah menjadi `{ projectIds: { contains: projectId } }`.

3. **Hapus `mode: "insensitive"` pada Query Filter Prisma:**
   - MS SQL Server secara default menggunakan collation Case-Insensitive (`SQL_Latin1_General_CP1_CI_AS`), dan connector Prisma `sqlserver` tidak mengizinkan properti `mode: "insensitive"`.
   - Hapus `mode: "insensitive"` pada `src/lib/actions.ts` di baris:
     - `122-124` (pencarian `AuditLog`)
     - `350` (pencarian email/nama saat login)
     - `1038-1039`, `1346-1352`, `1406-1407` (pencarian nama/kode `Project`)
     - `2237-2239` (pencarian `Finding`)
     - `4287-4291` (pencarian `PatrolReport`)

### C. `prisma/seed.ts`
- Hapus import `Role, Category, FindingStatus` dari `@prisma/client` dan gunakan string literal (`"ADMIN"`, `"OPEN"`, `"K3_SAFETY"`, dll.) atau import dari `src/types`.
- Jika ada pengisian `projectIds` di seed, ubah dari `["proj-1"]` menjadi `JSON.stringify(["proj-1"])`.

---

## 4. Langkah Eksekusi Migrasi (Saat Akan Diimplementasikan)

### Skenario 1: Database Baru di MS SQL Server (Fresh Install + Seed)
1. Pastikan service MS SQL Server lokal berjalan dan database kosong (misal `SiteTrackerDB`) sudah dibuat atau user memiliki izin `CREATE DATABASE`.
2. Terapkan perubahan pada `prisma/schema.prisma`, `.env`, `src/lib/authPassword.ts`, `src/lib/actions.ts`, dan `prisma/seed.ts`.
3. Jalankan perintah berikut di terminal:
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

### Skenario 2: Memindahkan Data Eksisting dari Neon PostgreSQL ke MS SQL Server Lokal
1. **Export Data dari Neon PostgreSQL:**
   Sebelum mengubah `schema.prisma`, jalankan script backup untuk mengekspor seluruh tabel (`projects`, `users`, `findings`, `patrol_reports`, `audit_logs`, `system_settings`, `ticket_sequences`, serta password hash dari `"neon_auth"."account"`) ke file `backup_neon_data.json`.
2. **Push Schema ke SQL Server Lokal:**
   Ubah `schema.prisma` dan `.env` ke MS SQL Server lokal, lalu jalankan:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
3. **Import Data ke SQL Server Lokal:**
   Jalankan script migrasi data yang membaca `backup_neon_data.json` lalu memasukkan data secara berurutan:
   - `SystemSetting` & `TicketSequence`
   - `Project` (dengan `pmId, gmId, dmId, scId` diset `null` terlebih dahulu agar tidak terkena kendala urutan Foreign Key)
   - `User` (dengan `projectIds` di-serialize menggunakan `JSON.stringify` dan `passwordHash` diambil dari hasil export `neon_auth.account`)
   - Update kembali `Project` untuk mengisi `pmId, gmId, dmId, scId`
   - `Finding`, `PatrolReport`, dan `AuditLog`

---

## 5. Catatan Deployment Lokal (On-Premise)
- Karena database berada di **MS SQL Server Local**, aplikasi Next.js (`SiteTracker`) sebaiknya di-host di jaringan lokal/server kantor yang sama (On-Premise):
  ```bash
  npm run build
  npm run start
  ```
- Untuk menjaga aplikasi tetap berjalan otomatis di Windows Server / PC Lokal saat restart, gunakan **PM2** (`pm2 start npm --name "sitetracker" -- start`) atau **IIS Reverse Proxy**.
