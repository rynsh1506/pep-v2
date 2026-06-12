import { Elysia, t } from 'elysia';
import { connectionCadeb } from '../db';
import { jwt } from '@elysiajs/jwt';

export const approvalRoutes = new Elysia({ prefix: '/approvals' })
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
    if (!user || user.level < 2) {
      set.status = 403;
      return { success: false, error: 'Forbidden. Hanya Supervisor/Manager yang diizinkan.' };
    }
  })
  .get('/', async ({ user }) => {
    try {
      let queryStr = 'SELECT id, candidate_id AS candidateId, type, old_data AS oldData, new_data AS newData, requester_id AS requesterId, l2_status AS l2Status, l2_notes AS l2Notes, l3_status AS l3Status, l3_notes AS l3Notes, created_at AS createdAt FROM approval_requests';
      let conditions: string[] = ["final_status = 'PENDING'"];
      let values: any[] = [];

      if (user.level === 2) {
        conditions.push("l2_status = 'PENDING'");
      }
      if (user.level === 3) {
        conditions.push("l2_status = 'APPROVED' AND l3_status = 'PENDING'");
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
  })
  .post('/:id/action', async ({ params, body, user, set }) => {
    const id = parseInt(params.id);
    const { action, notes } = body; // action: 'APPROVE' or 'REJECT'
    
    try {
      const [rows] = await connectionCadeb.execute(
        'SELECT id, candidate_id AS candidateId, type, old_data AS oldData, new_data AS newData, requester_id AS requesterId, l2_status AS l2Status, l2_notes AS l2Notes, l3_status AS l3Status, l3_notes AS l3Notes, final_status AS finalStatus, created_at AS createdAt FROM approval_requests WHERE id = ? LIMIT 1',
        [id]
      );
      const existing = rows as any[];
      if (existing.length === 0) {
        set.status = 404;
        return { success: false, error: 'Permintaan approval tidak ditemukan.' };
      }

      const req = existing[0];

      if (user.level === 2) {
        if (action === 'APPROVE') {
          await connectionCadeb.execute(
            'UPDATE approval_requests SET l2_status = ?, l2_approver_id = ?, l2_notes = ? WHERE id = ?',
            ['APPROVED', user.id, notes || '', id]
          );
        } else {
          await connectionCadeb.execute(
            'UPDATE approval_requests SET l2_status = ?, final_status = ?, l2_approver_id = ?, l2_notes = ? WHERE id = ?',
            ['REJECTED', 'REJECTED', user.id, notes || '', id]
          );
        }
      } else if (user.level === 3 || user.level === 4) {
        if (action === 'APPROVE') {
          // Update status
          await connectionCadeb.execute(
            'UPDATE approval_requests SET l3_status = ?, final_status = ?, l3_approver_id = ?, l3_notes = ? WHERE id = ?',
            ['APPROVED', 'COMPLETED', user.id, notes || '', id]
          );

          // Apply changes to database!
          const targetId = req.candidateId;
          if (targetId) {
            if (req.type === 'DELETE') {
              await connectionCadeb.execute('DELETE FROM candidates WHERE id = ?', [targetId]);
            } else if (req.type === 'EDIT' && req.newData) {
              const updatedData = JSON.parse(req.newData);
              await connectionCadeb.execute(
                'UPDATE candidates SET nama_cadeb = ?, no_identitas = ?, nama_pasangan = ?, no_identitas_pasangan = ?, keterangan_pep = ?, go_live = ?, kategori = ? WHERE id = ?',
                [
                  updatedData.namaCadeb,
                  updatedData.noIdentitas,
                  updatedData.namaPasangan || '',
                  updatedData.noIdentitasPasangan || '',
                  updatedData.keteranganPep,
                  updatedData.goLive,
                  updatedData.kategori || 'Cadeb',
                  targetId
                ]
              );
            }
          }
        } else {
          await connectionCadeb.execute(
            'UPDATE approval_requests SET l3_status = ?, final_status = ?, l3_approver_id = ?, l3_notes = ? WHERE id = ?',
            ['REJECTED', 'REJECTED', user.id, notes || '', id]
          );
        }
      }

      return { success: true, message: `Permintaan berhasil di-${action.toLowerCase()}.` };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  }, {
    body: t.Object({
      action: t.Union([t.Literal('APPROVE'), t.Literal('REJECT')]),
      notes: t.Optional(t.String()),
    })
  });
