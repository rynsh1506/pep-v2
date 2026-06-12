import { Elysia, t } from 'elysia';
import { db } from '../db';
import { candidates, approvalRequests, users } from '../db/schema';
import { eq, like, and, sql, desc } from 'drizzle-orm';
import { jwt } from '@elysiajs/jwt';

// Helper middleware for JWT validation
const authPlugin = new Elysia()
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
    return { user };
  });

export const candidateRoutes = new Elysia({ prefix: '/candidates' })
  .use(authPlugin)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Unauthorized' };
    }
  })
  .get('/', async ({ query }) => {
    const { search, pepFilter, kategoriFilter } = query;
    try {
      let conditions = [];

      if (search) {
        conditions.push(
          sql`(${candidates.namaCadeb} LIKE ${'%' + search + '%'} OR ${candidates.noIdentitas} LIKE ${'%' + search + '%'})`
        );
      }
      if (pepFilter) {
        conditions.push(eq(candidates.keteranganPep, pepFilter));
      }
      if (kategoriFilter) {
        conditions.push(eq(candidates.kategori, kategoriFilter));
      }

      const queryBuilder = db.select().from(candidates);
      
      const results = conditions.length > 0
        ? await queryBuilder.where(and(...conditions)).orderBy(desc(candidates.createdAt))
        : await queryBuilder.orderBy(desc(candidates.createdAt));

      return { success: true, data: results };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, {
    query: t.Object({
      search: t.Optional(t.String()),
      pepFilter: t.Optional(t.String()),
      kategoriFilter: t.Optional(t.String()),
    })
  })
  .post('/', async ({ body, user, set }) => {
    try {
      const { namaCadeb, noIdentitas, namaPasangan, noIdentitasPasangan, keteranganPep, goLive, kategori } = body;
      
      // Insert new candidate directly
      const result = await db.insert(candidates).values({
        namaCadeb,
        noIdentitas,
        namaPasangan: namaPasangan || '',
        noIdentitasPasangan: noIdentitasPasangan || '',
        keteranganPep,
        goLive,
        kategori: kategori || 'Cadeb',
      });

      return { success: true, message: 'Data kandidat berhasil ditambahkan.' };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  }, {
    body: t.Object({
      namaCadeb: t.String(),
      noIdentitas: t.String(),
      namaPasangan: t.Optional(t.String()),
      noIdentitasPasangan: t.Optional(t.String()),
      keteranganPep: t.String(),
      goLive: t.String(),
      kategori: t.Optional(t.String()),
    })
  })
  .put('/:id', async ({ params, body, user, set }) => {
    const id = parseInt(params.id);
    try {
      const existing = await db.select().from(candidates).where(eq(candidates.id, id)).limit(1);
      if (existing.length === 0) {
        set.status = 404;
        return { success: false, error: 'Data tidak ditemukan.' };
      }

      // If user level is 1 (Staff), edit must go to approval
      if (user.level === 1) {
        await db.insert(approvalRequests).values({
          candidateId: id,
          type: 'EDIT',
          oldData: JSON.stringify(existing[0]),
          newData: JSON.stringify(body),
          requesterId: user.id as number,
          l2Status: 'PENDING',
          l3Status: 'PENDING',
          finalStatus: 'PENDING',
        });
        return { success: true, message: 'Permintaan perubahan data (EDIT) berhasil dikirim untuk approval.' };
      }

      // If L2/L3/L4, edit directly
      await db.update(candidates).set({
        namaCadeb: body.namaCadeb,
        noIdentitas: body.noIdentitas,
        namaPasangan: body.namaPasangan || '',
        noIdentitasPasangan: body.noIdentitasPasangan || '',
        keteranganPep: body.keteranganPep,
        goLive: body.goLive,
        kategori: body.kategori || 'Cadeb',
      }).where(eq(candidates.id, id));

      return { success: true, message: 'Data kandidat berhasil diperbarui.' };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  }, {
    body: t.Object({
      namaCadeb: t.String(),
      noIdentitas: t.String(),
      namaPasangan: t.Optional(t.String()),
      noIdentitasPasangan: t.Optional(t.String()),
      keteranganPep: t.String(),
      goLive: t.String(),
      kategori: t.Optional(t.String()),
    })
  })
  .delete('/:id', async ({ params, user, set }) => {
    const id = parseInt(params.id);
    try {
      const existing = await db.select().from(candidates).where(eq(candidates.id, id)).limit(1);
      if (existing.length === 0) {
        set.status = 404;
        return { success: false, error: 'Data tidak ditemukan.' };
      }

      // If user level is 1 (Staff), delete must go to approval
      if (user.level === 1) {
        await db.insert(approvalRequests).values({
          candidateId: id,
          type: 'DELETE',
          oldData: JSON.stringify(existing[0]),
          newData: '{}',
          requesterId: user.id as number,
          l2Status: 'PENDING',
          l3Status: 'PENDING',
          finalStatus: 'PENDING',
        });
        return { success: true, message: 'Permintaan penghapusan data (DELETE) berhasil dikirim untuk approval.' };
      }

      // Direct delete for levels >= 2
      await db.delete(candidates).where(eq(candidates.id, id));
      return { success: true, message: 'Data kandidat berhasil dihapus.' };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  });
