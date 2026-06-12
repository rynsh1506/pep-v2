import { Elysia, t } from 'elysia';
import { db, dbDtot } from '../db';
import { terduga, changeRequests, pengajuanDtot, cekReksaloan, users } from '../db/schema';
import { eq, and, sql, desc, ne, isNull } from 'drizzle-orm';
import { jwt } from '@elysiajs/jwt';

export const dtotRoutes = new Elysia({ prefix: '/dtot' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'supersecretjwtkeychangeinprod',
    })
  )
  .derive(async ({ headers, jwt, set }) => {
    const auth = headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      set.status = 401;
      return { user: null };
    }
    const token = auth.substring(7);
    const user = await jwt.verify(token);
    if (!user) {
      set.status = 401;
      return { user: null };
    }
    return { user: user as any };
  })
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Unauthorized' };
    }
  })
  .get('/', async ({ query }) => {
    const { search, type, page = 1, limit = 10 } = query;
    try {
      const offset = (Number(page) - 1) * Number(limit);
      let conditions = [];

      // Only fetch records that are NOT soft-deleted
      conditions.push(isNull(terduga.deletedAt));

      if (search) {
        conditions.push(
          sql`(${terduga.nama} LIKE ${'%' + search + '%'} OR ${terduga.kodeDensus} LIKE ${'%' + search + '%'} OR ${terduga.alamat} LIKE ${'%' + search + '%'} OR ${terduga.deskripsi} LIKE ${'%' + search + '%'})`
        );
      }
      if (type && type !== '') {
        conditions.push(eq(terduga.terdugaType, type as any));
      }

      const results = await dbDtot.select()
        .from(terduga)
        .where(and(...conditions))
        .orderBy(desc(terduga.createdAt))
        .limit(Number(limit))
        .offset(offset);

      // Fetch count for pagination
      const countResult = await dbDtot.select({ count: sql<number>`count(*)` })
        .from(terduga)
        .where(and(...conditions));
      const total = countResult[0]?.count || 0;

      return {
        success: true,
        data: results,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, {
    query: t.Object({
      search: t.Optional(t.String()),
      type: t.Optional(t.String()),
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    })
  })
  .get('/stats', async () => {
    try {
      const totalRes = await dbDtot.select({ count: sql<number>`count(*)` }).from(terduga).where(isNull(terduga.deletedAt));
      const orangRes = await dbDtot.select({ count: sql<number>`count(*)` }).from(terduga).where(and(isNull(terduga.deletedAt), eq(terduga.terdugaType, 'Orang')));
      const korporasiRes = await dbDtot.select({ count: sql<number>`count(*)` }).from(terduga).where(and(isNull(terduga.deletedAt), eq(terduga.terdugaType, 'Korporasi')));

      return {
        success: true,
        stats: {
          total: totalRes[0]?.count || 0,
          orang: orangRes[0]?.count || 0,
          korporasi: korporasiRes[0]?.count || 0
        }
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  })
  .post('/', async ({ body, user, set }) => {
    try {
      const { nama, terdugaType, kodeDensus, tempatLahir, tanggalLahir, wnAsalNegara, deskripsi, alamat } = body;

      // Note: Legacy code does a direct save for everyone. Let's do direct insert into terduga.
      await dbDtot.insert(terduga).values({
        nama,
        terdugaType,
        kodeDensus: kodeDensus || null,
        tempatLahir: tempatLahir || null,
        tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : null,
        wnAsalNegara: wnAsalNegara || null,
        deskripsi: deskripsi || null,
        alamat: alamat || null,
        isPending: 0
      });

      return { success: true, message: 'Data DTTOT berhasil ditambahkan.' };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  }, {
    body: t.Object({
      nama: t.String(),
      terdugaType: t.Union([t.Literal('Orang'), t.Literal('Korporasi'), t.Literal('Tidak Terduga')]),
      kodeDensus: t.Optional(t.String()),
      tempatLahir: t.Optional(t.String()),
      tanggalLahir: t.Optional(t.String()),
      wnAsalNegara: t.Optional(t.String()),
      deskripsi: t.Optional(t.String()),
      alamat: t.Optional(t.String()),
    })
  })
  .put('/:id', async ({ params, body, user, set }) => {
    const id = parseInt(params.id);
    try {
      const existing = await dbDtot.select().from(terduga).where(eq(terduga.id, id)).limit(1);
      if (existing.length === 0) {
        set.status = 404;
        return { success: false, error: 'Data tidak ditemukan.' };
      }

      // If user level is 1 (Staff), edit must go to change_requests approval
      if (user.level === 1) {
        // Serialized body with id
        const requestData = { id, ...body };
        await dbDtot.insert(changeRequests).values({
          targetId: id,
          requestType: 'EDIT',
          dataJson: JSON.stringify(requestData),
          requesterId: user.id as number,
          status: 'PENDING_SPV'
        });

        // Set pending flag in database
        await dbDtot.update(terduga).set({ isPending: 1 }).where(eq(terduga.id, id));

        return { success: true, message: 'Permintaan perubahan data (EDIT) DTTOT berhasil dikirim untuk approval.' };
      }

      // If L2/L3/L4, edit directly
      await dbDtot.update(terduga).set({
        nama: body.nama,
        terdugaType: body.terdugaType as any,
        kodeDensus: body.kodeDensus || null,
        tempatLahir: body.tempatLahir || null,
        tanggalLahir: body.tanggalLahir ? new Date(body.tanggalLahir) : null,
        wnAsalNegara: body.wnAsalNegara || null,
        deskripsi: body.deskripsi || null,
        alamat: body.alamat || null,
        isPending: 0
      }).where(eq(terduga.id, id));

      return { success: true, message: 'Data DTTOT berhasil diperbarui.' };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  }, {
    body: t.Object({
      nama: t.String(),
      terdugaType: t.Union([t.Literal('Orang'), t.Literal('Korporasi'), t.Literal('Tidak Terduga')]),
      kodeDensus: t.Optional(t.String()),
      tempatLahir: t.Optional(t.String()),
      tanggalLahir: t.Optional(t.String()),
      wnAsalNegara: t.Optional(t.String()),
      deskripsi: t.Optional(t.String()),
      alamat: t.Optional(t.String()),
    })
  })
  .delete('/:id', async ({ params, user, set }) => {
    const id = parseInt(params.id);
    try {
      const existing = await dbDtot.select().from(terduga).where(eq(terduga.id, id)).limit(1);
      if (existing.length === 0) {
        set.status = 404;
        return { success: false, error: 'Data tidak ditemukan.' };
      }

      // If user level is 1 (Staff), delete must go to approval
      if (user.level === 1) {
        await dbDtot.insert(changeRequests).values({
          targetId: id,
          requestType: 'DELETE',
          dataJson: '{}',
          requesterId: user.id as number,
          status: 'PENDING_SPV'
        });

        // Set pending flag in database
        await dbDtot.update(terduga).set({ isPending: 1 }).where(eq(terduga.id, id));

        return { success: true, message: 'Permintaan penghapusan data (DELETE) DTTOT berhasil dikirim untuk approval.' };
      }

      // Admin or higher soft-deletes directly
      await dbDtot.update(terduga).set({
        deletedAt: new Date(),
        isPending: 0
      }).where(eq(terduga.id, id));

      return { success: true, message: 'Data DTTOT berhasil dihapus.' };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  })
  .get('/approvals', async ({ user, set }) => {
    if (user.level < 2) {
      set.status = 403;
      return { success: false, error: 'Akses ditolak.' };
    }

    try {
      let conditions = [];

      if (user.level === 2) {
        conditions.push(eq(changeRequests.status, 'PENDING_SPV'));
      } else if (user.level === 3) {
        conditions.push(eq(changeRequests.status, 'PENDING_MANAGER'));
      } else {
        // L4 / Admin sees both pending status
        conditions.push(sql`(${changeRequests.status} = 'PENDING_SPV' OR ${changeRequests.status} = 'PENDING_MANAGER')`);
      }

      const results = await dbDtot.select()
        .from(changeRequests)
        .where(and(...conditions))
        .orderBy(desc(changeRequests.createdAt));

      return { success: true, data: results };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  })
  .post('/approvals/:id/action', async ({ params, body, user, set }) => {
    if (user.level < 2) {
      set.status = 403;
      return { success: false, error: 'Akses ditolak.' };
    }

    const id = parseInt(params.id);
    const { action } = body; // action: 'APPROVE' | 'REJECT'

    try {
      const existing = await dbDtot.select().from(changeRequests).where(eq(changeRequests.id, id)).limit(1);
      if (existing.length === 0) {
        set.status = 404;
        return { success: false, error: 'Permintaan approval tidak ditemukan.' };
      }

      const req = existing[0];

      if (action === 'REJECT') {
        // Rejection
        if (req.targetId) {
          await dbDtot.update(terduga).set({ isPending: 0 }).where(eq(terduga.id, req.targetId));
        }

        await dbDtot.update(changeRequests).set({
          status: 'REJECTED',
          approverId: user.id as number,
          processedAt: new Date()
        }).where(eq(changeRequests.id, id));

        return { success: true, message: 'Permintaan approval berhasil ditolak.' };
      }

      // Approval flow
      if (user.level === 2) {
        // Supervisor forwards to Manager
        await dbDtot.update(changeRequests).set({
          status: 'PENDING_MANAGER',
          approverId: user.id as number
        }).where(eq(changeRequests.id, id));

        return { success: true, message: 'Permintaan berhasil disetujui Supervisor dan diteruskan ke Manager.' };
      }

      // Manager or Admin - Final Approval
      if (user.level >= 3) {
        if (req.requestType === 'DELETE' && req.targetId) {
          // Soft delete terduga
          await dbDtot.update(terduga).set({
            deletedAt: new Date(),
            isPending: 0
          }).where(eq(terduga.id, req.targetId));
        } else if (req.requestType === 'EDIT' && req.targetId) {
          const data = JSON.parse(req.dataJson);
          await dbDtot.update(terduga).set({
            nama: data.nama,
            terdugaType: data.terdugaType,
            kodeDensus: data.kodeDensus || null,
            tempatLahir: data.tempatLahir || null,
            tanggalLahir: data.tanggalLahir ? new Date(data.tanggalLahir) : null,
            wnAsalNegara: data.wnAsalNegara || null,
            deskripsi: data.deskripsi || null,
            alamat: data.alamat || null,
            isPending: 0
          }).where(eq(terduga.id, req.targetId));
        }

        // Complete the change request
        await dbDtot.update(changeRequests).set({
          status: 'APPROVED',
          approverId: user.id as number,
          processedAt: new Date()
        }).where(eq(changeRequests.id, id));

        return { success: true, message: 'Permintaan approval disetujui sepenuhnya.' };
      }

      return { success: false, error: 'Aksi tidak valid.' };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  }, {
    body: t.Object({
      action: t.Union([t.Literal('APPROVE'), t.Literal('REJECT')]),
    })
  })
  .post('/checks/dtot', async ({ body, user, set }) => {
    try {
      const { namaCadeb, nik, namaPasangan, nikPasangan, hasilPengecekan, hasilPep, kategori, keterangan, buktiSs } = body;
      await dbDtot.insert(pengajuanDtot).values({
        tanggal: new Date(),
        namaCadeb,
        nik,
        namaPasangan: namaPasangan || '',
        nikPasangan: nikPasangan || '',
        hasilPengecekan: hasilPengecekan as any,
        hasilPep,
        kategori: kategori || 'Calon Debitur',
        keterangan: keterangan || null,
        buktiSs: buktiSs || null,
        checkedBy: user.id as number,
        checkedAt: new Date()
      });
      return { success: true, message: 'Hasil pengecekan DTTOT berhasil disimpan.' };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  }, {
    body: t.Object({
      namaCadeb: t.String(),
      nik: t.String(),
      namaPasangan: t.Optional(t.String()),
      nikPasangan: t.Optional(t.String()),
      hasilPengecekan: t.Union([t.Literal('Belum Dicek'), t.Literal('Terindikasi'), t.Literal('Tidak Terindikasi')]),
      hasilPep: t.String(),
      kategori: t.Optional(t.String()),
      keterangan: t.Optional(t.String()),
      buktiSs: t.Optional(t.String()),
    })
  })
  .get('/checks/dtot', async () => {
    try {
      const results = await dbDtot.select().from(pengajuanDtot).orderBy(desc(pengajuanDtot.createdAt)).limit(100);
      
      // Fetch users for join representation
      const allUsers = await db.select({ id: users.id, namaLengkap: users.namaLengkap, username: users.username }).from(users);
      const userMap = new Map(allUsers.map(u => [u.id, u.namaLengkap || u.username]));

      const mapped = results.map(r => ({
        ...r,
        checkerName: r.checkedBy ? userMap.get(r.checkedBy) || 'System' : 'System'
      }));

      return { success: true, data: mapped };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  })
  .post('/checks/reksaloan', async ({ body, user, set }) => {
    try {
      const { noKontrak, namaDebitur, nik, hasilDtot, hasilPep, keterangan, buktiSs } = body;
      await dbDtot.insert(cekReksaloan).values({
        noKontrak,
        namaDebitur: namaDebitur || null,
        nik: nik || null,
        hasilDtot: hasilDtot || null,
        hasilPep: hasilPep || null,
        keterangan: keterangan || null,
        buktiSs: buktiSs || null,
        checkedBy: user.id as number,
        checkedAt: new Date()
      });
      return { success: true, message: 'Hasil verifikasi Reksaloan berhasil disimpan.' };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  }, {
    body: t.Object({
      noKontrak: t.String(),
      namaDebitur: t.Optional(t.String()),
      nik: t.Optional(t.String()),
      hasilDtot: t.Optional(t.String()),
      hasilPep: t.Optional(t.String()),
      keterangan: t.Optional(t.String()),
      buktiSs: t.Optional(t.String()),
    })
  })
  .get('/checks/reksaloan', async () => {
    try {
      const results = await dbDtot.select().from(cekReksaloan).orderBy(desc(cekReksaloan.checkedAt)).limit(100);
      
      const allUsers = await db.select({ id: users.id, namaLengkap: users.namaLengkap, username: users.username }).from(users);
      const userMap = new Map(allUsers.map(u => [u.id, u.namaLengkap || u.username]));

      const mapped = results.map(r => ({
        ...r,
        checkerName: r.checkedBy ? userMap.get(r.checkedBy) || 'System' : 'System'
      }));

      return { success: true, data: mapped };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
