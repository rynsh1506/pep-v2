import { Elysia, t } from 'elysia';
import { connectionCadeb } from '../db';
import { jwt } from '@elysiajs/jwt';

export const candidateRoutes = new Elysia({ prefix: '/candidates' })
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
    const { search, pepFilter, kategoriFilter } = query;
    try {
      let queryStr = 'SELECT id, nama_cadeb AS namaCadeb, no_identitas AS noIdentitas, nama_pasangan AS namaPasangan, no_identitas_pasangan AS noIdentitasPasangan, keterangan_pep AS keteranganPep, go_live AS goLive, kategori, created_at AS createdAt FROM candidates';
      let conditions: string[] = [];
      let values: any[] = [];

      if (search) {
        conditions.push('(nama_cadeb LIKE ? OR no_identitas LIKE ?)');
        values.push(`%${search}%`, `%${search}%`);
      }
      if (pepFilter) {
        conditions.push('keterangan_pep = ?');
        values.push(pepFilter);
      }
      if (kategoriFilter) {
        conditions.push('kategori = ?');
        values.push(kategoriFilter);
      }

      if (conditions.length > 0) {
        queryStr += ' WHERE ' + conditions.join(' AND ');
      }
      queryStr += ' ORDER BY created_at DESC';

      const [rows] = await connectionCadeb.execute(queryStr, values);
      return { success: true, data: rows };
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
      await connectionCadeb.execute(
        'INSERT INTO candidates (nama_cadeb, no_identitas, nama_pasangan, no_identitas_pasangan, keterangan_pep, go_live, kategori) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          namaCadeb,
          noIdentitas,
          namaPasangan || '',
          noIdentitasPasangan || '',
          keteranganPep,
          goLive,
          kategori || 'Cadeb'
        ]
      );

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
      const [rows] = await connectionCadeb.execute(
        'SELECT id, nama_cadeb AS namaCadeb, no_identitas AS noIdentitas, nama_pasangan AS namaPasangan, no_identitas_pasangan AS noIdentitasPasangan, keterangan_pep AS keteranganPep, go_live AS goLive, kategori, created_at AS createdAt FROM candidates WHERE id = ? LIMIT 1',
        [id]
      );
      const existing = rows as any[];
      if (existing.length === 0) {
        set.status = 404;
        return { success: false, error: 'Data tidak ditemukan.' };
      }

      // If user level is 1 (Staff), edit must go to approval
      if (user.level === 1) {
        await connectionCadeb.execute(
          'INSERT INTO approval_requests (candidate_id, type, old_data, new_data, requester_id, l2_status, l3_status, final_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            id,
            'EDIT',
            JSON.stringify(existing[0]),
            JSON.stringify(body),
            user.id,
            'PENDING',
            'PENDING',
            'PENDING'
          ]
        );
        return { success: true, message: 'Permintaan perubahan data (EDIT) berhasil dikirim untuk approval.' };
      }

      // If L2/L3/L4, edit directly
      await connectionCadeb.execute(
        'UPDATE candidates SET nama_cadeb = ?, no_identitas = ?, nama_pasangan = ?, no_identitas_pasangan = ?, keterangan_pep = ?, go_live = ?, kategori = ? WHERE id = ?',
        [
          body.namaCadeb,
          body.noIdentitas,
          body.namaPasangan || '',
          body.noIdentitasPasangan || '',
          body.keteranganPep,
          body.goLive,
          body.kategori || 'Cadeb',
          id
        ]
      );

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
      const [rows] = await connectionCadeb.execute(
        'SELECT id, nama_cadeb AS namaCadeb, no_identitas AS noIdentitas, nama_pasangan AS namaPasangan, no_identitas_pasangan AS noIdentitasPasangan, keterangan_pep AS keteranganPep, go_live AS goLive, kategori, created_at AS createdAt FROM candidates WHERE id = ? LIMIT 1',
        [id]
      );
      const existing = rows as any[];
      if (existing.length === 0) {
        set.status = 404;
        return { success: false, error: 'Data tidak ditemukan.' };
      }

      // If user level is 1 (Staff), delete must go to approval
      if (user.level === 1) {
        await connectionCadeb.execute(
          'INSERT INTO approval_requests (candidate_id, type, old_data, new_data, requester_id, l2_status, l3_status, final_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            id,
            'DELETE',
            JSON.stringify(existing[0]),
            '{}',
            user.id,
            'PENDING',
            'PENDING',
            'PENDING'
          ]
        );
        return { success: true, message: 'Permintaan penghapusan data (DELETE) berhasil dikirim untuk approval.' };
      }

      // Direct delete for levels >= 2
      await connectionCadeb.execute('DELETE FROM candidates WHERE id = ?', [id]);
      return { success: true, message: 'Data kandidat berhasil dihapus.' };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  });
