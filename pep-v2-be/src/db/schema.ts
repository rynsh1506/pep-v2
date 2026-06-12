import { mysqlTable, int, varchar, timestamp, mysqlEnum, text, datetime, longtext } from 'drizzle-orm/mysql-core';

// ==========================================
// CADEB_DB SCHEMA
// ==========================================

export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  namaLengkap: varchar('nama_lengkap', { length: 100 }),
  level: int('level').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const candidates = mysqlTable('candidates', {
  id: int('id').primaryKey().autoincrement(),
  namaCadeb: varchar('nama_cadeb', { length: 255 }).notNull(),
  noIdentitas: varchar('no_identitas', { length: 50 }).notNull(),
  namaPasangan: varchar('nama_pasangan', { length: 255 }),
  noIdentitasPasangan: varchar('no_identitas_pasangan', { length: 50 }),
  keteranganPep: varchar('keterangan_pep', { length: 100 }).notNull(),
  goLive: varchar('go_live', { length: 10 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  kategori: varchar('kategori', { length: 50 }).default('Cadeb').notNull(),
});

export const approvalRequests = mysqlTable('approval_requests', {
  id: int('id').primaryKey().autoincrement(),
  candidateId: int('candidate_id').references(() => candidates.id, { onDelete: 'cascade' }),
  type: mysqlEnum('type', ['EDIT', 'DELETE']).notNull(),
  oldData: longtext('old_data'),
  newData: longtext('newData'),
  requesterId: int('requester_id').references(() => users.id),
  l2Status: mysqlEnum('l2_status', ['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
  l2ApproverId: int('l2_approver_id'),
  l2Notes: text('l2_notes'),
  l3Status: mysqlEnum('l3_status', ['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
  l3ApproverId: int('l3_approver_id'),
  l3Notes: text('l3_notes'),
  finalStatus: mysqlEnum('final_status', ['PENDING', 'COMPLETED', 'REJECTED']).default('PENDING'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// ==========================================
// DB_DTOT SCHEMA
// ==========================================

export const pengajuanDtot = mysqlTable('pengajuan_dtot', {
  id: int('id').primaryKey().autoincrement(),
  tanggal: datetime('tanggal').notNull(),
  namaCadeb: varchar('nama_cadeb', { length: 255 }).notNull(),
  nik: varchar('nik', { length: 50 }).notNull(),
  namaPasangan: varchar('nama_pasangan', { length: 50 }).notNull(),
  nikPasangan: varchar('nik_pasangan', { length: 50 }).notNull(),
  hasilPengecekan: mysqlEnum('hasil_pengecekan', ['Belum Dicek', 'Terindikasi', 'Tidak Terindikasi']).default('Belum Dicek'),
  hasilPep: varchar('hasil_pep', { length: 50 }).notNull(),
  kategori: varchar('kategori', { length: 50 }),
  keterangan: text('keterangan'),
  buktiSs: text('bukti_ss'),
  checkedBy: int('checked_by'),
  checkedAt: datetime('checked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export const cekReksaloan = mysqlTable('cekreksaloan', {
  id: int('id').primaryKey().autoincrement(),
  noKontrak: varchar('no_kontrak', { length: 50 }).notNull(),
  namaDebitur: varchar('nama_debitur', { length: 155 }),
  nik: varchar('nik', { length: 20 }),
  hasilDtot: varchar('hasil_dtot', { length: 50 }),
  hasilPep: varchar('hasil_pep', { length: 50 }),
  keterangan: text('keterangan'),
  buktiSs: varchar('bukti_ss', { length: 255 }),
  checkedBy: int('checked_by'),
  checkedAt: datetime('checked_at').defaultNow(),
});
